import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SetupChecklist from "@/components/league/SetupChecklist";
import { setupSteps } from "@/lib/setup";
import type { Game, Team } from "@/types";

const teams: Team[] = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
  { id: "c", name: "C" },
];
const scheduled: Game = { id: "g1", homeTeamId: "a", awayTeamId: "b", status: "scheduled", statLines: [] };

function setup(games: Game[] = []) {
  const onStart = vi.fn();
  const onHide = vi.fn();
  render(
    <SetupChecklist
      leagueId="L"
      steps={setupSteps({ teams, players: {}, games, bracket: null })}
      onStart={onStart}
      starting={false}
      onHide={onHide}
    />
  );
  return { onStart, onHide };
}

describe("SetupChecklist", () => {
  it("offers Start League as the next step once teams exist", async () => {
    const { onStart } = setup();
    expect(screen.getByText("1 of 5 done")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start League" }));
    expect(onStart).toHaveBeenCalled();
    // The optional roster hint shows alongside, but later steps have no action yet.
    expect(screen.getByText(/edit its roster/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Go to Games" })).toBeNull();
  });

  it("links to Games after the season starts", () => {
    setup([scheduled]);
    expect(screen.getByRole("link", { name: "Go to Games" })).toHaveAttribute("href", "/leagues/L/games");
    expect(screen.queryByRole("button", { name: "Start League" })).toBeNull();
  });

  it("can be hidden", async () => {
    const { onHide } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(onHide).toHaveBeenCalled();
  });
});
