import { describe, it, expect } from "vitest";
import { generateSchedule } from "@/lib/schedule";

describe("generateSchedule", () => {
  it("returns exactly totalGames matchups", () => {
    expect(generateSchedule(["A", "B", "C", "D"], 6)).toHaveLength(6);
  });

  it("returns empty array when totalGames is 0", () => {
    expect(generateSchedule(["A", "B", "C", "D"], 0)).toHaveLength(0);
  });

  it("returns 1 matchup when totalGames is 1", () => {
    expect(generateSchedule(["A", "B"], 1)).toHaveLength(1);
  });

  it("wraps round-robin when totalGames exceeds one cycle", () => {
    const result = generateSchedule(["A", "B", "C", "D"], 10);
    expect(result).toHaveLength(10);
  });

  it("never produces a self-matchup", () => {
    const result = generateSchedule(["A", "B", "C", "D", "E"], 20);
    result.forEach((m) => expect(m.homeTeamId).not.toBe(m.awayTeamId));
  });

  it("excludes BYE from output with odd number of teams", () => {
    const result = generateSchedule(["A", "B", "C"], 3);
    result.forEach((m) => {
      expect(m.homeTeamId).not.toBe("BYE");
      expect(m.awayTeamId).not.toBe("BYE");
    });
  });

  it("does not mutate the input array", () => {
    const ids = ["A", "B", "C", "D"];
    const original = [...ids];
    generateSchedule(ids, 6);
    expect(ids).toEqual(original);
  });

  it("works with 2 teams wrapping multiple times", () => {
    const result = generateSchedule(["A", "B"], 10);
    expect(result).toHaveLength(10);
    result.forEach((m) => {
      expect(["A", "B"]).toContain(m.homeTeamId);
      expect(["A", "B"]).toContain(m.awayTeamId);
      expect(m.homeTeamId).not.toBe(m.awayTeamId);
    });
  });

  it("only includes real team IDs in output with 5 teams", () => {
    const teams = ["T1", "T2", "T3", "T4", "T5"];
    const result = generateSchedule(teams, 10);
    result.forEach((m) => {
      expect(teams).toContain(m.homeTeamId);
      expect(teams).toContain(m.awayTeamId);
    });
  });

  it("limits output to exactly totalGames even with 4 teams and many games", () => {
    const result = generateSchedule(["A", "B", "C", "D"], 100);
    expect(result).toHaveLength(100);
  });
});
