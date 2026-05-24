import { describe, it, expect } from "vitest";
import { computeSeedings, generateBracket, cascadeClear } from "@/lib/bracket";
import type { Team, Game, League, BracketMatchup } from "@/types";

const rules: League["scoringRules"] = { win: 2, tie: 1, loss: 0 };

function makeTeam(id: string): Team {
  return { id, name: id, wins: 0, losses: 0, ties: 0 };
}

function makeGame(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): Game {
  return { id: `${homeTeamId}v${awayTeamId}`, homeTeamId, awayTeamId, homeScore, awayScore, statLines: [] };
}

describe("computeSeedings", () => {
  it("returns teams sorted by points, highest first", () => {
    const teams = [makeTeam("A"), makeTeam("B"), makeTeam("C")];
    const games = [
      makeGame("A", "B", 3, 1),
      makeGame("A", "C", 2, 0),
      makeGame("B", "C", 1, 0),
    ];
    const result = computeSeedings(teams, games, rules);
    expect(result[0].id).toBe("A");
    expect(result[1].id).toBe("B");
    expect(result[2].id).toBe("C");
  });

  it("keeps teams with 0 points (no games) at end", () => {
    const teams = [makeTeam("A"), makeTeam("B"), makeTeam("C")];
    const games = [makeGame("A", "B", 3, 1)];
    const result = computeSeedings(teams, games, rules);
    expect(result.map((t) => t.id)).toContain("C");
    expect(result[result.length - 1].id).toBe("C");
  });

  it("returns all teams even if none played", () => {
    const teams = [makeTeam("A"), makeTeam("B")];
    const result = computeSeedings(teams, [], rules);
    expect(result).toHaveLength(2);
  });

  it("treats undefined scores as ties (current behavior — scheduled games with no scores)", () => {
    const teams = [makeTeam("A"), makeTeam("B")];
    const scheduledGame: Game = {
      id: "g1", homeTeamId: "A", awayTeamId: "B",
      status: "scheduled", statLines: [],
    };
    const result = computeSeedings(teams, [scheduledGame], rules);
    const aPoints = result.find((t) => t.id === "A");
    const bPoints = result.find((t) => t.id === "B");
    expect(aPoints).toBeDefined();
    expect(bPoints).toBeDefined();
  });
});

describe("generateBracket", () => {
  it("produces 1 round with 1 matchup for 2 teams", () => {
    const teams = [makeTeam("A"), makeTeam("B")];
    const rounds = generateBracket(teams);
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toHaveLength(1);
    expect(rounds[0][0].homeTeamId).toBe("A");
    expect(rounds[0][0].awayTeamId).toBe("B");
    expect(rounds[0][0].winnerId).toBeNull();
  });

  it("produces 2 rounds for 4 teams", () => {
    const teams = ["A", "B", "C", "D"].map(makeTeam);
    const rounds = generateBracket(teams);
    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toHaveLength(2);
    expect(rounds[1]).toHaveLength(1);
  });

  it("produces 3 rounds for 8 teams", () => {
    const teams = ["1", "2", "3", "4", "5", "6", "7", "8"].map(makeTeam);
    const rounds = generateBracket(teams);
    expect(rounds).toHaveLength(3);
    expect(rounds[0]).toHaveLength(4);
    expect(rounds[1]).toHaveLength(2);
    expect(rounds[2]).toHaveLength(1);
  });

  it("snake-seeds 8 teams correctly (1v8, 2v7, 3v6, 4v5)", () => {
    const teams = ["1", "2", "3", "4", "5", "6", "7", "8"].map(makeTeam);
    const rounds = generateBracket(teams);
    const r0 = rounds[0];
    expect(r0[0]).toMatchObject({ homeTeamId: "1", awayTeamId: "8" });
    expect(r0[1]).toMatchObject({ homeTeamId: "2", awayTeamId: "7" });
    expect(r0[2]).toMatchObject({ homeTeamId: "3", awayTeamId: "6" });
    expect(r0[3]).toMatchObject({ homeTeamId: "4", awayTeamId: "5" });
  });

  it("pads to next power of 2 for 3 teams (→ 4 slots, 1 bye)", () => {
    const teams = ["A", "B", "C"].map(makeTeam);
    const rounds = generateBracket(teams);
    expect(rounds[0]).toHaveLength(2);
    const hasNull = rounds[0].some((m) => m.homeTeamId === null || m.awayTeamId === null);
    expect(hasNull).toBe(true);
  });

  it("pads to next power of 2 for 5 teams (→ 8 slots, 3 byes)", () => {
    const teams = ["A", "B", "C", "D", "E"].map(makeTeam);
    const rounds = generateBracket(teams);
    expect(rounds[0]).toHaveLength(4);
    const nullSlots = rounds[0].filter((m) => m.homeTeamId === null || m.awayTeamId === null);
    expect(nullSlots.length).toBe(3);
  });

  it("initializes all non-first-round matchups as null", () => {
    const teams = ["A", "B", "C", "D"].map(makeTeam);
    const rounds = generateBracket(teams);
    rounds.slice(1).forEach((round) => {
      round.forEach((m) => {
        expect(m.homeTeamId).toBeNull();
        expect(m.awayTeamId).toBeNull();
        expect(m.winnerId).toBeNull();
      });
    });
  });
});

describe("cascadeClear", () => {
  function makeRounds(): BracketMatchup[][] {
    return [
      [
        { homeTeamId: "A", awayTeamId: "B", winnerId: "A" },
        { homeTeamId: "C", awayTeamId: "D", winnerId: "C" },
      ],
      [
        { homeTeamId: "A", awayTeamId: "C", winnerId: "A" },
      ],
      [
        { homeTeamId: "A", awayTeamId: null, winnerId: "A" },
      ],
    ];
  }

  it("does nothing when winnerId is already null", () => {
    const rounds = makeRounds();
    rounds[0][0].winnerId = null;
    const before = JSON.stringify(rounds);
    cascadeClear(rounds, 0, 0);
    expect(JSON.stringify(rounds)).toBe(before);
  });

  it("clears winnerId on the target matchup", () => {
    const rounds = makeRounds();
    cascadeClear(rounds, 0, 0);
    expect(rounds[0][0].winnerId).toBeNull();
  });

  it("clears homeTeamId in next round for even-indexed matchup", () => {
    const rounds = makeRounds();
    cascadeClear(rounds, 0, 0);
    expect(rounds[1][0].homeTeamId).toBeNull();
  });

  it("clears awayTeamId in next round for odd-indexed matchup", () => {
    const rounds = makeRounds();
    cascadeClear(rounds, 0, 1);
    expect(rounds[1][0].awayTeamId).toBeNull();
  });

  it("cascades through all downstream rounds", () => {
    const rounds = makeRounds();
    cascadeClear(rounds, 0, 0);
    expect(rounds[0][0].winnerId).toBeNull();
    expect(rounds[1][0].homeTeamId).toBeNull();
    expect(rounds[1][0].winnerId).toBeNull();
    expect(rounds[2][0].homeTeamId).toBeNull();
  });

  it("does not touch sibling matchups not in the cascade path", () => {
    const rounds = makeRounds();
    cascadeClear(rounds, 0, 0);
    expect(rounds[0][1].winnerId).toBe("C");
  });

  it("returns without error when roundIdx is out of bounds", () => {
    const rounds = makeRounds();
    expect(() => cascadeClear(rounds, 99, 0)).not.toThrow();
  });
});
