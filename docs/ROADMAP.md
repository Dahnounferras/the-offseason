# The Offseason: cleanup & roadmap

Living plan from the October 2026 repo review. Update it as items land.

## Status

| Step | What | State |
|---|---|---|
| 1 | Commit WIP (spinners, reset league) | ✅ Done (`4d90863`) |
| 2 | Seeding bug, Firestore security rules, reset/delete cleanup | ✅ Done |
| 3 | Dead code + tooling cleanup, CI | ✅ Done |
| 4 | Extract shared components + league data hook | ⏳ Next |
| 5 | UX pass (tab bar, toasts, mobile) | |
| 6 | Public league pages | |

Do step 4 before step 5. Most UI exists in 2–4 copies right now, so every UX change would have to be made several times.

## Step 2: what changed

- `computeSeedings` (`src/lib/bracket.ts`) now delegates to `computeStandings`. Unplayed games no longer count as ties, the tiebreak (wins) matches the standings table, and the input array isn't mutated.
- `firestore.rules` and `firebase.json` were added. Only the owner can write a league or its subcollections. Anyone can read a league with `isPublic: true`; private leagues are owner-only. `ownerId` can't be changed. The rules were verified against the emulator: 21 allow/deny cases for owner, other user and signed-out.
- `resetLeague` also deletes the bracket, and writes through `writeBatch` in chunks of 500.
- `deleteTeam` cascades: it deletes the team's players and every game the team played (home or away), then the team.

### Follow-ups from step 2

- **Deploy the rules:** `firebase deploy --only firestore:rules --project <id>`. There's no `.firebaserc`, so pass the project ID. Until then, the live database runs whatever rules are set in the console.
- **Behavior change from the rules:** a signed-in non-owner who opens `/leagues/<id>` used to see the league and now gets permission errors, unless the league is public. The UI doesn't handle this yet (see "Error handling" below).
- **Keep a rules test in the repo.** The emulator check was a one-off script. Add `@firebase/rules-unit-testing` (needs `--legacy-peer-deps` with the current deps) plus a `test:rules` script that runs `firebase emulators:exec`.
- **League delete is still a soft delete** (`status: "deleted"`). Its data stays forever, and the league page still renders it if someone visits the URL. Decide between a hard delete (cascade like `deleteTeam`) and keeping soft delete with a "trash/restore" UI.
- **Deleting a team that's in a bracket** leaves its ID in the bracket, which renders as "TBD". Either block team deletion while a bracket exists or clear the bracket too.

## Step 3: what changed

- Removed dead fields from the types and from every write: `Player.stats`, `Team.wins/losses/ties` and `League.season.currentGame`. `addGame`, which had no callers, is gone. `resetLeague` now only deletes games and brackets. Existing Firestore docs still contain the old fields. Nothing reads them, so they don't need a migration.
- `getGames` maps a missing `status` to `"played"` (legacy games), and `Game.status` is now required. Every page and `computeStandings` use `status === "played"`, so overview, games, stats, team and standings all count the same games.
- `next/image` for the logo. The remote Google avatar in `HomeNav` keeps `<img>` with a targeted lint disable.
- Vitest uses `resolve.tsconfigPaths` (Vite 8) in place of `vite-tsconfig-paths`. Added a `typecheck` script.
- Deleted the `create-next-app` SVGs. Rewrote `README.md` (setup, env vars, rules deploy, scripts). Added `.env.example`.
- CI: `.github/workflows/ci.yml` runs lint (`--max-warnings=0`), typecheck and tests on pushes to `main` and on PRs.

## Step 3: original checklist

- Dead data fields:
  - `Player.stats` is never written; stats live in `game.statLines`. `resetLeague` still clears it, so remove both.
  - `Team.wins/losses/ties` are never updated, because standings are computed.
  - `League.season.currentGame` is unused.
- Legacy status handling: some code treats a missing `game.status` as played (`leagues/[id]/page.tsx`, `games/page.tsx`), while the stats page only counts `status === "played"`. Normalize this once in `getGames`.
- Delete the `create-next-app` leftovers: `public/{next,vercel,file,globe,window}.svg`, and replace `README.md` with real setup docs (env vars, Firebase setup, scripts).
- Tooling:
  - `tsc --noEmit` fails on the `mock.calls[0][1] as Record<string, unknown>` casts in `leagues.firestore.test.ts` (cast via `unknown`).
  - Fix the remaining lint warnings.
  - Vitest says to replace the `vite-tsconfig-paths` plugin with `resolve.tsconfigPaths: true`.
  - Add a `typecheck` script and a GitHub Actions CI job: lint, typecheck, test.

## Step 4: structural refactor

The pages are 400–900-line client components that duplicate each other.

| Duplication | Where |
|---|---|
| Bracket renderer (layout constants, SVG connectors, champion slot) | `leagues/[id]/page.tsx`, `bracket/page.tsx` |
| Roster add/edit player | `leagues/[id]/page.tsx`, `teams/[teamId]/page.tsx` |
| Stat-entry draft grid and season totals | `stats/page.tsx`, `games/[gameId]/page.tsx`, `teams/[teamId]/page.tsx` |
| Confirm modals (`fixed inset-0`, about 9 copies) | 5 files |
| Inline `style={{…}}` (about 450) | everywhere |

1. Extract `<BracketView>`, `<ConfirmModal>`, `<Button variant>`, `<StandingsTable>`, `<RosterEditor>`, `<StatGrid>`. Move stat totals into `src/lib/stats.ts`, with tests.
2. Map the CSS variables in `globals.css` into Tailwind `@theme` so that classes like `bg-surface text-muted` replace inline styles.
3. Load the league, teams and games once with a `useLeague(id)` hook or a `leagues/[id]/layout.tsx`. Every tab currently re-fetches everything.
4. Read `node_modules/next/dist/docs/` first (Next 16 has breaking changes; see `AGENTS.md`), especially before using server components for public pages.

### Error handling

- Almost no Firestore call has a `catch`. Failures leave spinners stuck and show no message.
- The league page shows "Loading…" forever when the league is missing or permission is denied.
- Add an error state and toasts, and a not-found / no-access screen.

## Step 5: ease of use

- Persistent tab bar across league pages (Overview · Games · Stats · Teams · Bracket) instead of header buttons.
- Move End Season, Reset and Delete into a "⋯ Settings" menu or a league settings page, away from the main actions.
- Setup checklist for new leagues: add teams → add players → start season → record results → bracket.
- Toasts for saves and errors, and optimistic updates instead of re-fetching after each write.
- Mobile: a narrow layout for the 10-column standings table and the fixed-width bracket.
- Quick score entry from the games list; dates and locations on games.
- Editable scoring rules (hard-coded at 2/1/0) and season length after creation.
- Accessibility: focus trap and Escape to close on modals; don't rely on hover-only tooltips to explain disabled buttons; add logo alt text.

## Step 6+: future features

1. **Public league pages:** a read-only, shareable `/l/[id]`, plus an `isPublic` toggle in settings. The rules already allow public reads.
2. **Co-admins and team captains:** invite links, with captains reporting scores. This needs a `members` map in the league doc and updated rules.
3. **Real-time updates:** `onSnapshot` instead of one-time fetches.
4. **Scheduling:** dates and times, venues, .ics export, more playoff formats (double elimination, byes), configurable tiebreakers.
5. **Stats:** leaderboards, player pages, sport-specific derived stats (FG%, AVG), CSV import and export.
6. **Notifications:** game reminders and result emails.
7. **Multiple seasons per league:** archive a season and start a new one with the same teams.
