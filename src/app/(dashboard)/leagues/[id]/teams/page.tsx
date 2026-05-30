"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLeague, getTeams, getGames } from "@/lib/firestore/leagues";
import type { League, Team, Game } from "@/types";
import { computeStandings } from "@/lib/standings";

export default function TeamsPage() {
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    Promise.all([getLeague(id), getTeams(id), getGames(id)]).then(([l, t, g]) => {
      if (l) setLeague(l);
      setTeams(t);
      setGames(g);
    });
  }, [id]);

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
          <div className="py-16 text-center text-sm" style={{ color: "var(--muted)" }}>
            No teams yet. Add teams from the league page.
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
              </tr>
            </thead>
            <tbody>
              {standings.map((row, i) => (
                <tr
                  key={row.team.id}
                  style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
