"use client";

import { useRoster } from "@/hooks/useRoster";
import { useTeamPlayers } from "@/hooks/useLeague";
import PlayerForm from "@/components/league/PlayerForm";
import { JerseyBadge } from "@/components/league/statCells";
import type { Team } from "@/types";

type RosterEditorProps = {
  leagueId: string;
  team: Team;
  onClose: () => void;
};

// Roster list with inline edit and an add form, for the overview's roster modal.
// Render with key={team.id} so switching teams starts from a clean state.
export default function RosterEditor({ leagueId, team, onClose }: RosterEditorProps) {
  const [players, setPlayers] = useTeamPlayers(team.id);
  const roster = useRoster(leagueId, team.id, players, setPlayers);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-lg font-bold">{team.name}</h2>
          <p className="text-xs text-muted">Roster</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close roster"
          className="cursor-pointer text-lg leading-none px-2 py-1 rounded-lg hover:opacity-70 text-muted bg-surface-2"
        >
          ✕
        </button>
      </div>

      {/* Player list */}
      <div className="overflow-y-auto flex-1 px-6 py-4">
        {players.length === 0 ? (
          <p className="text-sm text-center py-6 text-muted">No players yet. Add one below.</p>
        ) : (
          <div className="space-y-2">
            {players.map((p) =>
              roster.editing?.id === p.id ? (
                <div key={p.id} className="p-3 rounded-lg bg-surface-2 border border-accent">
                  <PlayerForm
                    layout="stacked"
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
                </div>
              ) : (
                <div key={p.id} className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg group bg-surface-2">
                  <span className="w-8 text-center shrink-0">
                    <JerseyBadge number={p.jerseyNumber} className="font-semibold" />
                  </span>
                  <span className="flex-1">
                    {p.firstName} {p.lastName}
                  </span>
                  <button
                    onClick={() => roster.startEdit(p)}
                    aria-label={`Edit ${p.firstName} ${p.lastName}`}
                    className="cursor-pointer opacity-60 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2 py-1 rounded text-xs text-muted bg-surface"
                  >
                    Edit
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Add player form */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-muted">Add a player</p>
        <PlayerForm
          layout="stacked"
          values={roster.addForm}
          onChange={roster.setAddForm}
          onSubmit={roster.add}
          submitting={roster.adding}
          submitLabel="Add"
          submittingLabel="Adding…"
          error={roster.addError}
        />
      </div>
    </>
  );
}
