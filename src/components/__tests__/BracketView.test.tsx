import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BracketView from "@/components/league/BracketView";
import type { BracketMatchup } from "@/types";

const names: Record<string, string> = { A: "Alpha", B: "Beta", C: "Gamma", D: "Delta" };
const rounds: BracketMatchup[][] = [
  [
    { homeTeamId: "A", awayTeamId: "D", winnerId: "A" },
    { homeTeamId: "B", awayTeamId: "C", winnerId: null },
  ],
  [{ homeTeamId: "A", awayTeamId: null, winnerId: null }],
];
const seedMap = { A: 1, B: 2, C: 3, D: 4 };

describe("BracketView", () => {
  it("renders round labels, team names and TBD slots", () => {
    render(<BracketView rounds={rounds} teamName={(id) => names[id]} seedMap={seedMap} />);
    expect(screen.getByText("Semifinals")).toBeInTheDocument();
    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.getByText("Champion")).toBeInTheDocument();
    expect(screen.getAllByText("Alpha")).toHaveLength(2);
    // Empty final slot plus the undecided champion.
    expect(screen.getAllByText("TBD")).toHaveLength(2);
  });

  it("is read-only without onPick", () => {
    render(<BracketView rounds={rounds} teamName={(id) => names[id]} seedMap={seedMap} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("makes known teams clickable with onPick", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<BracketView rounds={rounds} teamName={(id) => names[id]} seedMap={seedMap} onPick={onPick} />);
    // 4 first-round teams + Alpha in the final; the TBD slot is not a button.
    expect(screen.getAllByRole("button")).toHaveLength(5);
    await user.click(screen.getByRole("button", { name: /Gamma/ }));
    expect(onPick).toHaveBeenCalledWith(0, 1, "C");
  });

  it("shows the champion with their seed", () => {
    const decided: BracketMatchup[][] = [[{ homeTeamId: "A", awayTeamId: "B", winnerId: "B" }]];
    render(<BracketView rounds={decided} teamName={(id) => names[id]} seedMap={seedMap} />);
    expect(screen.getByText("Seed #2")).toBeInTheDocument();
  });
});
