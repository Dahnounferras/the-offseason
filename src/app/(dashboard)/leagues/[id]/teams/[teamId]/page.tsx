"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLeague, getTeams, getGames, getPlayers, addPlayer, updatePlayer, deletePlayer } from "@/lib/firestore/leagues";
import type { League, Team, Game, Player } from "@/types";
import { computeStandings } from "@/lib/standings";
import { getSportConfig } from "@/lib/sportConfig";

export default function TeamDetailPage() {
  const { id, teamId } = useParams<{ id: string; teamId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerForm, setPlayerForm] = useState({ firstName: "", lastName: "", jerseyNumber: "" });
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", jerseyNumber: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState<Player | null>(null);

  useEffect(() => {
    Promise.all([getLeague(id), getTeams(id), getGames(id), getPlayers(id, teamId)]).then(
      ([l, t, g, p]) => {
        if (l) setLeague(l);
        setTeams(t);
        setGames(g);
        setPlayers(p);
      }
    );
  }, [id, teamId]);

  function jerseyTaken(num: number, excludePlayerId?: string): boolean {
    return players.some(
      (p) => p.jerseyNumber === num && p.id !== excludePlayerId
    );
  }

  async function handleSavePlayer() {
    if (!editingPlayer || !editForm.firstName.trim() || !editForm.lastName.trim()) return;
    if (editForm.jerseyNumber.trim()) {
      const num = Number(editForm.jerseyNumber);
      if (jerseyTaken(num, editingPlayer.id)) {
        setEditError(`Jersey #${num} is already taken by another player.`);
        return;
      }
    }
    setEditError(null);
    setSavingPlayer(true);
    try {
      const clearJersey = !editForm.jerseyNumber.trim() && editingPlayer.jerseyNumber !== undefined;
      const data: Parameters<typeof updatePlayer>[3] = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
      };
      if (editForm.jerseyNumber.trim()) {
        data.jerseyNumber = Number(editForm.jerseyNumber);
      }
      await updatePlayer(id, teamId, editingPlayer.id, data, clearJersey);
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== editingPlayer.id) return p;
          const next = { ...p, ...data };
          if (clearJersey) delete next.jerseyNumber;
          return next;
        })
      );
      setEditingPlayer(null);
    } finally {
      setSavingPlayer(false);
    }
  }

  async function handleAddPlayer() {
    if (!playerForm.firstName.trim() || !playerForm.lastName.trim()) return;
    if (playerForm.jerseyNumber.trim()) {
      const num = Number(playerForm.jerseyNumber);
      if (jerseyTaken(num)) {
        setAddError(`Jersey #${num} is already taken by another player.`);
        return;
      }
    }
    setAddError(null);
    setAddingPlayer(true);
    try {
      const data: Parameters<typeof addPlayer>[2] = {
        firstName: playerForm.firstName.trim(),
        lastName: playerForm.lastName.trim(),
        teamId,
        stats: {},
      };
      if (playerForm.jerseyNumber.trim()) {
        data.jerseyNumber = Number(playerForm.jerseyNumber);
      }
      await addPlayer(id, teamId, data);
      const updated = await getPlayers(id, teamId);
      setPlayers(updated);
      setPlayerForm({ firstName: "", lastName: "", jerseyNumber: "" });
    } finally {
      setAddingPlayer(false);
    }
  }

  async function handleDeletePlayer() {
    if (!confirmDeletePlayer) return;
    setDeletingPlayerId(confirmDeletePlayer.id);
    setConfirmDeletePlayer(null);
    try {
      await deletePlayer(id, teamId, confirmDeletePlayer.id);
      setPlayers((prev) => prev.filter((p) => p.id !== confirmDeletePlayer.id));
    } finally {
      setDeletingPlayerId(null);
    }
  }

  const team = teams.find((t) => t.id === teamId) ?? null;

  const sportConfig = useMemo(
    () => getSportConfig(league?.sport ?? "Basketball"),
    [league]
  );
  const statKeys = sportConfig.statKeys;

  const standings = useMemo(
    () => (league ? computeStandings(teams, games, league.scoringRules) : []),
    [teams, games, league]
  );

  const teamStanding = standings.find((row) => row.team.id === teamId);

  const playedGames = useMemo(() => games.filter((g) => g.status === "played"), [games]);

  const seasonTotals = useMemo(() => {
    type TotalsEntry = { [key: string]: number; gp: number };
    const totals: Record<string, TotalsEntry> = {};
    for (const game of playedGames) {
      if (game.homeTeamId !== teamId && game.awayTeamId !== teamId) continue;
      for (const sl of game.statLines ?? []) {
        const player = players.find((p) => p.id === sl.playerId);
        if (!player) continue;
        if (!totals[sl.playerId]) {
          totals[sl.playerId] = { gp: 0, ...Object.fromEntries(statKeys.map((k) => [k, 0])) };
        }
        for (const k of statKeys) {
          totals[sl.playerId][k] = (totals[sl.playerId][k] ?? 0) + (sl.stats[k] ?? 0);
        }
        totals[sl.playerId].gp += 1;
      }
    }
    return totals;
  }, [playedGames, players, teamId, statKeys]);

  const rosterRows = [...players].sort((a, b) => {
    const aStats = seasonTotals[a.id];
    const bStats = seasonTotals[b.id];
    return (bStats?.[sportConfig.primaryStat] ?? 0) - (aStats?.[sportConfig.primaryStat] ?? 0);
  });

  if (!league) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--muted)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>
          <Link href="/dashboard" className="hover:underline">My Leagues</Link>
          {" / "}
          <Link href={`/leagues/${id}`} className="hover:underline">{league.name}</Link>
          {" / "}
          <Link href={`/leagues/${id}/teams`} className="hover:underline">Teams</Link>
          {team ? ` / ${team.name}` : ""}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{team?.name ?? "Team"}</h1>
            {teamStanding && (
              <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: "var(--muted)" }}>
                <span style={{ color: "var(--win)" }}>{teamStanding.w}W</span>
                <span style={{ color: "var(--loss)" }}>{teamStanding.l}L</span>
                {teamStanding.t > 0 && <span style={{ color: "var(--tie)" }}>{teamStanding.t}T</span>}
                <span>·</span>
                <span>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>{teamStanding.pts}</span> pts
                </span>
              </div>
            )}
          </div>
          <Link
            href={`/leagues/${id}/teams`}
            className="px-4 py-2 rounded-lg text-sm font-semibold shrink-0"
            style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          >
            ← All Teams
          </Link>
        </div>
      </div>

      <h2 className="font-semibold mb-3">Roster & Stats</h2>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {players.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
            No players on this roster yet. Add one below.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <th className="text-left px-4 py-3" style={{ color: "var(--muted)" }}>#</th>
                <th className="text-left px-4 py-3">Player</th>
                <th className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>GP</th>
                {statKeys.map((k) => (
                  <th
                    key={k}
                    className="px-4 py-3 text-center"
                    style={{
                      color: k === sportConfig.primaryStat ? "var(--accent)" : "var(--muted)",
                      fontWeight: k === sportConfig.primaryStat ? 700 : 400,
                    }}
                  >
                    {sportConfig.statLabels[k]?.abbrev ?? k.toUpperCase()}
                  </th>
                ))}
                <th className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                  {sportConfig.computedStatLabel}
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rosterRows.map((player, i) => {
                const totals = seasonTotals[player.id];
                const isEditing = editingPlayer?.id === player.id;
                const isDeleting = deletingPlayerId === player.id;
                const rowBg = i % 2 === 0 ? "var(--surface)" : "var(--surface-2)";

                if (isEditing) {
                  return (
                    <tr key={player.id} style={{ background: rowBg }}>
                      <td colSpan={statKeys.length + 5} className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={editForm.firstName}
                            onChange={(e) => { setEditError(null); setEditForm({ ...editForm, firstName: e.target.value }); }}
                            placeholder="First name"
                            className="px-3 py-1.5 rounded-lg text-sm outline-none"
                            style={{ background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--foreground)", minWidth: 110 }}
                          />
                          <input
                            type="text"
                            value={editForm.lastName}
                            onChange={(e) => { setEditError(null); setEditForm({ ...editForm, lastName: e.target.value }); }}
                            placeholder="Last name"
                            className="px-3 py-1.5 rounded-lg text-sm outline-none"
                            style={{ background: "var(--surface-2)", border: "1px solid var(--accent)", color: "var(--foreground)", minWidth: 110 }}
                          />
                          <input
                            type="number"
                            value={editForm.jerseyNumber}
                            onChange={(e) => { setEditError(null); setEditForm({ ...editForm, jerseyNumber: e.target.value }); }}
                            placeholder="Jersey # (optional)"
                            className="px-3 py-1.5 rounded-lg text-sm outline-none"
                            style={{
                              background: "var(--surface-2)",
                              border: `1px solid ${editError ? "var(--loss)" : "var(--accent)"}`,
                              color: "var(--foreground)",
                              width: 150,
                            }}
                          />
                          <button
                            onClick={() => { setEditingPlayer(null); setEditError(null); }}
                            className="cursor-pointer px-3 py-1.5 rounded-lg text-sm"
                            style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSavePlayer}
                            disabled={savingPlayer || !editForm.firstName.trim() || !editForm.lastName.trim()}
                            className="cursor-pointer px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                            style={{ background: "var(--accent)", color: "#000" }}
                          >
                            {savingPlayer ? "Saving…" : "Save"}
                          </button>
                        </div>
                        {editError && (
                          <p className="mt-2 text-xs" style={{ color: "var(--loss)" }}>{editError}</p>
                        )}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={player.id} style={{ background: rowBg, opacity: isDeleting ? 0.4 : 1 }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--accent)" }}>
                      {player.jerseyNumber !== undefined ? `#${player.jerseyNumber}` : ""}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{player.firstName} {player.lastName}</span>
                        <button
                          onClick={() => {
                            setEditingPlayer(player);
                            setEditError(null);
                            setEditForm({
                              firstName: player.firstName,
                              lastName: player.lastName,
                              jerseyNumber: player.jerseyNumber !== undefined ? String(player.jerseyNumber) : "",
                            });
                          }}
                          className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded text-xs"
                          style={{ color: "var(--muted)", background: "var(--surface)" }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>{totals?.gp ?? 0}</td>
                    {statKeys.map((k) => (
                      <td
                        key={k}
                        className="px-4 py-3 text-center"
                        style={{
                          color: k === sportConfig.primaryStat ? "var(--accent)" : "var(--muted)",
                          fontWeight: k === sportConfig.primaryStat ? 600 : 400,
                        }}
                      >
                        {totals ? (totals[k] ?? 0) : "—"}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                      {totals && totals.gp > 0
                        ? ((totals[sportConfig.primaryStat] ?? 0) / totals.gp).toFixed(1)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmDeletePlayer(player)}
                        disabled={isDeleting}
                        className="cursor-pointer p-1.5 rounded-lg disabled:opacity-30 hover:opacity-70 transition-opacity"
                        style={{ color: "var(--loss)" }}
                        title="Remove player"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Add player form */}
        <div className="px-4 py-4" style={{ borderTop: players.length > 0 ? "1px solid var(--border)" : undefined }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
            Add a player
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="First name"
              value={playerForm.firstName}
              onChange={(e) => { setAddError(null); setPlayerForm({ ...playerForm, firstName: e.target.value }); }}
              onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)", minWidth: 120 }}
            />
            <input
              type="text"
              placeholder="Last name"
              value={playerForm.lastName}
              onChange={(e) => { setAddError(null); setPlayerForm({ ...playerForm, lastName: e.target.value }); }}
              onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)", minWidth: 120 }}
            />
            <input
              type="number"
              placeholder="Jersey # (optional)"
              value={playerForm.jerseyNumber}
              onChange={(e) => { setAddError(null); setPlayerForm({ ...playerForm, jerseyNumber: e.target.value }); }}
              onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--surface-2)",
                border: `1px solid ${addError ? "var(--loss)" : "var(--border)"}`,
                color: "var(--foreground)",
                width: 160,
              }}
            />
            <button
              onClick={handleAddPlayer}
              disabled={addingPlayer || !playerForm.firstName.trim() || !playerForm.lastName.trim()}
              className="cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {addingPlayer ? "Adding…" : "Add"}
            </button>
          </div>
          {addError && (
            <p className="mt-2 text-xs" style={{ color: "var(--loss)" }}>{addError}</p>
          )}
        </div>
      </div>
      {/* Delete player confirmation modal */}
      {confirmDeletePlayer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-bold mb-2">Remove player?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              <span style={{ color: "var(--foreground)", fontWeight: 500 }}>
                {confirmDeletePlayer.firstName} {confirmDeletePlayer.lastName}
              </span>{" "}
              will be removed from this roster. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeletePlayer(null)}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlayer}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "var(--loss)", color: "#fff" }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
