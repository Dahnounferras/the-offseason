import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GamesPage from "@/app/(dashboard)/leagues/[id]/games/page";
import { ToastProvider } from "@/components/ui/Toast";
import { useLeague } from "@/hooks/useLeague";
import { recordResult } from "@/lib/firestore/leagues";
import type { Game, League } from "@/types";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "L" }) }));
vi.mock("@/hooks/useLeague", () => ({ useLeague: vi.fn() }));
vi.mock("@/lib/firestore/leagues", () => ({ recordResult: vi.fn() }));

const league = { id: "L", name: "Hoops", status: "active" } as League;
const game: Game = {
  id: "g1",
  homeTeamId: "a",
  awayTeamId: "b",
  gameNumber: 1,
  status: "scheduled",
  location: "Court 2",
  statLines: [],
};
const setGames = vi.fn();

function setup(overrides: Partial<League> = {}) {
  vi.mocked(useLeague).mockReturnValue({
    league: { ...league, ...overrides },
    teams: [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ],
    games: [game],
    setGames,
  } as unknown as ReturnType<typeof useLeague>);
  render(
    <ToastProvider>
      <GamesPage />
    </ToastProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe("GamesPage quick score", () => {
  it("records a score from the list and patches the shared games", async () => {
    vi.mocked(recordResult).mockResolvedValue(123);
    setup();
    expect(screen.getByText("Court 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Score" }));
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Alpha score"), "3");
    await userEvent.type(screen.getByLabelText("Beta score"), "1{Enter}");
    expect(recordResult).toHaveBeenCalledWith("L", "g1", 3, 1);
    const update = setGames.mock.calls[0][0] as (prev: Game[]) => Game[];
    expect(update([game])[0]).toMatchObject({ status: "played", homeScore: 3, awayScore: 1, playedAt: 123 });
    expect(await screen.findByRole("status")).toHaveTextContent("Alpha 3 – 1 Beta");
  });

  it("keeps the form open and shows an error when the write fails", async () => {
    vi.mocked(recordResult).mockRejectedValue({ code: "unavailable" });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Score" }));
    await userEvent.type(screen.getByLabelText("Alpha score"), "3");
    await userEvent.type(screen.getByLabelText("Beta score"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/connection/);
    expect(screen.getByLabelText("Alpha score")).toBeInTheDocument();
    expect(setGames).not.toHaveBeenCalled();
  });

  it("hides quick score for an ended league", () => {
    setup({ status: "ended" });
    expect(screen.queryByRole("button", { name: "Score" })).toBeNull();
  });
});
