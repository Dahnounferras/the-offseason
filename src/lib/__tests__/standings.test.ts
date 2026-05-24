import { describe, it, expect } from "vitest";
import { computeStandings } from "@/lib/standings";
import type { Team, Game, League } from "@/types";

const rules: League["scoringRules"] = { win: 2, tie: 1, loss: 0 };

const teamA: Team = { id: "A", name: "Alpha", wins: 0, losses: 0, ties: 0 };
const teamB: Team = { id: "B", name: "Beta", wins: 0, losses: 0, ties: 0 };
const teamC: Team = { id: "C", name: "Gamma", wins: 0, losses: 0, ties: 0 };

function makeGame(overrides: Partial<Game>): Game {
  return {
    id: "g1",
    homeTeamId: "A",
    awayTeamId: "B",
    statLines: [],
    ...overrides,
  };
}

describe("computeStandings", () => {
  it("returns all zeros when there are no games", () => {
    const result = computeStandings([teamA, teamB], [], rules);
    expect(result).toHaveLength(2);
    result.forEach((row) => {
      expect(row.gp).toBe(0);
      expect(row.w).toBe(0);
      expect(row.l).toBe(0);
      expect(row.t).toBe(0);
      expect(row.pts).toBe(0);
      expect(row.pf).toBe(0);
      expect(row.pa).toBe(0);
    });
  });

  it("excludes scheduled games from computation", () => {
    const game = makeGame({ status: "scheduled" });
    const result = computeStandings([teamA, teamB], [game], rules);
    result.forEach((row) => expect(row.gp).toBe(0));
  });

  it("awards win to home team on home win", () => {
    const game = makeGame({ homeScore: 5, awayScore: 2 });
    const result = computeStandings([teamA, teamB], [game], rules);
    const home = result.find((r) => r.team.id === "A")!;
    const away = result.find((r) => r.team.id === "B")!;
    expect(home.w).toBe(1);
    expect(home.pts).toBe(rules.win);
    expect(home.pf).toBe(5);
    expect(home.pa).toBe(2);
    expect(away.l).toBe(1);
    expect(away.pts).toBe(rules.loss);
    expect(away.pf).toBe(2);
    expect(away.pa).toBe(5);
  });

  it("awards win to away team on away win", () => {
    const game = makeGame({ homeScore: 1, awayScore: 4 });
    const result = computeStandings([teamA, teamB], [game], rules);
    const home = result.find((r) => r.team.id === "A")!;
    const away = result.find((r) => r.team.id === "B")!;
    expect(away.w).toBe(1);
    expect(away.pts).toBe(rules.win);
    expect(home.l).toBe(1);
    expect(home.pts).toBe(rules.loss);
  });

  it("records a tie when scores are equal", () => {
    const game = makeGame({ homeScore: 3, awayScore: 3 });
    const result = computeStandings([teamA, teamB], [game], rules);
    result.forEach((row) => {
      expect(row.t).toBe(1);
      expect(row.pts).toBe(rules.tie);
    });
  });

  it("treats undefined scores as 0–0 tie", () => {
    const game = makeGame({ homeScore: undefined, awayScore: undefined });
    const result = computeStandings([teamA, teamB], [game], rules);
    result.forEach((row) => {
      expect(row.t).toBe(1);
      expect(row.pts).toBe(rules.tie);
    });
  });

  it("sorts by points descending", () => {
    const games = [
      makeGame({ id: "g1", homeTeamId: "A", awayTeamId: "B", homeScore: 3, awayScore: 1 }),
      makeGame({ id: "g2", homeTeamId: "A", awayTeamId: "C", homeScore: 2, awayScore: 0 }),
    ];
    const result = computeStandings([teamA, teamB, teamC], games, rules);
    expect(result[0].team.id).toBe("A");
  });

  it("uses wins as tiebreaker when points are equal", () => {
    // A: 1 win 1 loss = 2 pts; B: 2 ties = 2 pts — A wins tiebreaker
    const games = [
      makeGame({ id: "g1", homeTeamId: "A", awayTeamId: "B", homeScore: 3, awayScore: 1 }),
      makeGame({ id: "g2", homeTeamId: "C", awayTeamId: "A", homeScore: 2, awayScore: 0 }),
      makeGame({ id: "g3", homeTeamId: "B", awayTeamId: "C", homeScore: 1, awayScore: 1 }),
      makeGame({ id: "g4", homeTeamId: "B", awayTeamId: "C", homeScore: 2, awayScore: 2 }),
    ];
    const result = computeStandings([teamA, teamB, teamC], games, rules);
    const aRow = result.find((r) => r.team.id === "A")!;
    const bRow = result.find((r) => r.team.id === "B")!;
    expect(aRow.pts).toBe(bRow.pts);
    expect(result.indexOf(aRow)).toBeLessThan(result.indexOf(bRow));
  });

  it("accumulates sportsmanship correctly", () => {
    const game = makeGame({ homeScore: 3, awayScore: 1, homeSportsmanship: 4, awaySportsmanship: 5 });
    const result = computeStandings([teamA, teamB], [game], rules);
    const home = result.find((r) => r.team.id === "A")!;
    const away = result.find((r) => r.team.id === "B")!;
    expect(home.sportSum).toBe(4);
    expect(home.sportCount).toBe(1);
    expect(away.sportSum).toBe(5);
    expect(away.sportCount).toBe(1);
  });

  it("does not increment sportCount when sportsmanship is absent", () => {
    const game = makeGame({ homeScore: 3, awayScore: 1 });
    const result = computeStandings([teamA, teamB], [game], rules);
    result.forEach((row) => expect(row.sportCount).toBe(0));
  });

  it("safely skips games referencing unknown team IDs", () => {
    const game = makeGame({ homeTeamId: "UNKNOWN", awayTeamId: "B", homeScore: 5, awayScore: 1 });
    expect(() => computeStandings([teamA, teamB], [game], rules)).not.toThrow();
    const result = computeStandings([teamA, teamB], [game], rules);
    result.forEach((row) => expect(row.gp).toBe(0));
  });

  it("works with custom scoring rules (win=3, tie=1, loss=-1)", () => {
    const customRules = { win: 3, tie: 1, loss: -1 };
    const game = makeGame({ homeScore: 5, awayScore: 2 });
    const result = computeStandings([teamA, teamB], [game], customRules);
    const home = result.find((r) => r.team.id === "A")!;
    const away = result.find((r) => r.team.id === "B")!;
    expect(home.pts).toBe(3);
    expect(away.pts).toBe(-1);
  });
});
