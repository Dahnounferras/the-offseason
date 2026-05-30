"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getLeague,
  getTeams,
  getGames,
  getPlayers,
  recordResult,
  updateResult,
  saveGameStatLines,
} from "@/lib/firestore/leagues";
import type { League, Team, Game, Player, StatLine } from "@/types";
import { getSportConfig } from "@/lib/sportConfig";

type DraftRow = Record<string, string>;

export default function GameDetailPage() {
  const { id, gameId } = useParams<{ id: string; gameId: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

  // Score state
  const [editingScore, setEditingScore] = useState(false);
  const [scoreForm, setScoreForm] = useState({ homeScore: "", awayScore: "", homeSport: "", awaySport: "" });
  const [savingScore, setSavingScore] = useState(false);

  // Stats state
  const [editingStats, setEditingStats] = useState(false);
  const [draftStats, setDraftStats] = useState<Record<string, DraftRow>>({});
  const [savingStats, setSavingStats] = useState(false);

  useEffect(() => {
    Promise.all([getLeague(id), getTeams(id), getGames(id)]).then(async ([l, t, g]) => {
      if (l) setLeague(l);
      setTeams(t);
      const found = g.find((gm) => gm.id === gameId) ?? null;
      setGame(found);
      if (found) {
        const [hp, ap] = await Promise.all([
          getPlayers(id, found.homeTeamId),
          getPlayers(id, found.awayTeamId),
        ]);
        setHomePlayers(hp.sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)));
        setAwayPlayers(ap.sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)));
      }
    });
  }, [id, gameId]);

  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? "—";

  // Open score form pre-filled for editing
  function openEditScore() {
    if (!game) return;
    setScoreForm({
      homeScore: game.homeScore !== undefined ? String(game.homeScore) : "",
      awayScore: game.awayScore !== undefined ? String(game.awayScore) : "",
      homeSport: game.homeSportsmanship !== undefined ? String(game.homeSportsmanship) : "",
      awaySport: game.awaySportsmanship !== undefined ? String(game.awaySportsmanship) : "",
    });
    setEditingScore(true);
  }

  async function handleSaveScore() {
    if (!game) return;
    const hs = Number(scoreForm.homeScore);
    const as = Number(scoreForm.awayScore);
    if (scoreForm.homeScore === "" || scoreForm.awayScore === "" || isNaN(hs) || isNaN(as)) return;
    const homeSport = scoreForm.homeSport ? Number(scoreForm.homeSport) : undefined;
    const awaySport = scoreForm.awaySport ? Number(scoreForm.awaySport) : undefined;
    setSavingScore(true);
    try {
      if (game.status === "played") {
        await updateResult(id, game.id, hs, as, homeSport, awaySport);
        setGame((g) => g ? { ...g, homeScore: hs, awayScore: as, homeSportsmanship: homeSport, awaySportsmanship: awaySport } : g);
      } else {
        await recordResult(id, game.id, hs, as, homeSport, awaySport);
        setGame((g) => g ? { ...g, status: "played", homeScore: hs, awayScore: as, homeSportsmanship: homeSport, awaySportsmanship: awaySport, playedAt: Date.now() } : g);
      }
      setEditingScore(false);
    } finally {
      setSavingScore(false);
    }
  }

  const allPlayers = useMemo(() => [...homePlayers, ...awayPlayers], [homePlayers, awayPlayers]);

  const sportConfig = useMemo(
    () => getSportConfig(league?.sport ?? "Basketball"),
    [league]
  );
  const statKeys = sportConfig.statKeys;

  function startEditStats() {
    if (!game) return;
    const draft: Record<string, DraftRow> = {};
    for (const p of allPlayers) {
      const existing = (game.statLines ?? []).find((sl) => sl.playerId === p.id);
      draft[p.id] = Object.fromEntries(
        statKeys.map((k) => [k, existing ? String(existing.stats[k] ?? 0) : ""])
      );
    }
    setDraftStats(draft);
    setEditingStats(true);
  }

  async function handleSaveStats() {
    if (!game) return;
    setSavingStats(true);
    try {
      const statLines: StatLine[] = Object.entries(draftStats).map(([playerId, row]) => ({
        playerId,
        stats: Object.fromEntries(statKeys.map((k) => [k, Number(row[k]) || 0])),
      }));
      await saveGameStatLines(id, game.id, statLines);
      setGame((g) => g ? { ...g, statLines } : g);
      setEditingStats(false);
    } finally {
      setSavingStats(false);
    }
  }

  function getStatValue(playerId: string, key: string): string | number {
    const sl = (game?.statLines ?? []).find((s) => s.playerId === playerId);
    if (!sl) return "—";
    return sl.stats[key] ?? 0;
  }

  const isPlayed = game?.status === "played";
  const leagueEnded = league?.status === "ended";

  if (!league || !game) {
    return <div className="py-20 text-center" style={{ color: "var(--muted)" }}>Loading…</div>;
  }

  const gameLabel = game.gameNumber ? `Game ${game.gameNumber}` : "Game";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>
          <Link href="/dashboard" className="hover:underline">My Leagues</Link>
          {" / "}
          <Link href={`/leagues/${id}`} className="hover:underline">{league.name}</Link>
          {" / "}
          <Link href={`/leagues/${id}/games`} className="hover:underline">Games</Link>
          {` / ${gameLabel}`}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{gameLabel}</h1>
          <Link
            href={`/leagues/${id}/games`}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          >
            ← Back to Games
          </Link>
        </div>
      </div>

      {/* Score section */}
      <div
        className="rounded-xl p-6 mb-8"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Score display */}
        {isPlayed && !editingScore ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-8">
              <span className="text-lg font-semibold">{teamName(game.homeTeamId)}</span>
              <span className="text-4xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                {game.homeScore} – {game.awayScore}
              </span>
              <span className="text-lg font-semibold">{teamName(game.awayTeamId)}</span>
            </div>
            {(game.homeSportsmanship || game.awaySportsmanship) && (
              <div className="flex gap-6 text-xs" style={{ color: "var(--muted)" }}>
                {game.homeSportsmanship && <span>Sportsmanship {teamName(game.homeTeamId)}: {game.homeSportsmanship}/5</span>}
                {game.awaySportsmanship && <span>Sportsmanship {teamName(game.awayTeamId)}: {game.awaySportsmanship}/5</span>}
              </div>
            )}
            {game.playedAt && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Played {new Date(game.playedAt).toLocaleDateString()}
              </p>
            )}
            {!leagueEnded && (
              <button
                onClick={openEditScore}
                className="cursor-pointer px-4 py-1.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                Edit Score
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {!isPlayed && (
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  Upcoming
                </span>
              </div>
            )}
            {/* Score inputs */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-base font-semibold w-36 text-right">{teamName(game.homeTeamId)}</span>
              <input
                type="number" min={0} placeholder="0"
                value={scoreForm.homeScore}
                onChange={(e) => setScoreForm({ ...scoreForm, homeScore: e.target.value })}
                className="w-20 px-3 py-2 rounded-lg text-lg text-center font-bold outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
              <span className="text-xl font-bold" style={{ color: "var(--muted)" }}>–</span>
              <input
                type="number" min={0} placeholder="0"
                value={scoreForm.awayScore}
                onChange={(e) => setScoreForm({ ...scoreForm, awayScore: e.target.value })}
                className="w-20 px-3 py-2 rounded-lg text-lg text-center font-bold outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
              <span className="text-base font-semibold w-36">{teamName(game.awayTeamId)}</span>
            </div>
            {/* Sportsmanship */}
            <div className="flex items-center justify-center gap-4 text-sm" style={{ color: "var(--muted)" }}>
              <span className="text-xs">Sportsmanship (optional)</span>
              <span className="text-xs">{teamName(game.homeTeamId)}</span>
              <select
                value={scoreForm.homeSport}
                onChange={(e) => setScoreForm({ ...scoreForm, homeSport: e.target.value })}
                className="px-2 py-1 rounded-lg text-xs outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                <option value="">—</option>
                {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-xs">{teamName(game.awayTeamId)}</span>
              <select
                value={scoreForm.awaySport}
                onChange={(e) => setScoreForm({ ...scoreForm, awaySport: e.target.value })}
                className="px-2 py-1 rounded-lg text-xs outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                <option value="">—</option>
                {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {/* Actions */}
            <div className="flex justify-center gap-3">
              {editingScore && (
                <button
                  onClick={() => setEditingScore(false)}
                  className="cursor-pointer px-4 py-2 rounded-lg text-sm"
                  style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSaveScore}
                disabled={savingScore || scoreForm.homeScore === "" || scoreForm.awayScore === ""}
                className="cursor-pointer px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                {savingScore ? "Saving…" : isPlayed ? "Save Score" : "Record Result"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats section */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Player Stats</h2>
        {!leagueEnded && (
          editingStats ? (
            <div className="flex gap-2">
              <button
                onClick={() => setEditingStats(false)}
                className="cursor-pointer px-3 py-1.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStats}
                disabled={savingStats}
                className="cursor-pointer px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                {savingStats ? "Saving…" : "Save Stats"}
              </button>
            </div>
          ) : (
            <button
              onClick={startEditStats}
              className="cursor-pointer px-4 py-1.5 rounded-lg text-sm font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--accent)", border: "1px solid var(--accent)" }}
            >
              {(game.statLines ?? []).length > 0 ? "Edit Stats" : "Enter Stats"}
            </button>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { label: teamName(game.homeTeamId), players: homePlayers },
          { label: teamName(game.awayTeamId), players: awayPlayers },
        ].map(({ label, players }) => (
          <div key={label} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div
              className="px-4 py-3 text-sm font-semibold"
              style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}
            >
              {label}
            </div>
            {players.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                No players on this roster.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--surface-2)" }}>
                    <th className="text-left px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>#</th>
                    <th className="text-left px-3 py-2 text-xs">Player</th>
                    {statKeys.map((k) => (
                      <th
                        key={k}
                        className="px-3 py-2 text-center text-xs"
                        style={{
                          color: k === sportConfig.primaryStat ? "var(--accent)" : "var(--muted)",
                          fontWeight: k === sportConfig.primaryStat ? 700 : 400,
                        }}
                      >
                        {sportConfig.statLabels[k]?.abbrev ?? k.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, i) => (
                    <tr
                      key={player.id}
                      style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}
                    >
                      <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--accent)" }}>
                        {player.jerseyNumber !== undefined ? `#${player.jerseyNumber}` : ""}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-xs">
                        {player.firstName} {player.lastName}
                      </td>
                      {editingStats
                        ? statKeys.map((k) => (
                            <td key={k} className="px-1 py-2 text-center">
                              <input
                                type="number" min={0} placeholder="0"
                                value={draftStats[player.id]?.[k] ?? ""}
                                onChange={(e) =>
                                  setDraftStats((prev) => ({
                                    ...prev,
                                    [player.id]: { ...prev[player.id], [k]: e.target.value },
                                  }))
                                }
                                className="w-12 px-1 py-1 rounded text-xs text-center outline-none"
                                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                              />
                            </td>
                          ))
                        : statKeys.map((k) => (
                            <td
                              key={k}
                              className="px-3 py-2.5 text-center text-xs"
                              style={{
                                color: k === sportConfig.primaryStat ? "var(--accent)" : "var(--muted)",
                                fontWeight: k === sportConfig.primaryStat ? 600 : 400,
                              }}
                            >
                              {getStatValue(player.id, k)}
                            </td>
                          ))
                      }
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
