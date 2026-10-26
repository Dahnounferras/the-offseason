import type { BracketMatchup } from "@/types";

export const TEAM_ROW_H = 40;
export const CARD_H = TEAM_ROW_H * 2;
export const MATCH_GAP = 24;
export const CONNECTOR_W = 32;
export const ROUND_W = 180;
export const LABEL_H = 30;
export const CHAMPION_W = 160;

// Height of the matchup area: the first round is the tallest column.
export function bracketHeight(firstRoundCount: number): number {
  return firstRoundCount > 0 ? firstRoundCount * CARD_H + (firstRoundCount - 1) * MATCH_GAP : 0;
}

// Computes the vertical center (in px) of each matchup in each round,
// where round 0 is evenly spaced and later rounds are centered between their feeders.
export function computeMatchupCenters(firstRoundCount: number): number[][] {
  if (firstRoundCount <= 0) return [];
  const allCenters: number[][] = [];
  const r0 = Array.from({ length: firstRoundCount }, (_, i) =>
    i * (CARD_H + MATCH_GAP) + CARD_H / 2
  );
  allCenters.push(r0);
  let prev = r0;
  while (prev.length > 1) {
    const next: number[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push((prev[i] + prev[i + 1]) / 2);
    }
    allCenters.push(next);
    prev = next;
  }
  return allCenters;
}

export function roundLabel(rIdx: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - rIdx;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${rIdx + 1}`;
}

// Matchups with both teams known and no winner yet.
export function countRemaining(rounds: BracketMatchup[][]): number {
  let count = 0;
  for (const round of rounds) {
    for (const m of round) {
      if (m.homeTeamId && m.awayTeamId && !m.winnerId) count++;
    }
  }
  return count;
}

export function championId(rounds: BracketMatchup[][]): string | null {
  return rounds[rounds.length - 1]?.[0]?.winnerId ?? null;
}
