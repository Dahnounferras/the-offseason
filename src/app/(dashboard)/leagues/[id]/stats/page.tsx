"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getLeague,
  getTeams,
  getGames,
  getPlayers,
  saveGameStatLines,
} from "@/lib/firestore/leagues";
import type { League, Team, Game, Player, StatLine } from "@/types";

type PlayerInfo = { player: Player; teamName: string };

const STAT_KEYS = ["pts", "ast", "reb", "blk", "stl"] as const;
type StatKey = (typeof STAT_KEYS)[number];
type DraftRow = Record<StatKey, string>;

export default function StatsPage() {
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [playerMap, setPlayerMap] = useState<Map<string, PlayerInfo>>(new Map());
  const [activeTab, setActiveTab] = useState<"season" | "game">("season");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [editingStats, setEditingStats] = useState(false);
  const [draftStats, setDraftStats] = useState<Record<string, DraftRow>>({});
  const [savingStats, setSavingStats] = useState(false);

  useEffect(() => {
    Promise.all([getLeague(id), getTeams(id), getGames(id)]).then(async ([l, t, g]) => {
      if (l) setLeague(l);
      setTeams(t);
      setGames(g.sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0)));
      const allPlayers = await Promise.all(
        t.map((team) => getPlayers(id, team.id).then((ps) => ({ team, players: ps })))
      );
      const map = new Map<string, PlayerInfo>();
      for (const { team, players } of allPlayers) {
        for (const player of players) {
          map.set(player.id, { player, teamName: team.name });
        }
      }
      setPlayerMap(map);
    });
  }, [id]);

  const playedGames = useMemo(
    () => games.filter((g) => g.status === "played"),
    [games]
  );

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? null,
    [games, selectedGameId]
  );

  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? tid;

  const seasonTotals = useMemo(() => {
    const totals: Record<string, { pts: number; ast: number; reb: number; blk: number; stl: number; gp: number }> = {};
    for (const game of playedGames) {
      for (const sl of game.statLines ?? []) {
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
  }, [playedGames]);

  const gamePlayers = useMemo(() => {
    if (!selectedGame) return [] as { playerId: string; info: PlayerInfo }[];
    return [...playerMap.entries()]
      .filter(
        ([, info]) =>
          info.player.teamId === selectedGame.homeTeamId ||
          info.player.teamId === selectedGame.awayTeamId
      )
      .map(([pid, info]) => ({ playerId: pid, info }))
      .sort((a, b) => {
        if (a.info.player.teamId !== b.info.player.teamId) {
          return a.info.player.teamId === selectedGame.homeTeamId ? -1 : 1;
        }
        return (a.info.player.jerseyNumber ?? 999) - (b.info.player.jerseyNumber ?? 999);
      });
  }, [selectedGame, playerMap]);

  function startEditStats(game: Game) {
    const draft: Record<string, DraftRow> = {};
    for (const { playerId } of gamePlayers) {
      const existing = (game.statLines ?? []).find((sl) => sl.playerId === playerId);
      draft[playerId] = {
        pts: existing ? String(existing.stats.pts ?? 0) : "",
        ast: existing ? String(existing.stats.ast ?? 0) : "",
        reb: existing ? String(existing.stats.reb ?? 0) : "",
        blk: existing ? String(existing.stats.blk ?? 0) : "",
        stl: existing ? String(existing.stats.stl ?? 0) : "",
      };
    }
    setDraftStats(draft);
    setEditingStats(true);
  }

  async function handleSaveStats() {
    if (!selectedGame) return;
    setSavingStats(true);
    try {
      const statLines: StatLine[] = Object.entries(draftStats).map(([playerId, row]) => ({
        playerId,
        stats: {
          pts: Number(row.pts) || 0,
          ast: Number(row.ast) || 0,
          reb: Number(row.reb) || 0,
          blk: Number(row.blk) || 0,
          stl: Number(row.stl) || 0,
        },
      }));
      await saveGameStatLines(id, selectedGame.id, statLines);
      setGames((prev) =>
        prev.map((g) => (g.id === selectedGame.id ? { ...g, statLines } : g))
      );
      setEditingStats(false);
    } finally {
      setSavingStats(false);
    }
  }

  const seasonRows = [...playerMap.entries()]
    .map(([pid, info]) => ({
      pid,
      info,
      totals: seasonTotals[pid] ?? { pts: 0, ast: 0, reb: 0, blk: 0, stl: 0, gp: 0 },
    }))
    .sort((a, b) => b.totals.pts - a.totals.pts);

  if (!league) {
    return (
      <div className="py-20 text-center" style={{ color: "var(--muted)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>
          <Link href="/dashboard" className="hover:underline">
            My Leagues
          </Link>
          {" / "}
          <Link href={`/leagues/${id}`} className="hover:underline">
            {league.name}
          </Link>
          {" / Stats"}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Player Stats</h1>
          <Link
            href={`/leagues/${id}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: "var(--surface-2)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            ← Back to League
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: "var(--surface-2)" }}
      >
        {(["season", "game"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="cursor-pointer px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={
              activeTab === tab
                ? { background: "var(--accent)", color: "#000" }
                : { color: "var(--muted)" }
            }
          >
            {tab === "season" ? "Season Stats" : "Game Log"}
          </button>
        ))}
      </div>

      {/* Season Stats Tab */}
      {activeTab === "season" && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-left px-4 py-3">Team</th>
                <th
                  className="px-4 py-3 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  GP
                </th>
                <th
                  className="px-4 py-3 text-center font-bold"
                  style={{ color: "var(--accent)" }}
                >
                  PTS
                </th>
                <th
                  className="px-4 py-3 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  AST
                </th>
                <th
                  className="px-4 py-3 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  REB
                </th>
                <th
                  className="px-4 py-3 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  BLK
                </th>
                <th
                  className="px-4 py-3 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  STL
                </th>
                <th
                  className="px-4 py-3 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  PPG
                </th>
              </tr>
            </thead>
            <tbody>
              {seasonRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-10"
                    style={{ color: "var(--muted)" }}
                  >
                    No players yet. Add players to teams from the league page.
                  </td>
                </tr>
              ) : (
                seasonRows.map(({ pid, info, totals }, i) => (
                  <tr
                    key={pid}
                    style={{
                      background:
                        i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                    }}
                  >
                    <td className="px-4 py-3 font-medium">
                      {info.player.jerseyNumber !== undefined && (
                        <span
                          className="font-mono text-xs mr-2"
                          style={{ color: "var(--accent)" }}
                        >
                          #{info.player.jerseyNumber}
                        </span>
                      )}
                      {info.player.firstName} {info.player.lastName}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--muted)" }}
                    >
                      {info.teamName}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      style={{ color: "var(--muted)" }}
                    >
                      {totals.gp}
                    </td>
                    <td
                      className="px-4 py-3 text-center font-bold"
                      style={{ color: "var(--accent)" }}
                    >
                      {totals.pts}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      style={{ color: "var(--muted)" }}
                    >
                      {totals.ast}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      style={{ color: "var(--muted)" }}
                    >
                      {totals.reb}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      style={{ color: "var(--muted)" }}
                    >
                      {totals.blk}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      style={{ color: "var(--muted)" }}
                    >
                      {totals.stl}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      style={{ color: "var(--muted)" }}
                    >
                      {totals.gp > 0
                        ? (totals.pts / totals.gp).toFixed(1)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Game Log Tab */}
      {activeTab === "game" && (
        <div>
          {playedGames.length === 0 ? (
            <div
              className="rounded-xl p-10 text-center text-sm"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              No completed games yet.{" "}
              <Link href={`/leagues/${id}/games`} className="underline">
                Go to games
              </Link>{" "}
              to record results.
            </div>
          ) : (
            <>
              {/* Game selector */}
              <div className="mb-4 flex items-center gap-3">
                <label
                  className="text-sm shrink-0"
                  style={{ color: "var(--muted)" }}
                >
                  Game
                </label>
                <select
                  value={selectedGameId ?? ""}
                  onChange={(e) => {
                    setSelectedGameId(e.target.value || null);
                    setEditingStats(false);
                  }}
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  <option value="">Select a game…</option>
                  {playedGames.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.gameNumber ? `Game ${g.gameNumber} — ` : ""}
                      {teamName(g.homeTeamId)} {g.homeScore} – {g.awayScore}{" "}
                      {teamName(g.awayTeamId)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGame && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {/* Game header row */}
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{
                      background: "var(--surface-2)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div className="text-sm font-medium">
                      {selectedGame.gameNumber
                        ? `Game ${selectedGame.gameNumber} · `
                        : ""}
                      {teamName(selectedGame.homeTeamId)}{" "}
                      <span style={{ color: "var(--accent)" }}>
                        {selectedGame.homeScore} – {selectedGame.awayScore}
                      </span>{" "}
                      {teamName(selectedGame.awayTeamId)}
                    </div>
                    {!editingStats ? (
                      <button
                        onClick={() => startEditStats(selectedGame)}
                        className="cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold"
                        style={{
                          background: "var(--surface)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent)",
                        }}
                      >
                        {(selectedGame.statLines ?? []).length > 0
                          ? "Edit Stats"
                          : "Enter Stats"}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingStats(false)}
                          className="cursor-pointer px-3 py-1 rounded-lg text-xs"
                          style={{
                            background: "var(--surface)",
                            color: "var(--muted)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveStats}
                          disabled={savingStats}
                          className="cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                          style={{ background: "var(--accent)", color: "#000" }}
                        >
                          {savingStats ? "Saving…" : "Save Stats"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stats table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--surface-2)" }}>
                        <th
                          className="text-left px-4 py-2 font-medium"
                          style={{ color: "var(--muted)" }}
                        >
                          Player
                        </th>
                        <th
                          className="text-left px-4 py-2 font-medium"
                          style={{ color: "var(--muted)" }}
                        >
                          Team
                        </th>
                        <th
                          className="px-4 py-2 text-center font-bold"
                          style={{ color: "var(--accent)" }}
                        >
                          PTS
                        </th>
                        <th
                          className="px-4 py-2 text-center font-medium"
                          style={{ color: "var(--muted)" }}
                        >
                          AST
                        </th>
                        <th
                          className="px-4 py-2 text-center font-medium"
                          style={{ color: "var(--muted)" }}
                        >
                          REB
                        </th>
                        <th
                          className="px-4 py-2 text-center font-medium"
                          style={{ color: "var(--muted)" }}
                        >
                          BLK
                        </th>
                        <th
                          className="px-4 py-2 text-center font-medium"
                          style={{ color: "var(--muted)" }}
                        >
                          STL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {gamePlayers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-8"
                            style={{ color: "var(--muted)" }}
                          >
                            No players found for these teams.
                          </td>
                        </tr>
                      ) : (
                        gamePlayers.map(({ playerId, info }, i) => {
                          const existingSl = (
                            selectedGame.statLines ?? []
                          ).find((sl) => sl.playerId === playerId);
                          return (
                            <tr
                              key={playerId}
                              style={{
                                background:
                                  i % 2 === 0
                                    ? "var(--surface)"
                                    : "var(--surface-2)",
                              }}
                            >
                              <td className="px-4 py-2.5 font-medium">
                                {info.player.jerseyNumber !== undefined && (
                                  <span
                                    className="font-mono text-xs mr-2"
                                    style={{ color: "var(--accent)" }}
                                  >
                                    #{info.player.jerseyNumber}
                                  </span>
                                )}
                                {info.player.firstName} {info.player.lastName}
                              </td>
                              <td
                                className="px-4 py-2.5"
                                style={{ color: "var(--muted)" }}
                              >
                                {info.teamName}
                              </td>
                              {editingStats
                                ? STAT_KEYS.map((k) => (
                                    <td
                                      key={k}
                                      className="px-2 py-2 text-center"
                                    >
                                      <input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={draftStats[playerId]?.[k] ?? ""}
                                        onChange={(e) =>
                                          setDraftStats((prev) => ({
                                            ...prev,
                                            [playerId]: {
                                              ...prev[playerId],
                                              [k]: e.target.value,
                                            },
                                          }))
                                        }
                                        className="w-14 px-1 py-1 rounded text-sm text-center outline-none"
                                        style={{
                                          background: "var(--surface-2)",
                                          border: "1px solid var(--border)",
                                          color: "var(--foreground)",
                                        }}
                                      />
                                    </td>
                                  ))
                                : STAT_KEYS.map((k) => (
                                    <td
                                      key={k}
                                      className="px-4 py-2.5 text-center"
                                      style={{
                                        color:
                                          k === "pts"
                                            ? "var(--accent)"
                                            : "var(--muted)",
                                        fontWeight: k === "pts" ? 600 : 400,
                                      }}
                                    >
                                      {existingSl
                                        ? (existingSl.stats[k] ?? 0)
                                        : "—"}
                                    </td>
                                  ))}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
