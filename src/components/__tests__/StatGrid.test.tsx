import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatGrid from "@/components/league/StatGrid";
import { getSportConfig } from "@/lib/sportConfig";
import type { Game, Player } from "@/types";

const sportConfig = getSportConfig("Basketball");
const ann: Player = { id: "p1", firstName: "Ann", lastName: "Lee", jerseyNumber: 7, teamId: "A" };
const bob: Player = { id: "p2", firstName: "Bob", lastName: "Ray", teamId: "A" };
const game: Game = {
  id: "g1",
  homeTeamId: "A",
  awayTeamId: "B",
  status: "played",
  statLines: [{ playerId: "p1", stats: { pts: 12, ast: 3 } }],
};

function renderGrid(props: Partial<React.ComponentProps<typeof StatGrid>> = {}) {
  const onDraftChange = vi.fn();
  render(
    <StatGrid
      rows={[{ player: ann, teamName: "Alpha" }, { player: bob, teamName: "Alpha" }]}
      game={game}
      sportConfig={sportConfig}
      editing={false}
      draft={{}}
      onDraftChange={onDraftChange}
      {...props}
    />
  );
  return { onDraftChange };
}

describe("StatGrid", () => {
  it("shows saved stats, and dashes for players without a stat line", () => {
    renderGrid();
    const annRow = screen.getByText("Ann Lee", { exact: false }).closest("tr")!;
    const bobRow = screen.getByText("Bob Ray", { exact: false }).closest("tr")!;
    expect(annRow).toHaveTextContent("#7");
    expect(annRow).toHaveTextContent("12");
    expect(bobRow.textContent).toContain("—");
    expect(screen.getByRole("columnheader", { name: "Team" })).toBeInTheDocument();
  });

  it("renders inputs from the draft and reports edits", () => {
    const { onDraftChange } = renderGrid({ editing: true, draft: { p1: { pts: "12" } } });
    const input = screen.getByLabelText("Ann Lee pts");
    expect(input).toHaveValue(12);
    fireEvent.change(input, { target: { value: "15" } });
    expect(onDraftChange).toHaveBeenCalledWith("p1", "pts", "15");
  });

  it("shows the empty message when there are no rows", () => {
    renderGrid({ rows: [], emptyMessage: "Nobody here." });
    expect(screen.getByText("Nobody here.")).toBeInTheDocument();
  });
});
