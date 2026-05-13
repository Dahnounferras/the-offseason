"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLeague, getTeams, getGames, addTeam } from "@/lib/firestore/leagues";
import type { League, Team, Game } from "@/types";

function computeStandings(teams: Team[], games: Game[], scoringRules: League["scoringRules"]) {
  const map: Record<string, { team: Team; pts: number; w: number; l: number; t: number; gp: number }> = {};
  for (const t of teams) {
    map[t.id] = { team: t, pts: 0, w: 0, l: 0, t: 0, gp: 0 };
  }
  for (const g of games) {
    const home = map[g.homeTeamId];
    const away = map[g.awayTeamId];
    if (!home || !away) continue;
    home.gp++;
    away.gp++;
    if (g.homeScore > g.awayScore) {
      home.w++; home.pts += scoringRules.win;
      away.l++; away.pts += scoringRules.loss;
    } else if (g.awayScore > g.homeScore) {
      away.w++; away.pts += scoringRules.win;
      home.l++; home.pts += scoringRules.loss;
    } else {
      home.t++; home.pts += scoringRules.tie;
      away.t++; away.pts += scoringRules.tie;
    }
  }
  return Object.values(map).sort((a, b) => b.pts - a.pts || b.w - a.w);
}

export default function LeaguePage() {
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);

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
    await addTeam(id, newTeamName.trim());
    const updated = await getTeams(id);
    setTeams(updated);
    setNewTeamName("");
    setAddingTeam(false);
  }

  if (!league) {
    return <div className="flex items-center justify-center py-20" style={{ color: "var(--muted)" }}>Loading…</div>;
  }

  const standings = computeStandings(teams, games, league.scoringRules);

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>
          <Link href="/dashboard" className="hover:underline">My Leagues</Link> / {league.name}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{league.name}</h1>
            <span className="text-sm" style={{ color: "var(--accent)" }}>{league.sport}</span>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/leagues/${id}/games`}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            >
              Games
            </Link>
            <Link
              href={`/leagues/${id}/bracket`}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Bracket
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-semibold mb-3">Standings</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-center">GP</th>
                  <th className="px-4 py-3 text-center">W</th>
                  <th className="px-4 py-3 text-center">L</th>
                  <th className="px-4 py-3 text-center">T</th>
                  <th className="px-4 py-3 text-center font-bold" style={{ color: "var(--accent)" }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8" style={{ color: "var(--muted)" }}>
                      No teams yet. Add teams below.
                    </td>
                  </tr>
                )}
                {standings.map((row, i) => (
                  <tr
                    key={row.team.id}
                    style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{row.team.name}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>{row.gp}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--win)" }}>{row.w}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--loss)" }}>{row.l}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--tie)" }}>{row.t}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--accent)" }}>{row.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Teams</h2>
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="space-y-2 mb-4">
              {teams.map((t) => (
                <div key={t.id} className="text-sm py-1">{t.name}</div>
              ))}
              {teams.length === 0 && (
                <p className="text-sm" style={{ color: "var(--muted)" }}>No teams yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
                placeholder="Team name"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <button
                onClick={handleAddTeam}
                disabled={addingTeam || !newTeamName.trim()}
                className="px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
