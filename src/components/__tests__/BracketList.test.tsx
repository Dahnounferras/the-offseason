import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BracketList from "@/components/league/BracketList";
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

describe("BracketList", () => {
  it("lists each round as a section with its matchups", () => {
    render(<BracketList rounds={rounds} teamName={(id) => names[id]} seedMap={seedMap} />);
    expect(screen.getByRole("heading", { name: "Semifinals" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Final" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("advances a team with onPick", async () => {
    const onPick = vi.fn();
    render(<BracketList rounds={rounds} teamName={(id) => names[id]} seedMap={seedMap} onPick={onPick} />);
    await userEvent.click(screen.getByRole("button", { name: /Gamma/ }));
    expect(onPick).toHaveBeenCalledWith(0, 1, "C");
  });

  it("shows the champion", () => {
    const decided: BracketMatchup[][] = [[{ homeTeamId: "A", awayTeamId: "B", winnerId: "B" }]];
    render(<BracketList rounds={decided} teamName={(id) => names[id]} seedMap={seedMap} />);
    expect(screen.getByText(/Seed #2/)).toBeInTheDocument();
  });
});
