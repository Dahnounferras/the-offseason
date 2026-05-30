"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLeague, getTeams, getGames, addTeam, deleteTeam } from "@/lib/firestore/leagues";
import type { League, Team, Game } from "@/types";
import { computeStandings } from "@/lib/standings";

export default function TeamsPage() {
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<Team | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getLeague(id), getTeams(id), getGames(id)]).then(([l, t, g]) => {
      if (l) setLeague(l);
      setTeams(t);
      setGames(g);
    });
  }, [id]);

  async function handleAddTeam() {
    if (!newTeamName.trim()) return;
    setAddingTeam(true);
    try {
      await addTeam(id, newTeamName.trim());
      const updated = await getTeams(id);
      setTeams(updated);
      setNewTeamName("");
    } finally {
      setAddingTeam(false);
    }
  }

  async function handleDeleteTeam() {
    if (!confirmDeleteTeam) return;
    setDeletingTeamId(confirmDeleteTeam.id);
    setConfirmDeleteTeam(null);
    try {
      await deleteTeam(id, confirmDeleteTeam.id);
      setTeams((prev) => prev.filter((t) => t.id !== confirmDeleteTeam.id));
    } finally {
      setDeletingTeamId(null);
    }
  }

  if (!league) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--muted)" }}>
        Loading…
      </div>
    );
  }

  const standings = computeStandings(teams, games, league.scoringRules);

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>
          <Link href="/dashboard" className="hover:underline">My Leagues</Link>
          {" / "}
          <Link href={`/leagues/${id}`} className="hover:underline">{league.name}</Link>
          {" / Teams"}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Teams</h1>
          <Link
            href={`/leagues/${id}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          >
            ← Back to League
          </Link>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {standings.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
            No teams yet. Add one below.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">GP</th>
                <th className="px-4 py-3 text-center" style={{ color: "var(--win)" }}>W</th>
                <th className="px-4 py-3 text-center" style={{ color: "var(--loss)" }}>L</th>
                <th className="px-4 py-3 text-center" style={{ color: "var(--tie)" }}>T</th>
                <th className="px-4 py-3 text-center font-bold" style={{ color: "var(--accent)" }}>PTS</th>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, i) => {
                const isDeleting = deletingTeamId === row.team.id;
                return (
                  <tr
                    key={row.team.id}
                    style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)", opacity: isDeleting ? 0.4 : 1 }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{i + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/leagues/${id}/teams/${row.team.id}`}
                        className="hover:underline"
                        style={{ color: "var(--foreground)" }}
                      >
                        {row.team.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>{row.gp}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--win)" }}>{row.w}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--loss)" }}>{row.l}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--tie)" }}>{row.t}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--accent)" }}>{row.pts}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/leagues/${id}/teams/${row.team.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                      >
                        Roster & Stats ›
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmDeleteTeam(row.team)}
                        disabled={isDeleting}
                        className="cursor-pointer p-1.5 rounded-lg disabled:opacity-30 hover:opacity-70 transition-opacity"
                        style={{ color: "var(--loss)" }}
                        title="Delete team"
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

        {/* Add team form */}
        <div className="px-4 py-4" style={{ borderTop: standings.length > 0 ? "1px solid var(--border)" : undefined }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
            Add a team
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
            <button
              onClick={handleAddTeam}
              disabled={addingTeam || !newTeamName.trim()}
              className="cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {addingTeam ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      </div>
      {confirmDeleteTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-bold mb-2">Delete team?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{confirmDeleteTeam.name}</span>{" "}
              will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteTeam(null)}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeam}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "var(--loss)", color: "#fff" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
