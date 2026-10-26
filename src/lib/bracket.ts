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
