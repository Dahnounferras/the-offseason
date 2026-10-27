import { describe, it, expect } from "vitest";
import { setupSteps, nextStep } from "@/lib/setup";
import type { Bracket, Game, Team } from "@/types";

const teams: Team[] = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
  { id: "c", name: "C" },
];
const scheduled: Game = { id: "g1", homeTeamId: "a", awayTeamId: "b", status: "scheduled", statLines: [] };
const played: Game = { ...scheduled, id: "g2", status: "played", homeScore: 1, awayScore: 0 };
const bracket: Bracket = { id: "br", rounds: [], generatedAt: 0, status: "active" };

const doneIds = (steps: ReturnType<typeof setupSteps>) => steps.filter((s) => s.done).map((s) => s.id);

describe("setupSteps", () => {
  it("starts with only the teams step available", () => {
    const steps = setupSteps({ teams: [], players: {}, games: [], bracket: null });
    expect(doneIds(steps)).toEqual([]);
    expect(steps.filter((s) => s.available).map((s) => s.id)).toEqual(["teams"]);
    expect(nextStep(steps)?.id).toBe("teams");
  });

  it("skips the optional players step when picking the next step", () => {
    const steps = setupSteps({ teams, players: {}, games: [], bracket: null });
    expect(doneIds(steps)).toEqual(["teams"]);
    expect(nextStep(steps)?.id).toBe("start");
  });

  it("counts players only on current teams", () => {
    const stale = { gone: [{ id: "p", firstName: "X", lastName: "Y", teamId: "gone" }] };
    expect(doneIds(setupSteps({ teams, players: stale, games: [], bracket: null }))).not.toContain("players");
    const real = { a: [{ id: "p", firstName: "X", lastName: "Y", teamId: "a" }] };
    expect(doneIds(setupSteps({ teams, players: real, games: [], bracket: null }))).toContain("players");
  });

  it("moves from start to result to bracket", () => {
    expect(nextStep(setupSteps({ teams, players: {}, games: [scheduled], bracket: null }))?.id).toBe("result");
    expect(nextStep(setupSteps({ teams, players: {}, games: [played], bracket: null }))?.id).toBe("bracket");
    expect(nextStep(setupSteps({ teams, players: {}, games: [played], bracket }))).toBeNull();
  });

  it("keeps the bracket unavailable below 3 teams", () => {
    const steps = setupSteps({ teams: teams.slice(0, 2), players: {}, games: [played], bracket: null });
    expect(steps.find((s) => s.id === "bracket")?.available).toBe(false);
  });
});
