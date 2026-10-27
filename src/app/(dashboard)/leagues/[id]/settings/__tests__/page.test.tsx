import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/(dashboard)/leagues/[id]/settings/page";
import { ToastProvider } from "@/components/ui/Toast";
import { useLeague } from "@/hooks/useLeague";
import { updateLeague } from "@/lib/firestore/leagues";
import type { Game, League } from "@/types";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "L" }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/hooks/useLeague", () => ({ useLeague: vi.fn() }));
vi.mock("@/lib/firestore/leagues", () => ({
  updateLeague: vi.fn(),
  endLeague: vi.fn(),
  deleteLeague: vi.fn(),
  reactivateLeague: vi.fn(),
  resetLeague: vi.fn(),
}));

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

const game: Game = { id: "g1", homeTeamId: "a", awayTeamId: "b", status: "scheduled", statLines: [] };
const setLeague = vi.fn();

function setup(games: Game[] = [], overrides: Partial<League> = {}) {
  vi.mocked(useLeague).mockReturnValue({
    league: { ...league, ...overrides },
    games,
    setLeague,
    setGames: vi.fn(),
    setBracket: vi.fn(),
  } as unknown as ReturnType<typeof useLeague>);
  render(
    <ToastProvider>
      <SettingsPage />
    </ToastProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe("SettingsPage", () => {
  it("saves new scoring rules and season length", async () => {
    vi.mocked(updateLeague).mockResolvedValue();
    setup();
    const win = screen.getByLabelText("win");
    await userEvent.clear(win);
    await userEvent.type(win, "3");
    const length = screen.getByLabelText("Season length (games)");
    await userEvent.clear(length);
    await userEvent.type(length, "12");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(updateLeague).toHaveBeenCalledWith("L", {
      name: "Monday Hoops",
      scoringRules: { win: 3, tie: 1, loss: 0 },
      season: { totalGames: 12 },
    });
    expect(setLeague).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Settings saved.");
  });

  it("shows a validation error without writing", async () => {
    setup();
    await userEvent.clear(screen.getByLabelText("League name"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(updateLeague).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/name/);
  });

  it("locks season length and offers reset once a schedule exists", () => {
    setup([game]);
    expect(screen.getByLabelText("Season length (games)")).toBeDisabled();
    expect(screen.getByText(/Reset the league to change season length/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset League" })).toBeInTheDocument();
  });

  it("offers reactivate instead of end and reset for an ended league", () => {
    setup([game], { status: "ended" });
    expect(screen.getByRole("button", { name: "Reactivate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End Season" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset League" })).toBeNull();
  });
});
