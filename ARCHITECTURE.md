# Architecture & Engineering Guidelines (ARCHITECTURE.md)

> Project: **MemoCard Smart Flashcards** — paste notes or upload a PDF, let AI generate flashcards, and review them daily on a spaced-repetition (SM-2) schedule.

---

## 0. Product Scope

### MVP (Sprint 1–3)
| Priority | User Story |
|---|---|
| P0 | As a student, I can sign in with Email / Google and own my data |
| P0 | As a student, I can create, edit, and delete decks and cards (front / back) |
| P0 | As a student, I can enter review mode, flip a card, and grade it Again / Hard / Good / Easy |
| P0 | The system schedules each card's next review with SM-2; the dashboard shows "N cards due today" |
| P1 | As a student, I can paste notes and let AI generate draft cards, then confirm before saving them to a deck |
| P1 | As a student, I can upload a PDF handout and let AI generate draft cards |

### Stretch Goals (Sprint 4+)
- Learning stats: daily reviews, accuracy, streaks (Recharts)
- Deck sharing: generate a public link so classmates can copy a deck in one click
- AI examples / explanations: generate an example sentence or extra explanation for a card's back
- CSV import / export (Anki-compatible)

---

## 1. Core Tech Stack

| Category | Technology | Notes |
|---|---|---|
| Framework | **Next.js (App Router)** | React Server Components by default; add `"use client"` only for interactive components |
| Language | **TypeScript (strict)** | No `any`; parse all external data into types with Zod |
| Styling & UI | **Tailwind CSS + shadcn/ui** | Merge classes with `cn()`; card-flip animation via Tailwind transitions |
| Database / Auth | **Firebase Authentication + Cloud Firestore Standard** | Use the modular Firebase Web SDK and owner-only Security Rules |
| AI | **Claude API** (`@anthropic-ai/sdk`) | Server-side only; send PDFs to Claude directly as documents, no separate parser needed |
| Validation | **Zod** + React Hook Form | Shared schemas for forms, AI output, and API input |
| Charts | Recharts | Used on the stats page |
| Testing | **Vitest** (unit), **Playwright** (E2E) | |
| Deployment | **Local development** | Firebase web configuration lives in `.env.local`; never expose service account credentials |
| Code Style | ESLint + Prettier | |

---

## 2. Directory Structure & Responsibilities

```
├── app/
│   ├── (auth)/                  # Route group: sign in, sign up, OAuth callback
│   ├── (app)/                   # Route group: authenticated pages
│   │   ├── dashboard/           # Home: cards due today, deck list
│   │   ├── decks/[deckId]/      # Deck detail: card list and editing
│   │   ├── review/[deckId]/     # Review mode
│   │   ├── generate/            # AI card generation (paste text / upload PDF)
│   │   └── stats/               # Learning stats (stretch goal)
│   ├── api/
│   │   └── generate/route.ts    # Route Handler: call Claude to generate draft cards
│   ├── layout.tsx               # Root layout (fonts, theme, Toaster)
│   └── globals.css              # Global styles and Tailwind
├── components/
│   ├── ui/                      # shadcn/ui primitives (do not change their logic)
│   ├── common/                  # Shared site components (Header, EmptyState…)
│   └── features/
│       ├── deck/                # Deck presentational components
│       ├── card/                # Card editor and flip components
│       ├── review/              # Review flow components
│       └── generate/            # AI draft preview and confirmation components
├── lib/
│   ├── firebase/
│   │   ├── client.ts            # Browser Firebase App, Auth, and Firestore clients
│   │   ├── auth.ts              # Email / Google auth and profile bootstrap
│   │   └── auth-context.tsx     # Auth state for Client Components
│   ├── ai/
│   │   ├── claude.ts            # Anthropic client (server-only)
│   │   ├── prompts.ts           # Prompt templates for card generation
│   │   └── schemas.ts           # Zod schemas for AI output
│   ├── srs/
│   │   └── sm2.ts               # SM-2 algorithm (pure functions)
│   ├── firestore/               # Validated Firestore operations for decks, cards, and reviews
│   └── utils.ts                 # Shared helpers such as cn()
├── types/
│   └── models.ts                # Domain types (Deck, Flashcard, ReviewGrade…)
├── firestore.rules              # Owner-only data access and field validation
├── firestore.indexes.json       # Composite indexes for dashboard and review queries
├── tests/
│   ├── unit/                    # Vitest: sm2, schemas, utils
│   └── e2e/                     # Playwright: sign in → create deck → review flow
```

### Core Architecture Principles
1. **Presentational components**: `components/` never calls Firestore or Claude directly. Data operations live in `lib/`.
2. **Business logic lives in `lib/`**: e.g. grading a review → `lib/srs/sm2.ts` computes the new state → `lib/firestore/cards.ts` persists it.
3. **Server boundary**: Claude API credentials remain server-only. Firebase web configuration is public; Firestore Security Rules are the authorization boundary, not hidden client keys.
4. **Validate external data first**: form input, Firestore documents, AI output, and URL params go through Zod.
5. **AI output is a draft**: show AI results for the user to confirm or edit; write to Firestore only after they click "Add to deck".

---

## 3. Data Model (Firebase Authentication + Firestore)

Firestore documents are nested under the Firebase Authentication UID so the
document path itself is the ownership boundary:

```text
users/{uid}
  displayName, createdAt, updatedAt
  decks/{deckId}
    name, description, deleting, createdAt, updatedAt
    cards/{cardId}
      front, back, easeFactor, intervalDays, repetitions, dueAt,
      deleting, createdAt, updatedAt
      reviews/{reviewId}
        grade, reviewedAt
```

- Email / password and Google sign-in are provided by Firebase Authentication.
- Every user profile and learning record is private to its UID. Public deck sharing is not enabled by these rules.
- `firestore.rules` denies access by default, checks the authenticated UID against the path, validates exact fields and data limits, and keeps review records immutable.
- Deck and card deletion first mark the parent as deleting so new children cannot be written while child records are removed in bounded Firestore batches.
- Firebase project: `uxd2026-memocard-2026-1102` (display name `uxd2026`); Web App: `1:511709616792:web:8d27d494efd34a68e64eed`.
- The Standard Firestore database is provisioned in `asia-east1` (Taiwan).

---

## 4. Core Flows

### 4.1 AI Card Generation
```
User pastes text / uploads PDF
  → POST /api/generate (check auth, limit text length and PDF size)
  → lib/ai/claude.ts calls Claude and requests JSON: [{ front, back }]
  → lib/ai/schemas.ts validates with Zod (on failure, return an error and save nothing)
  → Frontend shows the draft list; user can edit / delete cards
  → Click "Add to deck" → Server Action batch-inserts into cards
```
- Store the model name in the `ANTHROPIC_MODEL` environment variable so it is easy to switch.
- Generate at most 30 cards per request to keep costs under control.

### 4.2 Review (SM-2)
```
Query cards where due_at <= now() → show front → flip
  → User grades the card (Again = 1, Hard = 3, Good = 4, Easy = 5)
  → sm2(state, grade) returns the new { ease_factor, interval_days, repetitions, due_at }
  → Update cards and insert a row into reviews
```
- `sm2()` is a pure function: old state + grade in, new state out. It reads no external state; `now` is passed in as a parameter for testability.

---

## 5. Environment Variables

| Variable | Purpose | Safe for frontend? |
|---|---|---|
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | Connect browser SDKs to local Auth and Firestore emulators (`false` for cloud) | Yes |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app configuration | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app ID | Yes |
| `ANTHROPIC_API_KEY` | Claude API key | **No** |
| `ANTHROPIC_MODEL` | Claude model to use | No |

- Use `.env.local` locally, and commit a `.env.example` with no real values.
- Set production secrets in Vercel Environment Variables.

---

## 6. Testing Strategy

| Level | Tool | Must Cover |
|---|---|---|
| Unit | Vitest | `sm2()` interval changes for each grade and the 1.3 ease-factor floor; success / failure cases for the AI output schema |
| Integration | Vitest + Firebase Emulator Suite | Security Rules deny cross-user reads/writes and malformed records |
| E2E | Playwright | Sign in → create deck → add cards → complete one review session |

- Always mock AI calls in tests; never hit the real API.

---

## 7. Development Workflow

- **Branches**: `main` is protected; feature branches are named `feat/<summary>` or `fix/<summary>`.
- **PRs**: at least one teammate review; CI must pass lint, typecheck, and test.
- **Commits**: Conventional Commits, e.g. `feat(review): add SM-2 grading buttons`.
- **Schema changes**: update Firestore document validators, security rules, indexes, and Emulator tests together.

### Common Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run lint` | ESLint check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run schema unit tests without the emulator |
| `npm run test:all` | Run all tests with the Firestore Emulator |
| `npm run test:rules` | Run Firestore Security Rules tests in the emulator |
| `npm run test:e2e` | Run Playwright authentication and deck-management journeys against emulators |
| `npm run firebase:emulators` | Start local Firebase Authentication and Firestore emulators |
