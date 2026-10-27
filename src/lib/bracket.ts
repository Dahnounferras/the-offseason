import type { Team, Game, League, BracketMatchup } from "@/types";
import { computeStandings } from "@/lib/standings";

// Seeds follow the standings table exactly (same scoring, same tiebreaks,
// unplayed games ignored) so the bracket never disagrees with it.
export function computeSeedings(
  teams: Team[],
  games: Game[],
  scoringRules: League["scoringRules"]
): Team[] {
  return computeStandings(teams, games, scoringRules).map((row) => row.team);
}

export function generateBracket(seededTeams: Team[]): BracketMatchup[][] {
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(seededTeams.length, 2))));
  const slots: (Team | null)[] = [...seededTeams];
  while (slots.length < size) slots.push(null);

  const firstRound: BracketMatchup[] = [];
  for (let i = 0; i < size / 2; i++) {
    firstRound.push({
      homeTeamId: slots[i]?.id ?? null,
      awayTeamId: slots[size - 1 - i]?.id ?? null,
      winnerId: null,
    });
  }

  const rounds: BracketMatchup[][] = [firstRound];
  let currentSize = size / 2;
  while (currentSize > 1) {
    const round: BracketMatchup[] = [];
    for (let i = 0; i < currentSize / 2; i++) {
      round.push({ homeTeamId: null, awayTeamId: null, winnerId: null });
    }
    rounds.push(round);
    currentSize = currentSize / 2;
  }
  return rounds;
}

// Returns new rounds with winnerId advanced into the next round, clearing any
// later results that depended on the old winner; null when nothing changes.
export function advanceWinner(
  rounds: BracketMatchup[][],
  roundIdx: number,
  matchIdx: number,
  winnerId: string
): BracketMatchup[][] | null {
  if (rounds[roundIdx][matchIdx].winnerId === winnerId) return null;
  const updated = rounds.map((round) => round.map((m) => ({ ...m })));
  updated[roundIdx][matchIdx].winnerId = winnerId;
  if (roundIdx + 1 < updated.length) {
    const nextMatchIdx = Math.floor(matchIdx / 2);
    const nextMatch = updated[roundIdx + 1][nextMatchIdx];
    if (matchIdx % 2 === 0) nextMatch.homeTeamId = winnerId;
    else nextMatch.awayTeamId = winnerId;
    if (nextMatch.winnerId) cascadeClear(updated, roundIdx + 1, nextMatchIdx);
  }
  return updated;
}

// Clears every result and every team past the first round.
export function clearResults(rounds: BracketMatchup[][]): BracketMatchup[][] {
  return rounds.map((round, r) =>
    round.map((m) => (r === 0 ? { ...m, winnerId: null } : { homeTeamId: null, awayTeamId: null, winnerId: null }))
  );
}

export function cascadeClear(
  rounds: BracketMatchup[][],
  roundIdx: number,
  matchIdx: number
): void {
  if (roundIdx >= rounds.length) return;
  const m = rounds[roundIdx][matchIdx];
  if (!m.winnerId) return;
  const nextMatchIdx = Math.floor(matchIdx / 2);
  const isEven = matchIdx % 2 === 0;
  m.winnerId = null;
  if (roundIdx + 1 < rounds.length) {
    if (isEven) rounds[roundIdx + 1][nextMatchIdx].homeTeamId = null;
    else rounds[roundIdx + 1][nextMatchIdx].awayTeamId = null;
    cascadeClear(rounds, roundIdx + 1, nextMatchIdx);
  }
}

export const MIN_BRACKET_TEAMS = 3;

// Why a new bracket can't be generated right now, or null when it can.
export function bracketBlockedReason(
  league: Pick<League, "status">,
  teamCount: number
): string | null {
  if (league.status === "ended") return "Reactivate the league in Settings to generate a bracket.";
  if (teamCount < MIN_BRACKET_TEAMS) return `Add at least ${MIN_BRACKET_TEAMS} teams to generate a bracket.`;
  return null;
}
