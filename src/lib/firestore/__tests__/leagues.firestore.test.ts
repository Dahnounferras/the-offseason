import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  doc, collection, query, where, deleteField,
} from "firebase/firestore";
import {
  getLeague, getUserLeagues, createLeague, updateLeague,
  getTeams, addTeam, getGames, scheduleGames,
  recordResult, updateResult, getPlayers, addPlayer, updatePlayer,
  endLeague, reactivateLeague, deleteLeague,
  getBracket, saveBracket, deleteBracket, updateBracket,
} from "@/lib/firestore/leagues";
import { makeDocSnap, makeEmptyDocSnap, makeQuerySnap } from "@/test/mocks/firebase";

vi.mock("firebase/firestore", () => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn((_, ...segs) => ({ path: segs.join("/") })),
  collection: vi.fn((_, ...segs) => ({ path: segs.join("/") })),
  query: vi.fn((...args) => args[0]),
  where: vi.fn((...args) => args),
  serverTimestamp: vi.fn(() => ({ _type: "serverTimestamp" })),
  deleteField: vi.fn(() => ({ _type: "deleteField" })),
}));

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));

beforeEach(() => vi.clearAllMocks());

describe("getLeague", () => {
  it("returns league with id when document exists", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(makeDocSnap("league-1", { name: "Summer", sport: "Soccer" }) as never);
    const result = await getLeague("league-1");
    expect(result).toEqual({ id: "league-1", name: "Summer", sport: "Soccer" });
  });

  it("returns null when document does not exist", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(makeEmptyDocSnap() as never);
    const result = await getLeague("missing");
    expect(result).toBeNull();
  });

  it("calls doc with correct path", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(makeEmptyDocSnap() as never);
    await getLeague("abc");
    expect(doc).toHaveBeenCalledWith({}, "leagues", "abc");
  });
});

describe("getUserLeagues", () => {
  it("returns mapped array with ids", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(
      makeQuerySnap([
        { id: "l1", data: { name: "League 1", ownerId: "user1" } },
        { id: "l2", data: { name: "League 2", ownerId: "user1" } },
      ]) as never
    );
    const result = await getUserLeagues("user1");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("l1");
    expect(result[1].id).toBe("l2");
  });

  it("returns empty array when no leagues found", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeQuerySnap([]) as never);
    const result = await getUserLeagues("user1");
    expect(result).toEqual([]);
  });

  it("filters by ownerId", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeQuerySnap([]) as never);
    await getUserLeagues("user42");
    expect(where).toHaveBeenCalledWith("ownerId", "==", "user42");
  });
});

describe("createLeague", () => {
  it("calls addDoc with createdAt as a number", async () => {
    vi.mocked(addDoc).mockResolvedValueOnce({ id: "new-id" } as never);
    await createLeague({ name: "Fall League", sport: "Football", ownerId: "u1", isPublic: false, season: { totalGames: 10, currentGame: 0 }, scoringRules: { win: 2, tie: 1, loss: 0 } });
    const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(typeof payload.createdAt).toBe("number");
  });

  it("returns the new document id", async () => {
    vi.mocked(addDoc).mockResolvedValueOnce({ id: "created-123" } as never);
    const id = await createLeague({ name: "X", sport: "Soccer", ownerId: "u1", isPublic: false, season: { totalGames: 5, currentGame: 0 }, scoringRules: { win: 2, tie: 1, loss: 0 } });
    expect(id).toBe("created-123");
  });
});

describe("addTeam", () => {
  it("creates team with default win/loss/ties of 0", async () => {
    vi.mocked(addDoc).mockResolvedValueOnce({ id: "team-1" } as never);
    await addTeam("league-1", "Hawks");
    const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toMatchObject({ name: "Hawks", wins: 0, losses: 0, ties: 0 });
  });

  it("returns the new team id", async () => {
    vi.mocked(addDoc).mockResolvedValueOnce({ id: "t-abc" } as never);
    const id = await addTeam("league-1", "Eagles");
    expect(id).toBe("t-abc");
  });
});

describe("scheduleGames", () => {
  it("calls addDoc once per matchup", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "g" } as never);
    const matchups = [
      { homeTeamId: "A", awayTeamId: "B", gameNumber: 1 },
      { homeTeamId: "C", awayTeamId: "D", gameNumber: 2 },
    ];
    await scheduleGames("league-1", matchups);
    expect(addDoc).toHaveBeenCalledTimes(2);
  });

  it("includes status: scheduled and statLines: [] in each game", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "g" } as never);
    await scheduleGames("league-1", [{ homeTeamId: "A", awayTeamId: "B", gameNumber: 1 }]);
    const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.status).toBe("scheduled");
    expect(payload.statLines).toEqual([]);
  });
});

describe("recordResult", () => {
  it("includes status: played and playedAt as a number", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await recordResult("l1", "g1", 3, 1);
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.status).toBe("played");
    expect(typeof payload.playedAt).toBe("number");
    expect(payload.homeScore).toBe(3);
    expect(payload.awayScore).toBe(1);
  });

  it("includes sportsmanship when provided", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await recordResult("l1", "g1", 3, 1, 4, 5);
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.homeSportsmanship).toBe(4);
    expect(payload.awaySportsmanship).toBe(5);
  });

  it("omits sportsmanship fields when not provided", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await recordResult("l1", "g1", 3, 1);
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect("homeSportsmanship" in payload).toBe(false);
    expect("awaySportsmanship" in payload).toBe(false);
  });
});

describe("updateResult", () => {
  it("only includes homeScore and awayScore (no status, no playedAt)", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await updateResult("l1", "g1", 5, 2);
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.homeScore).toBe(5);
    expect(payload.awayScore).toBe(2);
    expect("status" in payload).toBe(false);
    expect("playedAt" in payload).toBe(false);
  });

  it("includes sportsmanship fields when provided", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await updateResult("l1", "g1", 2, 3, 3, 4);
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.homeSportsmanship).toBe(3);
    expect(payload.awaySportsmanship).toBe(4);
  });
});

describe("endLeague / reactivateLeague / deleteLeague", () => {
  it("endLeague calls updateDoc with status: ended", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await endLeague("l1");
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.status).toBe("ended");
  });

  it("reactivateLeague calls updateDoc with status: active", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await reactivateLeague("l1");
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.status).toBe("active");
  });

  it("deleteLeague calls updateDoc with status: deleted", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await deleteLeague("l1");
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.status).toBe("deleted");
  });
});

describe("updatePlayer", () => {
  it("includes deleteField for jerseyNumber when clearJerseyNumber is true", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    vi.mocked(deleteField).mockReturnValue({ _type: "deleteField" } as never);
    await updatePlayer("l1", "t1", "p1", { firstName: "John" }, true);
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.jerseyNumber).toEqual({ _type: "deleteField" });
  });

  it("does not include jerseyNumber key when clearJerseyNumber is false", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await updatePlayer("l1", "t1", "p1", { firstName: "Jane" }, false);
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect("jerseyNumber" in payload).toBe(false);
  });
});

describe("getBracket", () => {
  it("returns null when collection is empty", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeQuerySnap([]) as never);
    const result = await getBracket("l1");
    expect(result).toBeNull();
  });

  it("unwraps rounds from Firestore nested format", async () => {
    const matchups = [{ homeTeamId: "A", awayTeamId: "B", winnerId: null }];
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: "bracket-1",
        data: () => ({
          status: "active",
          generatedAt: 1234567890,
          rounds: [{ matchups }],
        }),
      }],
    } as never);
    const result = await getBracket("l1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("bracket-1");
    expect(result!.rounds).toEqual([matchups]);
  });
});

describe("saveBracket", () => {
  it("wraps rounds in { matchups } format before saving", async () => {
    vi.mocked(addDoc).mockResolvedValueOnce({ id: "bracket-new" } as never);
    const rounds = [[{ homeTeamId: "A", awayTeamId: "B", winnerId: null }]];
    await saveBracket("l1", { rounds, generatedAt: 123, status: "active" });
    const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.rounds).toEqual([{ matchups: rounds[0] }]);
  });

  it("returns the new bracket id", async () => {
    vi.mocked(addDoc).mockResolvedValueOnce({ id: "b-xyz" } as never);
    const id = await saveBracket("l1", { rounds: [], generatedAt: 0, status: "active" });
    expect(id).toBe("b-xyz");
  });
});

describe("updateBracket", () => {
  it("wraps rounds in { matchups } format before updating", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    const rounds = [[{ homeTeamId: "A", awayTeamId: "B", winnerId: "A" }]];
    await updateBracket("l1", "b1", rounds);
    const payload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.rounds).toEqual([{ matchups: rounds[0] }]);
  });
});

describe("deleteBracket", () => {
  it("calls deleteDoc with correct path", async () => {
    vi.mocked(deleteDoc).mockResolvedValueOnce(undefined);
    await deleteBracket("l1", "b1");
    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
