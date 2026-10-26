import { describe, it, expect } from "vitest";
import {
  EMPTY_PLAYER_FORM,
  formToPlayerData,
  isPlayerFormComplete,
  jerseyError,
  playerToForm,
  sortByJersey,
} from "@/lib/roster";
import type { Player } from "@/types";

const roster: Player[] = [
  { id: "p1", firstName: "Ann", lastName: "Lee", jerseyNumber: 7, teamId: "A" },
  { id: "p2", firstName: "Bob", lastName: "Ray", teamId: "A" },
];

describe("jerseyError", () => {
  it("rejects a number another player already wears", () => {
    expect(jerseyError({ ...EMPTY_PLAYER_FORM, jerseyNumber: "7" }, roster)).toBe(
      "Jersey #7 is already taken by another player."
    );
  });

  it("lets the player being edited keep their own number", () => {
    expect(jerseyError({ ...EMPTY_PLAYER_FORM, jerseyNumber: "7" }, roster, "p1")).toBeNull();
  });

  it("accepts free numbers and an empty jersey", () => {
    expect(jerseyError({ ...EMPTY_PLAYER_FORM, jerseyNumber: "8" }, roster)).toBeNull();
    expect(jerseyError({ ...EMPTY_PLAYER_FORM, jerseyNumber: "  " }, roster)).toBeNull();
  });
});

describe("player form conversion", () => {
  it("requires both names, ignoring whitespace", () => {
    expect(isPlayerFormComplete({ firstName: "Ann", lastName: " ", jerseyNumber: "" })).toBe(false);
    expect(isPlayerFormComplete({ firstName: "Ann", lastName: "Lee", jerseyNumber: "" })).toBe(true);
  });

  it("trims names and only includes a jersey number when given", () => {
    expect(formToPlayerData({ firstName: " Ann ", lastName: "Lee ", jerseyNumber: "" })).toEqual({
      firstName: "Ann",
      lastName: "Lee",
    });
    expect(formToPlayerData({ firstName: "Ann", lastName: "Lee", jerseyNumber: "23" })).toEqual({
      firstName: "Ann",
      lastName: "Lee",
      jerseyNumber: 23,
    });
  });

  it("fills a form from a player, with or without a jersey", () => {
    expect(playerToForm(roster[0])).toEqual({ firstName: "Ann", lastName: "Lee", jerseyNumber: "7" });
    expect(playerToForm(roster[1]).jerseyNumber).toBe("");
  });

  it("sorts by jersey number with numberless players last", () => {
    const sorted = sortByJersey([roster[1], { ...roster[0], id: "p3", jerseyNumber: 30 }, roster[0]]);
    expect(sorted.map((p) => p.id)).toEqual(["p1", "p3", "p2"]);
  });
});
