import type { Game, StatLine } from "@/types";

export type StatTotals = { gp: number } & Record<string, number>;

// Per-player form state while entering a game's stats: playerId -> stat key -> raw input.
export type StatDraft = Record<string, Record<string, string>>;

export function emptyTotals(statKeys: readonly string[]): StatTotals {
  return { gp: 0, ...Object.fromEntries(statKeys.map((k) => [k, 0])) };
}

// Same "played" rule as computeStandings, so stats and standings count the same games.
export function computeSeasonTotals(
  games: Game[],
  statKeys: readonly string[]
): Record<string, StatTotals> {
  const totals: Record<string, StatTotals> = {};
  for (const game of games) {
    if (game.status !== "played") continue;
    for (const sl of game.statLines ?? []) {
      const entry = (totals[sl.playerId] ??= emptyTotals(statKeys));
      for (const k of statKeys) entry[k] += sl.stats[k] ?? 0;
      entry.gp += 1;
    }
  }
  return totals;
}

export function perGame(totals: StatTotals | undefined, key: string): string {
  if (!totals || totals.gp === 0) return "—";
  return ((totals[key] ?? 0) / totals.gp).toFixed(1);
}

export function findStatLine(game: Game, playerId: string): StatLine | undefined {
  return (game.statLines ?? []).find((sl) => sl.playerId === playerId);
}

// Players with saved stats start from their values; everyone else starts blank.
export function buildStatDraft(
  playerIds: string[],
  game: Game,
  statKeys: readonly string[]
): StatDraft {
  const draft: StatDraft = {};
  for (const playerId of playerIds) {
    const existing = findStatLine(game, playerId);
    draft[playerId] = Object.fromEntries(
      statKeys.map((k) => [k, existing ? String(existing.stats[k] ?? 0) : ""])
    );
  }
  return draft;
}

export function draftToStatLines(draft: StatDraft, statKeys: readonly string[]): StatLine[] {
  return Object.entries(draft).map(([playerId, row]) => ({
    playerId,
    stats: Object.fromEntries(statKeys.map((k) => [k, Number(row[k]) || 0])),
  }));
}
