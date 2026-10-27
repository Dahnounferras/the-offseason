"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  recordResult,
  updateResult,
  saveGameStatLines,
  updateGameDetails,
} from "@/lib/firestore/leagues";
import type { Game } from "@/types";
import { useLeague } from "@/hooks/useLeague";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/errors";
import { getSportConfig } from "@/lib/sportConfig";
import { buildStatDraft, draftToStatLines, type StatDraft } from "@/lib/stats";
import { parseScoreInput, toDateTimeLocal, fromDateTimeLocal, formatGameWhen } from "@/lib/games";
import StatGrid from "@/components/league/StatGrid";
import { sortByJersey } from "@/lib/roster";
import Button from "@/components/ui/Button";
import Input, { inputClasses } from "@/components/ui/Input";

export default function GameDetailPage() {
  const { id, gameId } = useParams<{ id: string; gameId: string }>();
  const { league, teams, games, players, setGames } = useLeague();
  const toast = useToast();
  const game = games.find((g) => g.id === gameId) ?? null;
  const homePlayers = useMemo(() => (game ? sortByJersey(players[game.homeTeamId] ?? []) : []), [players, game]);
  const awayPlayers = useMemo(() => (game ? sortByJersey(players[game.awayTeamId] ?? []) : []), [players, game]);

  // Score state
  const [editingScore, setEditingScore] = useState(false);
  const [scoreForm, setScoreForm] = useState({ homeScore: "", awayScore: "", homeSport: "", awaySport: "" });
  const [savingScore, setSavingScore] = useState(false);

  // Date & location state
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({ when: "", location: "" });
  const [savingDetails, setSavingDetails] = useState(false);

  // Stats state
  const [editingStats, setEditingStats] = useState(false);
  const [draftStats, setDraftStats] = useState<StatDraft>({});
  const [savingStats, setSavingStats] = useState(false);

  // Writes land in the shared games list so the games, stats and standings tabs see them too.
  function patchGame(patch: Partial<Game>) {
    setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, ...patch } : g)));
  }

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

  const parsedScore = parseScoreInput(scoreForm.homeScore, scoreForm.awayScore);

  async function handleSaveScore(e: React.FormEvent) {
    e.preventDefault();
    if (!game || !parsedScore) return;
    const { home: hs, away: as } = parsedScore;
    const homeSport = scoreForm.homeSport ? Number(scoreForm.homeSport) : undefined;
    const awaySport = scoreForm.awaySport ? Number(scoreForm.awaySport) : undefined;
    setSavingScore(true);
    try {
      if (game.status === "played") {
        await updateResult(id, game.id, hs, as, homeSport, awaySport);
        patchGame({ homeScore: hs, awayScore: as, homeSportsmanship: homeSport, awaySportsmanship: awaySport });
      } else {
        const playedAt = await recordResult(id, game.id, hs, as, homeSport, awaySport);
        patchGame({ status: "played", homeScore: hs, awayScore: as, homeSportsmanship: homeSport, awaySportsmanship: awaySport, playedAt });
      }
      setEditingScore(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingScore(false);
    }
  }

  function openEditDetails() {
    if (!game) return;
    setDetailsForm({ when: toDateTimeLocal(game.scheduledAt), location: game.location ?? "" });
    setEditingDetails(true);
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!game) return;
    const details = {
      scheduledAt: fromDateTimeLocal(detailsForm.when),
      location: detailsForm.location.trim() || undefined,
    };
    setSavingDetails(true);
    try {
      await updateGameDetails(id, game.id, details);
      patchGame(details);
      setEditingDetails(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingDetails(false);
    }
  }

  const allPlayers = useMemo(() => [...homePlayers, ...awayPlayers], [homePlayers, awayPlayers]);

  const sportConfig = useMemo(
    () => getSportConfig(league.sport),
    [league]
  );
  const statKeys = sportConfig.statKeys;

  function startEditStats() {
    if (!game) return;
    setDraftStats(buildStatDraft(allPlayers.map((p) => p.id), game, statKeys));
    setEditingStats(true);
  }

  async function handleSaveStats() {
    if (!game) return;
    setSavingStats(true);
    try {
      const statLines = draftToStatLines(draftStats, statKeys);
      await saveGameStatLines(id, game.id, statLines);
      patchGame({ statLines });
      setEditingStats(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingStats(false);
    }
  }

  const isPlayed = game?.status === "played";
  const leagueEnded = league.status === "ended";

  if (!game) {
    return (
      <div className="py-20 text-center text-muted">
        This game no longer exists.{" "}
        <Link href={`/leagues/${id}/games`} className="underline">Back to games</Link>
      </div>
    );
  }

  const gameLabel = game.gameNumber ? `Game ${game.gameNumber}` : "Game";
  const homeName = teamName(game.homeTeamId);
  const awayName = teamName(game.awayTeamId);

  return (
    <div>
      <div className="mb-6">
        <Link href={`/leagues/${id}/games`} className="text-sm text-muted hover:underline">
          ← All games
        </Link>
        <h2 className="text-xl font-bold mt-1">{gameLabel}</h2>
      </div>

      {/* Score section */}
      <div className="rounded-xl p-4 sm:p-6 mb-4 bg-surface border border-border">
        {isPlayed && !editingScore ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-8 text-center">
              <span className="text-lg font-semibold">{homeName}</span>
              <span className="text-4xl font-bold tabular-nums text-accent">
                {game.homeScore} – {game.awayScore}
              </span>
              <span className="text-lg font-semibold">{awayName}</span>
            </div>
            {(game.homeSportsmanship || game.awaySportsmanship) && (
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-muted">
                {game.homeSportsmanship && <span>Sportsmanship {homeName}: {game.homeSportsmanship}/5</span>}
                {game.awaySportsmanship && <span>Sportsmanship {awayName}: {game.awaySportsmanship}/5</span>}
              </div>
            )}
            {game.playedAt && (
              <p className="text-xs text-muted">
                Played {new Date(game.playedAt).toLocaleDateString()}
              </p>
            )}
            {!leagueEnded && (
              <Button variant="ghost" size="sm" onClick={openEditScore}>Edit Score</Button>
            )}
          </div>
        ) : leagueEnded ? (
          <p className="text-sm text-center text-muted">
            No result was recorded before the season ended.
          </p>
        ) : (
          <form onSubmit={handleSaveScore} className="flex flex-col gap-4">
            {!isPlayed && (
              <span className="self-start text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 text-muted border border-border">
                Upcoming
              </span>
            )}
            {/* Score inputs: stacked on phones, side by side from sm up */}
            <div className="grid grid-cols-[1fr_auto] sm:flex items-center justify-center gap-3 sm:gap-4">
              <label htmlFor="home-score" className="text-base font-semibold sm:w-36 sm:text-right">{homeName}</label>
              <Input
                id="home-score"
                type="number" min={0} inputMode="numeric" placeholder="0"
                value={scoreForm.homeScore}
                onChange={(e) => setScoreForm({ ...scoreForm, homeScore: e.target.value })}
                className="w-20 text-lg text-center font-bold"
              />
              <span aria-hidden="true" className="hidden sm:inline text-xl font-bold text-muted">–</span>
              <label htmlFor="away-score" className="text-base font-semibold sm:w-36 sm:order-last">{awayName}</label>
              <Input
                id="away-score"
                type="number" min={0} inputMode="numeric" placeholder="0"
                value={scoreForm.awayScore}
                onChange={(e) => setScoreForm({ ...scoreForm, awayScore: e.target.value })}
                className="w-20 text-lg text-center font-bold"
              />
            </div>
            {/* Sportsmanship */}
            <fieldset className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted">
              <legend className="sr-only">Sportsmanship (optional)</legend>
              <span aria-hidden="true">Sportsmanship (optional)</span>
              {([
                ["homeSport", homeName],
                ["awaySport", awayName],
              ] as const).map(([key, name]) => (
                <label key={key} className="flex items-center gap-2">
                  {name}
                  <select
                    value={scoreForm[key]}
                    onChange={(e) => setScoreForm({ ...scoreForm, [key]: e.target.value })}
                    className={`${inputClasses("default", true)} text-xs`}
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              ))}
            </fieldset>
            {/* Actions */}
            <div className="flex justify-center gap-3">
              {editingScore && (
                <Button variant="ghost" onClick={() => setEditingScore(false)}>Cancel</Button>
              )}
              <Button type="submit" disabled={!parsedScore} loading={savingScore} loadingText="Saving…" className="px-6">
                {isPlayed ? "Save Score" : "Record Result"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Date & location */}
      <div className="rounded-xl px-4 sm:px-6 py-4 mb-8 bg-surface border border-border">
        {editingDetails ? (
          <form onSubmit={handleSaveDetails} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label htmlFor="game-when" className="block text-xs text-muted mb-1">Date & time</label>
              <Input
                id="game-when"
                type="datetime-local"
                value={detailsForm.when}
                onChange={(e) => setDetailsForm({ ...detailsForm, when: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="game-location" className="block text-xs text-muted mb-1">Location</label>
              <Input
                id="game-location"
                type="text"
                placeholder="e.g. Court 2"
                value={detailsForm.location}
                onChange={(e) => setDetailsForm({ ...detailsForm, location: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditingDetails(false)}>Cancel</Button>
              <Button type="submit" loading={savingDetails} loadingText="Saving…">Save</Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                <span className="text-muted">When: </span>
                {game.scheduledAt ? formatGameWhen(game.scheduledAt) : <span className="text-muted">Not set</span>}
              </span>
              <span>
                <span className="text-muted">Where: </span>
                {game.location || <span className="text-muted">Not set</span>}
              </span>
            </div>
            {!leagueEnded && (
              <Button variant="ghost" size="sm" onClick={openEditDetails}>
                {game.scheduledAt || game.location ? "Edit" : "Add date & location"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats section */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Player Stats</h3>
        {!leagueEnded && (
          editingStats ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingStats(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveStats} loading={savingStats} loadingText="Saving…">
                Save Stats
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={startEditStats}>
              {(game.statLines ?? []).length > 0 ? "Edit Stats" : "Enter Stats"}
            </Button>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { label: homeName, players: homePlayers },
          { label: awayName, players: awayPlayers },
        ].map(({ label, players }) => (
          <div key={label} className="rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-3 text-sm font-semibold bg-surface-2 border-b border-border">
              {label}
            </div>
            {players.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">
                No players on this roster.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <StatGrid
                  rows={players.map((player) => ({ player }))}
                  game={game}
                  sportConfig={sportConfig}
                  editing={editingStats}
                  draft={draftStats}
                  onDraftChange={(playerId, k, value) =>
                    setDraftStats((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [k]: value } }))
                  }
                  dense
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
