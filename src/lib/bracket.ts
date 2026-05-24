import type { Team, Game, League, BracketMatchup } from "@/types";

export function computeSeedings(
  teams: Team[],
  games: Game[],
  scoringRules: League["scoringRules"]
): Team[] {
  const map: Record<string, number> = {};
  for (const t of teams) map[t.id] = 0;
  for (const g of games) {
    const hs = g.homeScore ?? 0;
    const as_ = g.awayScore ?? 0;
    if (hs > as_) {
      map[g.homeTeamId] = (map[g.homeTeamId] ?? 0) + scoringRules.win;
      map[g.awayTeamId] = (map[g.awayTeamId] ?? 0) + scoringRules.loss;
    } else if (as_ > hs) {
      map[g.awayTeamId] = (map[g.awayTeamId] ?? 0) + scoringRules.win;
      map[g.homeTeamId] = (map[g.homeTeamId] ?? 0) + scoringRules.loss;
    } else {
      map[g.homeTeamId] = (map[g.homeTeamId] ?? 0) + scoringRules.tie;
      map[g.awayTeamId] = (map[g.awayTeamId] ?? 0) + scoringRules.tie;
    }
  }
  return teams.sort((a, b) => (map[b.id] ?? 0) - (map[a.id] ?? 0));
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
