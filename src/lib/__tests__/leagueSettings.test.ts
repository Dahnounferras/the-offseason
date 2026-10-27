import { describe, it, expect } from "vitest";
import { leagueToSettingsForm, validateSettings } from "@/lib/leagueSettings";
import type { League } from "@/types";

const league: League = {
  id: "L",
  name: "Monday Hoops",
  sport: "Basketball",
  ownerId: "u1",
  season: { totalGames: 10 },
  scoringRules: { win: 2, tie: 1, loss: 0 },
  isPublic: false,
  createdAt: 0,
};

const form = leagueToSettingsForm(league);

describe("validateSettings", () => {
  it("round-trips an unchanged league", () => {
    expect(validateSettings(form, league, { scheduled: false })).toEqual({
      update: { name: "Monday Hoops", scoringRules: { win: 2, tie: 1, loss: 0 }, season: { totalGames: 10 } },
    });
  });

  it("trims the name and rejects an empty one", () => {
    expect(validateSettings({ ...form, name: "  Hoops " }, league, { scheduled: false })).toMatchObject({
      update: { name: "Hoops" },
    });
    expect(validateSettings({ ...form, name: "  " }, league, { scheduled: false })).toEqual({
      error: expect.stringMatching(/name/),
    });
  });

  it("accepts new scoring rules", () => {
    const result = validateSettings({ ...form, win: "3", tie: "1", loss: "0" }, league, { scheduled: true });
    expect(result).toMatchObject({ update: { scoringRules: { win: 3, tie: 1, loss: 0 } } });
  });

  it.each(["", "-1", "1.5", "two"])("rejects %j as points", (win) => {
    expect(validateSettings({ ...form, win }, league, { scheduled: false })).toEqual({
      error: expect.stringMatching(/whole numbers/),
    });
  });

  it.each(["0", "101", "", "3.5"])("rejects %j as a season length", (totalGames) => {
    expect(validateSettings({ ...form, totalGames }, league, { scheduled: false })).toEqual({
      error: expect.stringMatching(/between 1 and 100/),
    });
  });

  it("keeps the current season length once a schedule exists", () => {
    const result = validateSettings({ ...form, totalGames: "999" }, league, { scheduled: true });
    expect(result).toMatchObject({ update: { season: { totalGames: 10 } } });
  });
});
