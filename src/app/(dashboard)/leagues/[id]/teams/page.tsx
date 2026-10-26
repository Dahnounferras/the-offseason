"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getTeams, addTeam, deleteTeam } from "@/lib/firestore/leagues";
import type { Team } from "@/types";
import { useLeague } from "@/hooks/useLeague";
import { computeStandings } from "@/lib/standings";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StandingsTable from "@/components/league/StandingsTable";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function TeamsPage() {
  const { id } = useParams<{ id: string }>();
  const { league, teams, games, setTeams, setGames } = useLeague();
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<Team | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [deletingModal, setDeletingModal] = useState(false);

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
    setDeletingModal(true);
    setDeletingTeamId(confirmDeleteTeam.id);
    try {
      await deleteTeam(id, confirmDeleteTeam.id);
      const teamId = confirmDeleteTeam.id;
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      // deleteTeam also deleted every game this team played.
      setGames((prev) => prev.filter((g) => g.homeTeamId !== teamId && g.awayTeamId !== teamId));
      setConfirmDeleteTeam(null);
    } finally {
      setDeletingTeamId(null);
      setDeletingModal(false);
    }
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
          <StandingsTable
            rows={standings}
            leagueId={id}
            variant="compact"
            dimmedTeamId={deletingTeamId}
            actions={(row) => (
              <>
                <Link
                  href={`/leagues/${id}/teams/${row.team.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 text-muted border border-border"
                >
                  Roster & Stats ›
                </Link>
                <button
                  onClick={() => setConfirmDeleteTeam(row.team)}
                  disabled={deletingTeamId === row.team.id}
                  className="cursor-pointer p-1.5 rounded-lg disabled:opacity-30 hover:opacity-70 transition-opacity text-loss"
                  title="Delete team"
                  aria-label={`Delete ${row.team.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </>
            )}
          />
        )}

        {/* Add team form */}
        <div className="px-4 py-4" style={{ borderTop: standings.length > 0 ? "1px solid var(--border)" : undefined }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
            Add a team
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
              className="flex-1"
            />
            <Button
              onClick={handleAddTeam}
              disabled={!newTeamName.trim()}
              loading={addingTeam}
              loadingText="Adding…"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
      {confirmDeleteTeam && (
        <ConfirmModal
          title="Delete team?"
          confirmLabel="Delete"
          busyLabel="Deleting…"
          busy={deletingModal}
          onConfirm={handleDeleteTeam}
          onCancel={() => setConfirmDeleteTeam(null)}
        >
          <span className="text-foreground font-medium">{confirmDeleteTeam.name}</span>{" "}
          will be permanently removed, along with its roster and every game it plays in. This cannot be undone.
        </ConfirmModal>
      )}
    </div>
  );
}
