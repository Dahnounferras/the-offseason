import { describe, it, expect } from "vitest";
import { parseScoreInput, toDateTimeLocal, fromDateTimeLocal, formatGameWhen } from "@/lib/games";

describe("parseScoreInput", () => {
  it("parses whole numbers, including 0", () => {
    expect(parseScoreInput("3", " 0 ")).toEqual({ home: 3, away: 0 });
  });

  it.each([
    ["", "1"],
    ["1", ""],
    ["-1", "2"],
    ["1.5", "2"],
    ["abc", "2"],
  ])("rejects %j – %j", (home, away) => {
    expect(parseScoreInput(home, away)).toBeNull();
  });
});

describe("datetime-local conversion", () => {
  it("round-trips a local date and time", () => {
    const ms = new Date(2026, 9, 26, 19, 30).getTime();
    expect(toDateTimeLocal(ms)).toBe("2026-10-26T19:30");
    expect(fromDateTimeLocal("2026-10-26T19:30")).toBe(ms);
  });

  it("treats empty and invalid values as no date", () => {
    expect(toDateTimeLocal(undefined)).toBe("");
    expect(fromDateTimeLocal("")).toBeUndefined();
    expect(fromDateTimeLocal("not a date")).toBeUndefined();
  });
});

describe("formatGameWhen", () => {
  it("includes the day and time", () => {
    const text = formatGameWhen(new Date(2026, 9, 26, 19, 30).getTime());
    expect(text).toMatch(/26/);
    expect(text).toMatch(/30/);
  });
});
