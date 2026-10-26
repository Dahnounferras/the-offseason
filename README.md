# The Offseason

A web app for running recreational sports leagues. Create a league, add teams and rosters, generate a schedule, record results and player stats, and run a playoff bracket. Standings are computed from game results.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4 and Firebase (Google sign-in plus Firestore).

## Prerequisites

- Node.js 24
- A Firebase project
- The [Firebase CLI](https://firebase.google.com/docs/cli) (`npm i -g firebase-tools`), for deploying security rules

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. In the [Firebase console](https://console.firebase.google.com/):
   - Create a project and add a **Web app** to it.
   - Under **Authentication → Sign-in method**, enable **Google**.
   - Create a **Firestore** database.

3. Copy `.env.example` to `.env.local` and fill it in from the web app's config (Project settings → General → Your apps):

   | Variable | Firebase config key |
   |---|---|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

4. Deploy the Firestore security rules (`firestore.rules`). There's no `.firebaserc`, so pass the project ID:

   ```bash
   firebase deploy --only firestore:rules --project <project-id>
   ```

   Under these rules, only a league's owner can write to it. A league is readable by anyone when `isPublic` is `true`; otherwise only the owner can read it.

5. Start the dev server and open <http://localhost:3000>:

   ```bash
   npm run dev
   ```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (needs `.env.local`) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Run the tests once |
| `npm run test:coverage` | Run the tests with a coverage report |

CI (`.github/workflows/ci.yml`) runs lint (warnings fail the build), typecheck and tests on every push to `main` and on every pull request.

## Project layout

- `src/app`: routes. `(auth)` has the login page; `(dashboard)` has the signed-in dashboard and league pages.
- `src/lib`: domain logic (`standings.ts`, `schedule.ts`, `bracket.ts`, `sportConfig.ts`) and Firestore access (`firestore/leagues.ts`).
- `src/types`: shared data types.
- `docs/ROADMAP.md`: the cleanup and feature roadmap.
