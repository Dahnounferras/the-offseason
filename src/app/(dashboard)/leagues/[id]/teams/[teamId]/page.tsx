"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLeague, getTeams, getGames, getPlayers } from "@/lib/firestore/leagues";
import type { League, Team, Game, Player } from "@/types";
import { computeStandings } from "@/lib/standings";

export default function TeamDetailPage() {
  const { id, teamId } = useParams<{ id: string; teamId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

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

  const team = teams.find((t) => t.id === teamId) ?? null;

  const standings = useMemo(
    () => (league ? computeStandings(teams, games, league.scoringRules) : []),
    [teams, games, league]
  );

  const teamStanding = standings.find((row) => row.team.id === teamId);

  const playedGames = useMemo(() => games.filter((g) => g.status === "played"), [games]);

  const seasonTotals = useMemo(() => {
    const totals: Record<string, { pts: number; ast: number; reb: number; blk: number; stl: number; gp: number }> = {};
    for (const game of playedGames) {
      if (game.homeTeamId !== teamId && game.awayTeamId !== teamId) continue;
      for (const sl of game.statLines ?? []) {
        const player = players.find((p) => p.id === sl.playerId);
        if (!player) continue;
        if (!totals[sl.playerId]) {
          totals[sl.playerId] = { pts: 0, ast: 0, reb: 0, blk: 0, stl: 0, gp: 0 };
        }
        totals[sl.playerId].pts += sl.stats.pts ?? 0;
        totals[sl.playerId].ast += sl.stats.ast ?? 0;
        totals[sl.playerId].reb += sl.stats.reb ?? 0;
        totals[sl.playerId].blk += sl.stats.blk ?? 0;
        totals[sl.playerId].stl += sl.stats.stl ?? 0;
        totals[sl.playerId].gp += 1;
      }
    }
    return totals;
  }, [playedGames, players, teamId]);

  const rosterRows = [...players]
    .sort((a, b) => {
      const aStats = seasonTotals[a.id];
      const bStats = seasonTotals[b.id];
      return (bStats?.pts ?? 0) - (aStats?.pts ?? 0);
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
          <div className="py-16 text-center text-sm" style={{ color: "var(--muted)" }}>
            No players on this roster yet. Add players from the{" "}
            <Link href={`/leagues/${id}`} className="underline">league page</Link>.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <th className="text-left px-4 py-3" style={{ color: "var(--muted)" }}>#</th>
                <th className="text-left px-4 py-3">Player</th>
                <th className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>GP</th>
                <th className="px-4 py-3 text-center font-bold" style={{ color: "var(--accent)" }}>PTS</th>
                <th className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>AST</th>
                <th className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>REB</th>
                <th className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>BLK</th>
                <th className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>STL</th>
                <th className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>PPG</th>
              </tr>
            </thead>
            <tbody>
              {rosterRows.map((player, i) => {
                const totals = seasonTotals[player.id];
                return (
                  <tr
                    key={player.id}
                    style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--accent)" }}>
                      {player.jerseyNumber !== undefined ? `#${player.jerseyNumber}` : ""}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {player.firstName} {player.lastName}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                      {totals?.gp ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--accent)" }}>
                      {totals ? totals.pts : "—"}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                      {totals ? totals.ast : "—"}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                      {totals ? totals.reb : "—"}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                      {totals ? totals.blk : "—"}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                      {totals ? totals.stl : "—"}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                      {totals && totals.gp > 0 ? (totals.pts / totals.gp).toFixed(1) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
