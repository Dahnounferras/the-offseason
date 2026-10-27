import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, screen } from "@testing-library/react";
import { createElement, useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { addPlayer, updatePlayer, deletePlayer } from "@/lib/firestore/leagues";
import { useRoster } from "@/hooks/useRoster";
import type { Player } from "@/types";

vi.mock("@/lib/firestore/leagues", () => ({
  addPlayer: vi.fn(),
  updatePlayer: vi.fn(),
  deletePlayer: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

const ann: Player = { id: "p1", firstName: "Ann", lastName: "Lee", jerseyNumber: 7, teamId: "A" };

function setup(initial: Player[] = [ann]) {
  return renderHook(
    () => {
      const [players, setPlayers] = useState(initial);
      return { players, roster: useRoster("L", "A", players, setPlayers) };
    },
    { wrapper: ({ children }) => createElement(ToastProvider, null, children) }
  );
}

describe("useRoster", () => {
  it("adds a player and appends it locally", async () => {
    vi.mocked(addPlayer).mockResolvedValue("p2");
    const { result } = setup();
    act(() => result.current.roster.setAddForm({ firstName: " Bob ", lastName: "Ray", jerseyNumber: "" }));
    await act(() => result.current.roster.add());
    expect(addPlayer).toHaveBeenCalledWith("L", "A", { firstName: "Bob", lastName: "Ray", teamId: "A" });
    expect(result.current.players.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(result.current.roster.addForm.firstName).toBe("");
  });

  it("blocks a duplicate jersey without writing, and clears the error on typing", async () => {
    const { result } = setup();
    act(() => result.current.roster.setAddForm({ firstName: "Bob", lastName: "Ray", jerseyNumber: "7" }));
    await act(() => result.current.roster.add());
    expect(addPlayer).not.toHaveBeenCalled();
    expect(result.current.roster.addError).toMatch(/#7/);
    act(() => result.current.roster.setAddForm({ firstName: "Bob", lastName: "Ray", jerseyNumber: "8" }));
    expect(result.current.roster.addError).toBeNull();
  });

  it("saves an edit and clears a removed jersey number", async () => {
    vi.mocked(updatePlayer).mockResolvedValue();
    const { result } = setup();
    act(() => result.current.roster.startEdit(ann));
    expect(result.current.roster.editForm.jerseyNumber).toBe("7");
    act(() => result.current.roster.setEditForm({ firstName: "Anne", lastName: "Lee", jerseyNumber: "" }));
    await act(() => result.current.roster.save());
    expect(updatePlayer).toHaveBeenCalledWith("L", "A", "p1", { firstName: "Anne", lastName: "Lee" }, true);
    expect(result.current.players[0]).toEqual({ id: "p1", firstName: "Anne", lastName: "Lee", teamId: "A" });
    expect(result.current.roster.editing).toBeNull();
  });

  it("removes a player locally after the delete", async () => {
    vi.mocked(deletePlayer).mockResolvedValue();
    const { result } = setup();
    await act(() => result.current.roster.remove(ann));
    expect(deletePlayer).toHaveBeenCalledWith("L", "A", "p1");
    expect(result.current.players).toEqual([]);
    expect(result.current.roster.removingId).toBeNull();
  });

  it("shows an error toast and resets the busy flag when a write fails", async () => {
    vi.mocked(addPlayer).mockRejectedValue({ code: "permission-denied" });
    const { result } = setup();
    act(() => result.current.roster.setAddForm({ firstName: "Bob", lastName: "Ray", jerseyNumber: "" }));
    await act(() => result.current.roster.add());
    expect(result.current.roster.adding).toBe(false);
    expect(result.current.players).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(/permission/);
  });

  it("reports whether a remove succeeded", async () => {
    vi.mocked(deletePlayer).mockRejectedValue(new Error("offline"));
    const { result } = setup();
    let removed = true;
    await act(async () => { removed = await result.current.roster.remove(ann); });
    expect(removed).toBe(false);
    expect(result.current.players).toHaveLength(1);
  });
});
