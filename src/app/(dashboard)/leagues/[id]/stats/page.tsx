"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPlayers, saveGameStatLines } from "@/lib/firestore/leagues";
import type { Game, Player } from "@/types";
import { useLeague } from "@/hooks/useLeague";
import { getSportConfig } from "@/lib/sportConfig";
import Spinner from "@/components/Spinner";
import { computeSeasonTotals, buildStatDraft, draftToStatLines, type StatDraft } from "@/lib/stats";
import StatGrid from "@/components/league/StatGrid";
import SeasonStatsTable from "@/components/league/SeasonStatsTable";

type PlayerInfo = { player: Player; teamName: string };

export default function StatsPage() {
  const { id } = useParams<{ id: string }>();
  const { league, teams, games, setGames } = useLeague();
  const [playerMap, setPlayerMap] = useState<Map<string, PlayerInfo>>(new Map());
  const [activeTab, setActiveTab] = useState<"season" | "game">("season");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [editingStats, setEditingStats] = useState(false);
  const [draftStats, setDraftStats] = useState<StatDraft>({});
  const [savingStats, setSavingStats] = useState(false);

  useEffect(() => {
    Promise.all(
      teams.map((team) => getPlayers(id, team.id).then((ps) => ({ team, players: ps })))
    ).then((allPlayers) => {
      const map = new Map<string, PlayerInfo>();
      for (const { team, players } of allPlayers) {
        for (const player of players) {
          map.set(player.id, { player, teamName: team.name });
        }
      }
      setPlayerMap(map);
    });
  }, [id, teams]);

  const sportConfig = useMemo(
    () => getSportConfig(league.sport),
    [league.sport]
  );
  const statKeys = sportConfig.statKeys;

  const playedGames = useMemo(
    () => games.filter((g) => g.status === "played"),
    [games]
  );

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? null,
    [games, selectedGameId]
  );

  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? tid;

  const seasonTotals = useMemo(() => computeSeasonTotals(games, statKeys), [games, statKeys]);

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
    setDraftStats(buildStatDraft(gamePlayers.map((r) => r.playerId), game, statKeys));
    setEditingStats(true);
  }

  async function handleSaveStats() {
    if (!selectedGame) return;
    setSavingStats(true);
    try {
      const statLines = draftToStatLines(draftStats, statKeys);
      await saveGameStatLines(id, selectedGame.id, statLines);
      setGames((prev) =>
        prev.map((g) => (g.id === selectedGame.id ? { ...g, statLines } : g))
      );
      setEditingStats(false);
    } finally {
      setSavingStats(false);
    }
  }

  const seasonRows = [...playerMap.values()];

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
          <SeasonStatsTable
            rows={seasonRows}
            totals={seasonTotals}
            sportConfig={sportConfig}
            emptyMessage="No players yet. Add players to teams from the league page."
          />
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
                          {savingStats ? <><Spinner /> Saving…</> : "Save Stats"}
                        </button>
                      </div>
                    )}
                  </div>

                  <StatGrid
                    rows={gamePlayers.map(({ info }) => info)}
                    game={selectedGame}
                    sportConfig={sportConfig}
                    editing={editingStats}
                    draft={draftStats}
                    onDraftChange={(playerId, k, value) =>
                      setDraftStats((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [k]: value } }))
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
