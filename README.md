# MemoCard 智慧閃卡

Next.js App Router starter for an AI-assisted flashcard app. Firebase project
and Web App are provisioned; Email/Password and Google Authentication plus
Firestore security rules are configured in this repository.

## Firebase services

The Firebase project `uxd2026-memocard-2026-1102` (display name `uxd2026`) and
web app `1:511709616792:web:8d27d494efd34a68e64eed` are configured. The Standard
Firestore `(default)` database is in `asia-east1` (Taiwan).

Firebase web configuration is public client configuration. Never add service
account credentials to the client application. Copy the checked-in template
for local development, and retrieve the Firebase Web API key from the Firebase
Console's project settings into your ignored `.env.local`:

```bash
cp .env.example .env.local
```

Start the app with:

```bash
npm install
npm run dev
```

The local `localhost` domain is configured for sign-in. When deploying to a
different domain, add that domain under Firebase Console → Authentication →
Settings → Authorized domains.

By default the app connects to the cloud Firebase project. To develop offline,
set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local`, replace the web
settings with these demo values, and start `npm run firebase:emulators` in
another terminal:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-memocard
NEXT_PUBLIC_FIREBASE_APP_ID=demo-memocard-app
```

Emulator data is saved in the ignored `.firebase-data/` folder.

To redeploy auth providers, rules, or indexes after changing their config:

```bash
firebase deploy --only auth,firestore --project uxd2026-memocard-2026-1102
```

## Development

```bash
npm install
npm run dev
```

Run checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:all
npm run test:rules
```

`npm test` runs the schema unit tests without requiring Java. `npm run test:all`
starts a local Firestore Emulator and runs all tests, including Security Rules;
`npm run test:rules` runs only the rules tests. Emulator tests use the demo
project and do not read or write cloud Firebase data. Running `npm run test:all`
or `npm run test:rules` requires Java; using the cloud-backed app does not.
