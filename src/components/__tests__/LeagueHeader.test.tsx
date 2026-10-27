import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useSelectedLayoutSegment } from "next/navigation";
import LeagueHeader from "@/components/league/LeagueHeader";
import { useLeague } from "@/hooks/useLeague";
import type { League } from "@/types";

vi.mock("next/navigation", () => ({ useSelectedLayoutSegment: vi.fn() }));
vi.mock("@/hooks/useLeague", () => ({ useLeague: vi.fn() }));

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

function setup(segment: string | null, overrides: Partial<League> = {}) {
  vi.mocked(useSelectedLayoutSegment).mockReturnValue(segment);
  vi.mocked(useLeague).mockReturnValue({
    league: { ...league, ...overrides },
    games: [
      { id: "g1", homeTeamId: "a", awayTeamId: "b", status: "played", statLines: [] },
      { id: "g2", homeTeamId: "a", awayTeamId: "b", status: "scheduled", statLines: [] },
    ],
  } as unknown as ReturnType<typeof useLeague>);
  render(<LeagueHeader />);
}

const current = () => screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page");

beforeEach(() => vi.clearAllMocks());

describe("LeagueHeader", () => {
  it("shows the league name, sport and games played", () => {
    setup(null);
    expect(screen.getByRole("heading", { name: "Monday Hoops" })).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 10 games played/)).toBeInTheDocument();
    expect(screen.queryByText("Season Ended")).toBeNull();
  });

  it("marks Overview active on the league root", () => {
    setup(null);
    expect(current().map((l) => l.textContent)).toEqual(["Overview"]);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/leagues/L");
  });

  it("marks the tab for the current segment, including nested pages", () => {
    setup("games");
    expect(current().map((l) => l.textContent)).toEqual(["Games"]);
    expect(screen.getByRole("link", { name: "Bracket" })).toHaveAttribute("href", "/leagues/L/bracket");
  });

  it("shows the ended badge", () => {
    setup(null, { status: "ended" });
    expect(screen.getByText("Season Ended")).toBeInTheDocument();
  });
});
