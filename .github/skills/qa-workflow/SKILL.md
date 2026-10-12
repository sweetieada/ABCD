---
name: qa-workflow
description: Run lint, typecheck, Vitest unit tests, and Playwright E2E tests, then fix failures until all pass. Use before opening a PR or after finishing a feature.
---

# QA Verification Workflow

## Steps
1. **Lint & types**
   - Run `npm run lint` and `npm run typecheck`.
   - Fix every error. Never silence errors with `any`, `@ts-ignore`, or `eslint-disable`.
2. **Unit tests (Vitest)**
   - Run `npm run test`.
   - On failure, read the stack trace and fix the root cause in `lib/`. Change a test only if the requirement changed, and say so.
   - `sm2()` tests must cover every grade (1/3/4/5) and the 1.3 ease-factor floor.
3. **E2E tests (Playwright)**
   - Run `npm run test:e2e`.
   - To confirm a fix, re-run only the failing spec: `npx playwright test <path-to-spec>`.
4. **Mocks**
   - Tests must never call the real Claude API. Mock `lib/ai/claude.ts`.

## Done when
- All four commands exit with code 0.
- Report which commands ran and what was fixed. Do not claim success if anything failed.
