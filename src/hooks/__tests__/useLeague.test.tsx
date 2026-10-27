import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getLeague, getTeams, getGames, getBracket, getPlayers } from "@/lib/firestore/leagues";
import { LeagueProvider, useLeague, useTeamPlayers, classifyLoadError } from "@/hooks/useLeague";
import type { League } from "@/types";

vi.mock("@/lib/firestore/leagues", () => ({
  getLeague: vi.fn(),
  getTeams: vi.fn(),
  getGames: vi.fn(),
  getBracket: vi.fn(),
  getPlayers: vi.fn(),
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

function Probe() {
  const { league, teams, games, players, setTeams } = useLeague();
  return (
    <div>
      <p>{league.name}</p>
      <p>teams: {teams.map((t) => t.name).join(",")}</p>
      <p>games: {games.map((g) => g.gameNumber).join(",")}</p>
      <p>players: {(players.t1 ?? []).map((p) => p.firstName).join(",")}</p>
      <button onClick={() => setTeams((prev) => [...prev, { id: "t2", name: "Beta" }])}>add</button>
    </div>
  );
}

// Edits one roster through useTeamPlayers; Probe shows the shared result.
function RosterProbe({ teamId }: { teamId: string }) {
  const [players, setPlayers] = useTeamPlayers(teamId);
  return (
    <div>
      <p>{teamId} roster: {players.length}</p>
      <button
        onClick={() => setPlayers((prev) => [...prev, { id: `${teamId}-new`, firstName: "Cal", lastName: "Ng", teamId }])}
      >
        add to {teamId}
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <LeagueProvider leagueId="L">
      <Probe />
      <RosterProbe teamId="t1" />
      <RosterProbe teamId="t9" />
    </LeagueProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTeams).mockResolvedValue([{ id: "t1", name: "Alpha" }]);
  vi.mocked(getGames).mockResolvedValue([
    { id: "g2", homeTeamId: "t1", awayTeamId: "t1", gameNumber: 2, status: "scheduled", statLines: [] },
    { id: "g1", homeTeamId: "t1", awayTeamId: "t1", gameNumber: 1, status: "played", statLines: [] },
  ]);
  vi.mocked(getBracket).mockResolvedValue(null);
  vi.mocked(getPlayers).mockResolvedValue([{ id: "p1", firstName: "Ann", lastName: "Lee", teamId: "t1" }]);
});

describe("LeagueProvider", () => {
  it("shows loading, then renders children with the league data", async () => {
    vi.mocked(getLeague).mockResolvedValue(league);
    renderProvider();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("Monday Hoops")).toBeInTheDocument();
    expect(screen.getByText("teams: Alpha")).toBeInTheDocument();
    // Games come back sorted by game number.
    expect(screen.getByText("games: 1,2")).toBeInTheDocument();
    expect(screen.getByText("players: Ann")).toBeInTheDocument();
    expect(getLeague).toHaveBeenCalledWith("L");
    expect(getPlayers).toHaveBeenCalledWith("L", "t1");
  });

  it("edits one team's roster through useTeamPlayers", async () => {
    const user = userEvent.setup();
    vi.mocked(getLeague).mockResolvedValue(league);
    renderProvider();
    await user.click(await screen.findByRole("button", { name: "add to t1" }));
    expect(screen.getByText("players: Ann,Cal")).toBeInTheDocument();
    expect(screen.getByText("t1 roster: 2")).toBeInTheDocument();
    // A team with no loaded roster starts empty and can be added to.
    expect(screen.getByText("t9 roster: 0")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "add to t9" }));
    expect(screen.getByText("t9 roster: 1")).toBeInTheDocument();
  });

  it("shares setter updates with every consumer", async () => {
    const user = userEvent.setup();
    vi.mocked(getLeague).mockResolvedValue(league);
    renderProvider();
    await user.click(await screen.findByRole("button", { name: "add" }));
    expect(screen.getByText("teams: Alpha,Beta")).toBeInTheDocument();
    expect(getTeams).toHaveBeenCalledOnce();
  });

  it("shows not found for a missing league", async () => {
    vi.mocked(getLeague).mockResolvedValue(null);
    renderProvider();
    expect(await screen.findByText("League not found")).toBeInTheDocument();
    expect(screen.queryByText("Monday Hoops")).not.toBeInTheDocument();
  });

  it("shows not found for a soft-deleted league", async () => {
    vi.mocked(getLeague).mockResolvedValue({ ...league, status: "deleted" });
    renderProvider();
    expect(await screen.findByText("League not found")).toBeInTheDocument();
  });

  it("shows no access when Firestore denies the read", async () => {
    vi.mocked(getLeague).mockRejectedValue(Object.assign(new Error("denied"), { code: "permission-denied" }));
    renderProvider();
    expect(await screen.findByText("No access to this league")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("shows an error with a retry that reloads", async () => {
    const user = userEvent.setup();
    vi.mocked(getLeague).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(league);
    renderProvider();
    expect(await screen.findByText("Couldn't load this league")).toBeInTheDocument();
    await act(() => user.click(screen.getByRole("button", { name: "Try again" })));
    expect(await screen.findByText("Monday Hoops")).toBeInTheDocument();
    expect(getLeague).toHaveBeenCalledTimes(2);
  });
});

describe("classifyLoadError", () => {
  it("maps permission-denied to forbidden and anything else to error", () => {
    expect(classifyLoadError({ code: "permission-denied" })).toBe("forbidden");
    expect(classifyLoadError({ code: "unavailable" })).toBe("error");
    expect(classifyLoadError(null)).toBe("error");
  });
});

describe("useLeague", () => {
  it("throws outside a provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/LeagueProvider/);
  });
});
