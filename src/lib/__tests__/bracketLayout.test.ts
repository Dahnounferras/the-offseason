import { describe, it, expect } from "vitest";
import {
  CARD_H,
  MATCH_GAP,
  bracketHeight,
  championId,
  computeMatchupCenters,
  countRemaining,
  roundLabel,
} from "@/lib/bracketLayout";
import type { BracketMatchup } from "@/types";

const step = CARD_H + MATCH_GAP;

describe("computeMatchupCenters", () => {
  it("returns nothing for an empty bracket", () => {
    expect(computeMatchupCenters(0)).toEqual([]);
  });

  it("has one column per round, halving each time", () => {
    expect(computeMatchupCenters(1).map((r) => r.length)).toEqual([1]);
    expect(computeMatchupCenters(2).map((r) => r.length)).toEqual([2, 1]);
    expect(computeMatchupCenters(8).map((r) => r.length)).toEqual([8, 4, 2, 1]);
  });

  it("spaces the first round evenly and centers later rounds between feeders", () => {
    const [r0, r1, r2] = computeMatchupCenters(4);
    expect(r0).toEqual([0, 1, 2, 3].map((i) => i * step + CARD_H / 2));
    expect(r1).toEqual([(r0[0] + r0[1]) / 2, (r0[2] + r0[3]) / 2]);
    expect(r2).toEqual([(r1[0] + r1[1]) / 2]);
  });

  it("puts the final at the vertical middle of the bracket", () => {
    const centers = computeMatchupCenters(8);
    expect(centers[centers.length - 1][0]).toBe(bracketHeight(8) / 2);
  });
});

describe("bracketHeight", () => {
  it("is cards plus the gaps between them", () => {
    expect(bracketHeight(0)).toBe(0);
    expect(bracketHeight(1)).toBe(CARD_H);
    expect(bracketHeight(4)).toBe(4 * CARD_H + 3 * MATCH_GAP);
  });
});

describe("roundLabel", () => {
  it("names the last three rounds and numbers the rest", () => {
    expect([0, 1, 2, 3, 4].map((r) => roundLabel(r, 5))).toEqual([
      "Round 1",
      "Round 2",
      "Quarterfinals",
      "Semifinals",
      "Final",
    ]);
    expect(roundLabel(0, 1)).toBe("Final");
  });
});

describe("countRemaining and championId", () => {
  const m = (homeTeamId: string | null, awayTeamId: string | null, winnerId: string | null = null): BracketMatchup => ({
    homeTeamId,
    awayTeamId,
    winnerId,
  });

  it("counts only matchups with both teams set and no winner", () => {
    const rounds = [[m("A", "D", "A"), m("B", "C")], [m("A", null)]];
    expect(countRemaining(rounds)).toBe(1);
    expect(championId(rounds)).toBeNull();
  });

  it("reads the champion from the final", () => {
    expect(championId([[m("A", "B", "A")]])).toBe("A");
    expect(championId([])).toBeNull();
  });
});
