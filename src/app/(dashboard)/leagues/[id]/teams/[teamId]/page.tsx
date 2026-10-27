"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPlayers } from "@/lib/firestore/leagues";
import type { Player } from "@/types";
import { useLeague } from "@/hooks/useLeague";
import { computeStandings } from "@/lib/standings";
import { getSportConfig } from "@/lib/sportConfig";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { computeSeasonTotals, perGame } from "@/lib/stats";
import { StatHeaderCells, StatValueCell } from "@/components/league/statCells";
import PlayerForm from "@/components/league/PlayerForm";
import { useRoster } from "@/hooks/useRoster";

export default function TeamDetailPage() {
  const { id, teamId } = useParams<{ id: string; teamId: string }>();
  const { league, teams, games } = useLeague();
  const [players, setPlayers] = useState<Player[]>([]);
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState<Player | null>(null);
  const roster = useRoster(id, teamId, players, setPlayers);

  useEffect(() => {
    getPlayers(id, teamId).then(setPlayers);
  }, [id, teamId]);

  async function handleDeletePlayer() {
    if (!confirmDeletePlayer) return;
    if (await roster.remove(confirmDeletePlayer)) setConfirmDeletePlayer(null);
  }

  const team = teams.find((t) => t.id === teamId) ?? null;

  const sportConfig = useMemo(
    () => getSportConfig(league.sport),
    [league.sport]
  );
  const statKeys = sportConfig.statKeys;

  const standings = useMemo(
    () => computeStandings(teams, games, league.scoringRules),
    [teams, games, league.scoringRules]
  );

  const teamStanding = standings.find((row) => row.team.id === teamId);

  // A player's stat lines only exist in their own team's games, so league-wide totals are this roster's.
  const seasonTotals = useMemo(() => computeSeasonTotals(games, statKeys), [games, statKeys]);

  const rosterRows = [...players].sort((a, b) => {
    const aStats = seasonTotals[a.id];
    const bStats = seasonTotals[b.id];
    return (bStats?.[sportConfig.primaryStat] ?? 0) - (aStats?.[sportConfig.primaryStat] ?? 0);
  });

  if (!team) {
    return (
      <div className="py-20 text-center text-muted">
        This team no longer exists.{" "}
        <Link href={`/leagues/${id}/teams`} className="underline">Back to teams</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/leagues/${id}/teams`} className="text-sm text-muted hover:underline">
          ← All teams
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mt-1">{team.name}</h2>
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
        </div>
      </div>

      <h3 className="font-semibold mb-3">Roster & Stats</h3>

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
                <StatHeaderCells sportConfig={sportConfig} className="px-4 py-3" />
                <th className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                  {sportConfig.computedStatLabel}
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rosterRows.map((player, i) => {
                const totals = seasonTotals[player.id];
                const isEditing = roster.editing?.id === player.id;
                const isDeleting = roster.removingId === player.id;
                const rowBg = i % 2 === 0 ? "var(--surface)" : "var(--surface-2)";

                if (isEditing) {
                  return (
                    <tr key={player.id} style={{ background: rowBg }}>
                      <td colSpan={statKeys.length + 5} className="px-4 py-3">
                        <PlayerForm
                          editing
                          values={roster.editForm}
                          onChange={roster.setEditForm}
                          onSubmit={roster.save}
                          onCancel={roster.cancelEdit}
                          submitting={roster.saving}
                          submitLabel="Save"
                          submittingLabel="Saving…"
                          error={roster.editError}
                        />
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={player.id} className="group" style={{ background: rowBg, opacity: isDeleting ? 0.4 : 1 }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--accent)" }}>
                      {player.jerseyNumber !== undefined ? `#${player.jerseyNumber}` : ""}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{player.firstName} {player.lastName}</span>
                        <button
                          onClick={() => roster.startEdit(player)}
                          className="cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2 py-0.5 rounded text-xs"
                          style={{ color: "var(--muted)", background: "var(--surface)" }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>{totals?.gp ?? 0}</td>
                    {statKeys.map((k) => (
                      <StatValueCell key={k} sportConfig={sportConfig} statKey={k} className="px-4 py-3">
                        {totals ? (totals[k] ?? 0) : "—"}
                      </StatValueCell>
                    ))}
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                      {perGame(totals, sportConfig.primaryStat)}
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
          <PlayerForm
            values={roster.addForm}
            onChange={roster.setAddForm}
            onSubmit={roster.add}
            submitting={roster.adding}
            submitLabel="Add"
            submittingLabel="Adding…"
            error={roster.addError}
          />
        </div>
      </div>
      {confirmDeletePlayer && (
        <ConfirmModal
          title="Remove player?"
          confirmLabel="Remove"
          busyLabel="Removing…"
          busy={roster.removingId === confirmDeletePlayer.id}
          onConfirm={handleDeletePlayer}
          onCancel={() => setConfirmDeletePlayer(null)}
        >
          <span className="text-foreground font-medium">
            {confirmDeletePlayer.firstName} {confirmDeletePlayer.lastName}
          </span>{" "}
          will be removed from this roster. This cannot be undone.
        </ConfirmModal>
      )}
    </div>
  );
}
