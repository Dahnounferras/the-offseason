import { describe, it, expect } from "vitest";
import {
  emptyTotals,
  computeSeasonTotals,
  perGame,
  findStatLine,
  buildStatDraft,
  draftToStatLines,
} from "@/lib/stats";
import type { Game } from "@/types";

const keys = ["pts", "ast"] as const;

function makeGame(overrides: Partial<Game>): Game {
  return {
    id: "g1",
    homeTeamId: "A",
    awayTeamId: "B",
    status: "played",
    statLines: [],
    ...overrides,
  };
}

describe("computeSeasonTotals", () => {
  it("sums stats and counts games played per player", () => {
    const games = [
      makeGame({ id: "g1", statLines: [{ playerId: "p1", stats: { pts: 10, ast: 2 } }] }),
      makeGame({ id: "g2", statLines: [{ playerId: "p1", stats: { pts: 6, ast: 5 } }] }),
    ];
    expect(computeSeasonTotals(games, keys)).toEqual({ p1: { gp: 2, pts: 16, ast: 7 } });
  });

  it("ignores scheduled games", () => {
    const games = [
      makeGame({ status: "scheduled", statLines: [{ playerId: "p1", stats: { pts: 10 } }] }),
    ];
    expect(computeSeasonTotals(games, keys)).toEqual({});
  });

  it("treats missing stat keys as 0 and ignores keys outside the sport", () => {
    const games = [makeGame({ statLines: [{ playerId: "p1", stats: { pts: 4, reb: 9 } }] })];
    expect(computeSeasonTotals(games, keys)).toEqual({ p1: { gp: 1, pts: 4, ast: 0 } });
  });

  it("gives no entry to players without stat lines", () => {
    const games = [makeGame({ statLines: [{ playerId: "p1", stats: { pts: 1 } }] })];
    expect(computeSeasonTotals(games, keys).p2).toBeUndefined();
  });

  it("tolerates games without a statLines array", () => {
    const game = makeGame({});
    delete (game as Partial<Game>).statLines;
    expect(computeSeasonTotals([game], keys)).toEqual({});
  });
});

describe("perGame", () => {
  it("averages a stat over games played to one decimal", () => {
    expect(perGame({ gp: 3, pts: 10, ast: 0 }, "pts")).toBe("3.3");
  });

  it("returns a dash for no totals or zero games", () => {
    expect(perGame(undefined, "pts")).toBe("—");
    expect(perGame(emptyTotals(keys), "pts")).toBe("—");
  });
});

describe("stat drafts", () => {
  const game = makeGame({ statLines: [{ playerId: "p1", stats: { pts: 12 } }] });

  it("finds a player's stat line", () => {
    expect(findStatLine(game, "p1")?.stats.pts).toBe(12);
    expect(findStatLine(game, "p2")).toBeUndefined();
  });

  it("prefills saved players and leaves others blank", () => {
    expect(buildStatDraft(["p1", "p2"], game, keys)).toEqual({
      p1: { pts: "12", ast: "0" },
      p2: { pts: "", ast: "" },
    });
  });

  it("converts a draft to stat lines, blanks and junk becoming 0", () => {
    const lines = draftToStatLines({ p1: { pts: "7", ast: "" }, p2: { pts: "x", ast: "3" } }, keys);
    expect(lines).toEqual([
      { playerId: "p1", stats: { pts: 7, ast: 0 } },
      { playerId: "p2", stats: { pts: 0, ast: 3 } },
    ]);
  });

  it("round-trips saved stats through a draft", () => {
    const draft = buildStatDraft(["p1"], game, keys);
    expect(draftToStatLines(draft, keys)).toEqual([{ playerId: "p1", stats: { pts: 12, ast: 0 } }]);
  });
});
