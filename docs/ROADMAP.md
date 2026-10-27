# The Offseason: cleanup & roadmap

Living plan from the October 2026 repo review. Update it as items land.

## Status

| Step | What | State |
|---|---|---|
| 1 | Commit WIP (spinners, reset league) | ✅ Done (`4d90863`) |
| 2 | Seeding bug, Firestore security rules, reset/delete cleanup | ✅ Done |
| 3 | Dead code + tooling cleanup, CI | ✅ Done |
| 4 | Extract shared components + league data hook | ✅ Done (merged in #2) |
| 5 | UX pass (tab bar, toasts, mobile) | ✅ Done (branch `step-5-ux`, browser check pending) |
| 6 | Public league pages | ⏳ Next |

Step 4 removed most of the duplicated UI, so a UX change in step 5 now usually means editing one shared component.

Step 5 added the Settings tab, which is where step 6's `isPublic` toggle goes.

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

### Follow-ups from step 3

- **Browser smoke test (not done yet).** Lint, typecheck, tests, `next build` and CI all pass, and `/`, `/login` and `/dashboard` returned 200 on the dev server. Nobody has clicked through the signed-in app yet. With `npm run dev`, signed in:
  - Create a league, add two teams and a player, start the season, and record a result.
  - Check that the overview "games played" count, the games list, the stats page, the team page and the standings all agree.
  - If you have a league with games from before scheduling existed (no `status` field), check that those games now show up on the stats and team pages too. That is the one intended behavior change.
  - Reset League: games and the bracket are cleared, and teams and players stay.
  - The logo renders on the landing, login and dashboard pages.
- The Firestore rules deploy from step 2 is still pending (see "Follow-ups from step 2").

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

## Step 4: what changed

Done in six commits on `step-4-refactor`. Each one passes lint, typecheck, tests and build.

- **Theme tokens.** The CSS variables are mapped in `@theme`, so `bg-surface`, `bg-surface-2`, `text-muted`, `border-border`, `text-accent`, `text-win/loss/tie` and so on work as classes. Inline `style={{…}}` blocks went from 447 to 272. The rest are mostly in the landing page, `LeaguePreview` and the parts of pages that weren't extracted.
- **UI primitives** (`src/components/ui/`): `Button` (variants, `loading`, and `buttonClasses()` for links), `Modal` (Escape closes it, `role="dialog"`), `ConfirmModal` and `Input` (`tone`, `compact`). All 9 hand-rolled modals use them.
- **Stats.** `src/lib/stats.ts` has season totals, per-game averages and stat-entry drafts. `StatGrid` is used by the stats Game Log and the game page box scores. `SeasonStatsTable` is used by the stats page. `statCells` holds the shared header and value cells. `StandingsTable` is used by the overview (full columns) and the teams page (compact columns plus actions).
- **Bracket.** `BracketView` renders both the overview preview (read-only) and the bracket page (clickable). `src/lib/bracketLayout.ts` has the layout maths. The pure `advanceWinner` and `clearResults` in `src/lib/bracket.ts` replaced the in-page `JSON.parse(JSON.stringify(…))` mutation.
- **Roster.**
  - `src/lib/roster.ts` has the form helpers and the jersey check.
  - The `useRoster` hook handles add, edit and remove.
  - `PlayerForm` renders the fields inline or stacked.
  - `RosterEditor` is the overview's roster modal.
  - Behavior changes:
    - The modal now rejects duplicate jersey numbers.
    - Adding a player appends it locally with no re-fetch.
    - Enter saves an edit.
    - The team page's Edit button now shows. It used to be permanently invisible because its row lacked the `group` class.
- **Shared league data.** `leagues/[id]/layout.tsx` wraps every tab in `LeagueProvider` (`src/hooks/useLeague.tsx`). The provider loads the league, teams, games (sorted by game number) and bracket once. Pages read from `useLeague()` and write back through its setters, so changes show on other tabs without a reload. Deleting a team also drops its games from the shared state.
- **Error states.** A missing or soft-deleted league shows "League not found". A `permission-denied` error shows "No access". The rules deny reads of nonexistent IDs, so a made-up URL lands on this screen too. Any other error shows a message with "Try again". A missing game or team shows its own message. Every write handler resets its spinner in `finally`.
- **Tests:** 95 → 151.

### Follow-ups from step 4

- **Browser check (not done yet).** Nobody has clicked through steps 4.2–4.6 yet. Fold in the step 3 smoke test above, plus:
  - Open a roster from the overview and try a duplicate jersey number.
  - Edit a player on the team page.
  - Advance a team in the full bracket, go back to the overview, and confirm the preview matches without a reload.
  - Record a score on a game page, then check the Games and Stats tabs.
  - Press Escape on each modal.
  - Open `/leagues/does-not-exist` and confirm the "No access" screen.
- ~~**Merge order.**~~ Done: steps 3 and 4 are on `main`.
- ~~**Failed writes are silent.**~~ Done in step 5 (toasts).
- ~~**Players aren't in the shared state.**~~ Done in step 5.
- **Left as is:** the overview header buttons and row-2 actions. Step 5 replaces them with a tab bar and a settings menu.

## Step 4: original plan

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

## Step 5: what changed

Done in seven commits on `step-5-ux`. Each one passes lint, typecheck, tests and build.

- **Toasts and errors.**
  - `ToastProvider` and `useToast()` (`src/components/ui/Toast.tsx`) are mounted in the dashboard layout.
  - `errorMessage()` (`src/lib/errors.ts`) turns Firestore codes into readable text.
  - Every write handler catches failures and shows an error toast. This includes the dashboard's create league, which used to leave its spinner stuck.
  - Success toasts appear only where the result isn't visible: settings saved, league reset, and quick score.
- **Fewer re-fetches.**
  - Adding a team appends it locally.
  - `scheduleGames` writes in batches and returns the created games.
  - `recordResult` returns its `playedAt`.
  - Bracket picks are optimistic and roll back on failure.
- **League header and tab bar.**
  - `LeagueHeader` renders once in `leagues/[id]/layout.tsx`. It shows the breadcrumb, name, sport, games played and the ended badge, plus tabs: Overview · Games · Stats · Teams · Bracket · Settings. The active tab comes from `useSelectedLayoutSegment()`.
  - Tab pages no longer have their own breadcrumbs or Back buttons. The game and team detail pages keep a small "← All games/teams" link.
  - The overview's three hover-tooltip "Generate Tournament Bracket" buttons are gone. The bracket page shows the reason as visible text (`bracketBlockedReason`), and both screens now require 3 teams.
- **Settings tab** (`/leagues/[id]/settings`).
  - You can edit the league name, the points for a win, tie and loss, and the season length (`validateSettings` in `src/lib/leagueSettings.ts`).
  - Season length locks once a schedule exists.
  - End Season, Reactivate, Reset and Delete moved here from the overview, into a danger zone.
- **Players in the shared state.**
  - `LeagueProvider` loads every roster once (`players`, keyed by team ID).
  - `useTeamPlayers(teamId)` feeds `useRoster`, so roster edits show on the stats, team and game pages without a reload. This resolves the step 4 follow-up.
- **Setup checklist** on the overview (`src/lib/setup.ts`, `SetupChecklist`).
  - The steps are: add teams, add players (optional), start the season, record a result, generate the bracket.
  - Start League lives in the checklist.
  - Hide is remembered per league in `localStorage`.
- **Games.**
  - Each upcoming game has a Score button for quick, inline score entry.
  - Games have optional `scheduledAt` and `location` fields. They're edited on the game page (`updateGameDetails`) and shown in the list.
  - Scores must now be whole numbers, 0 or more (`parseScoreInput`).
  - After the season ends, the game page no longer shows the score form for an unplayed game.
- **Mobile.**
  - `StandingsTable` hides PF, PA and RTG below `sm`.
  - The bracket renders as a stacked per-round list (`BracketList`) below `md` and as the tree from `md` up (`ResponsiveBracket`).
  - Score inputs stack on phones, wide tables scroll inside their card, and the gutters are smaller.
- **Accessibility.**
  - `Modal` focuses its first control, traps Tab, returns focus to the opener on close, and closes on a backdrop press.
  - The create-league labels are linked to their inputs.
  - The roster Edit buttons are always visible. They used to appear only on hover, which touch screens can't do.
  - Icon buttons name the player they act on.
  - **Logo alt text was left as `alt=""` on purpose.** Each logo sits inside a link right next to the visible text "The Offseason", so a non-empty alt would make screen readers say the name twice.
- **Tests:** 151 → 214.

### Follow-ups from step 5

- **Browser check (not done yet).** Signing in needs a real Google account, so only `/`, `/login`, `/dashboard` and the league routes were checked, and all returned 200 on the dev server. With `npm run dev`, signed in, at desktop width and at about 375px, run the step 3 and step 4 checks above, plus:
  - Create a league. The checklist appears. Add 2 teams and a player, then start the season from the checklist; the games appear without a reload.
  - Click every tab. The active tab is highlighted and nothing is duplicated.
  - Quick-score a game. A toast appears, and the standings, stats, team page and "games played" count agree.
  - Set a date and location on a game page, and check that they show in the games list.
  - Settings:
    - Change the scoring to 3/1/0. The standings update.
    - Season length is locked.
    - Reset unlocks season length.
    - End, Reactivate and Delete all work.
  - At 375px the bracket is a stacked list, and advancing a team still works.
  - With the network offline, add a team. An error toast appears and the spinner resets.
  - In each modal, Tab stays inside, Escape closes it, and focus returns to the opener.
- **Game times are stored in the browser's time zone.** The value is epoch ms, so everyone sees the right local time, but a league that spans time zones has no "league time zone". Revisit with step 6 scheduling.
- **Sportsmanship can't be cleared.** Picking "—" on an edit clears it on screen, but `updateResult` skips undefined values, so the old rating stays in Firestore and comes back on reload. This predates step 5. The fix is `deleteField()`, as in `updateGameDetails`.
- **Still open from step 2:** deploy the rules, add a rules test, decide hard vs soft league delete, and handle deleting a team that's in a bracket.

## Step 5: ease of use (original plan)

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
