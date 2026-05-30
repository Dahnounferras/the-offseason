"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLeague, getTeams, getGames } from "@/lib/firestore/leagues";
import type { League, Team, Game } from "@/types";

export default function GamesPage() {
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    Promise.all([getLeague(id), getTeams(id), getGames(id)]).then(([l, t, g]) => {
      if (l) setLeague(l);
      setTeams(t);
      setGames(g.sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0)));
    });
  }, [id]);

  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? tid;

  if (!league) return <div className="py-20 text-center" style={{ color: "var(--muted)" }}>Loading…</div>;

  const scheduled = games.filter((g) => g.status === "scheduled");
  const played = games.filter((g) => g.status === "played" || !g.status).sort((a, b) => (b.gameNumber ?? 0) - (a.gameNumber ?? 0));

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>
          <Link href="/dashboard" className="hover:underline">My Leagues</Link>
          {" / "}
          <Link href={`/leagues/${id}`} className="hover:underline">{league.name}</Link>
          {" / Games"}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Games</h1>
          <Link
            href={`/leagues/${id}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          >
            ← Back to League
          </Link>
        </div>
        {league.status === "ended" && (
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            This season has ended.{" "}
            <Link href={`/leagues/${id}`} className="underline">Reactivate the league</Link>
            {" "}to enter or edit results.
          </p>
        )}
      </div>

      {games.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          No schedule yet.{" "}
          <Link href={`/leagues/${id}`} className="underline">Go to the league page</Link>{" "}
          to start the league and generate a schedule.
        </div>
      ) : (
        <>
          {scheduled.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold mb-3">Upcoming</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {scheduled.map((g, i) => (
                  <Link
                    key={g.id}
                    href={`/leagues/${id}/games/${g.id}`}
                    className="px-4 py-3 flex items-center gap-3 text-sm hover:opacity-80 transition-opacity"
                    style={{
                      display: "flex",
                      background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                      borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                    }}
                  >
                    <span className="text-xs font-mono shrink-0" style={{ color: "var(--muted)" }}>
                      Game {g.gameNumber}
                    </span>
                    <span className="flex-1 font-medium">{teamName(g.homeTeamId)}</span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>vs</span>
                    <span className="flex-1 font-medium text-right">{teamName(g.awayTeamId)}</span>
                    {league.status !== "ended" && (
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-semibold shrink-0"
                        style={{ background: "var(--surface-2)", color: "var(--accent)", border: "1px solid var(--accent)" }}
                      >
                        Enter Result
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {played.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Completed</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {played.map((g, i) => (
                  <Link
                    key={g.id}
                    href={`/leagues/${id}/games/${g.id}`}
                    className="px-4 py-3 flex items-center gap-3 text-sm hover:opacity-80 transition-opacity"
                    style={{
                      display: "flex",
                      background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                      borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                    }}
                  >
                    <span className="text-xs font-mono shrink-0" style={{ color: "var(--muted)" }}>
                      {g.gameNumber ? `Game ${g.gameNumber}` : "—"}
                    </span>
                    <span className="flex-1 font-medium">{teamName(g.homeTeamId)}</span>
                    <span className="font-bold tabular-nums">
                      {g.homeScore} – {g.awayScore}
                    </span>
                    <span className="flex-1 font-medium text-right">{teamName(g.awayTeamId)}</span>
                    {g.playedAt && (
                      <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>
                        {new Date(g.playedAt).toLocaleDateString()}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
