"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLeague, getTeams, getGames, addTeam, getBracket, getPlayers, addPlayer, updatePlayer, scheduleGames, endLeague, deleteLeague, reactivateLeague, resetLeague } from "@/lib/firestore/leagues";
import type { League, Team, Game, Bracket, Player } from "@/types";
import { generateSchedule } from "@/lib/schedule";
import { computeStandings } from "@/lib/standings";
import Spinner from "@/components/Spinner";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StandingsTable from "@/components/league/StandingsTable";
import BracketView from "@/components/league/BracketView";

export default function LeaguePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [rosterTeam, setRosterTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerForm, setPlayerForm] = useState({ firstName: "", lastName: "", jerseyNumber: "" });
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", jerseyNumber: "" });
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    Promise.all([getLeague(id), getTeams(id), getGames(id), getBracket(id)]).then(([l, t, g, b]) => {
      if (l) setLeague(l);
      setTeams(t);
      setGames(g);
      setBracket(b);
    });
  }, [id]);

  async function handleAddTeam() {
    if (!newTeamName.trim()) return;
    setAddingTeam(true);
    await addTeam(id, newTeamName.trim());
    const updated = await getTeams(id);
    setTeams(updated);
    setNewTeamName("");
    setAddingTeam(false);
  }

  async function openRoster(team: Team) {
    setRosterTeam(team);
    setPlayerForm({ firstName: "", lastName: "", jerseyNumber: "" });
    const fetched = await getPlayers(id, team.id);
    setPlayers(fetched);
  }

  async function handleAddPlayer() {
    if (!rosterTeam || !playerForm.firstName.trim() || !playerForm.lastName.trim()) return;
    setAddingPlayer(true);
    try {
      const playerData: Parameters<typeof addPlayer>[2] = {
        firstName: playerForm.firstName.trim(),
        lastName: playerForm.lastName.trim(),
        teamId: rosterTeam.id,
      };
      if (playerForm.jerseyNumber.trim()) {
        playerData.jerseyNumber = Number(playerForm.jerseyNumber);
      }
      await addPlayer(id, rosterTeam.id, playerData);
      const updated = await getPlayers(id, rosterTeam.id);
      setPlayers(updated);
      setPlayerForm({ firstName: "", lastName: "", jerseyNumber: "" });
    } finally {
      setAddingPlayer(false);
    }
  }

  async function handleSavePlayer() {
    if (!rosterTeam || !editingPlayer || !editForm.firstName.trim() || !editForm.lastName.trim()) return;
    setSavingPlayer(true);
    try {
      const clearJersey = !editForm.jerseyNumber.trim() && editingPlayer.jerseyNumber !== undefined;
      const data: Parameters<typeof updatePlayer>[3] = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
      };
      if (editForm.jerseyNumber.trim()) {
        data.jerseyNumber = Number(editForm.jerseyNumber);
      }
      await updatePlayer(id, rosterTeam.id, editingPlayer.id, data, clearJersey);
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== editingPlayer.id) return p;
          const next = { ...p, ...data };
          if (clearJersey) delete next.jerseyNumber;
          return next;
        })
      );
      setEditingPlayer(null);
    } finally {
      setSavingPlayer(false);
    }
  }

  async function handleStartLeague() {
    if (!league || teams.length < 2) return;
    setStarting(true);
    try {
      const matchups = generateSchedule(teams.map((t) => t.id), league.season.totalGames);
      await scheduleGames(id, matchups.map((m, i) => ({ ...m, gameNumber: i + 1 })));
      const updated = await getGames(id);
      setGames(updated);
    } finally {
      setStarting(false);
    }
  }

  async function handleEndSeason() {
    setActioning(true);
    await endLeague(id);
    router.push("/dashboard");
  }

  async function handleDeleteLeague() {
    setActioning(true);
    await deleteLeague(id);
    router.push("/dashboard");
  }

  async function handleReset() {
    setActioning(true);
    await resetLeague(id);
    const updated = await getGames(id);
    setGames(updated);
    setBracket(null);
    setActioning(false);
    setShowResetModal(false);
  }

  async function handleReactivate() {
    setActioning(true);
    await reactivateLeague(id);
    setLeague((l) => l ? { ...l, status: "active" } : l);
    setActioning(false);
    setShowReactivateModal(false);
  }

  if (!league) {
    return <div className="flex items-center justify-center py-20" style={{ color: "var(--muted)" }}>Loading…</div>;
  }

  const standings = computeStandings(teams, games, league.scoringRules);

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>
          <Link href="/dashboard" className="hover:underline">My Leagues</Link> / {league.name}
        </div>
        <div className="flex items-start justify-between gap-6">
          {/* Left: title + metadata */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">{league.name}</h1>
            {league.status === "ended" && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-md self-start"
                style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                Season Ended
              </span>
            )}
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              <span style={{ color: "var(--accent)" }}>{league.sport}</span>
              {games.length > 0 && (
                <> &bull; {games.filter((g) => g.status === "played").length} / {league.season.totalGames} games played</>
              )}
            </p>
          </div>

          {/* Right: two rows of buttons */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Row 1: primary actions */}
            <div className="flex gap-2 items-center">
              {games.length === 0 && league.status !== "ended" && teams.length >= 2 && (
                <button
                  onClick={handleStartLeague}
                  disabled={starting}
                  className="cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#000" }}
                >
                  {starting ? <><Spinner /> Generating…</> : "Start League"}
                </button>
              )}
              <Link
                href={`/leagues/${id}/games`}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
              >
                Games
              </Link>
              <Link
                href={`/leagues/${id}/stats`}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
              >
                Stats
              </Link>
              <Link
                href={`/leagues/${id}/teams`}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
              >
                Teams
              </Link>
              <div style={{ position: "relative", display: "inline-block" }} className="group">
                {league.status === "ended" ? (
                  <>
                    <button
                      disabled
                      className="px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)", cursor: "not-allowed", opacity: 0.5 }}
                    >
                      Generate Tournament Bracket
                    </button>
                    <div className="absolute bottom-full left-1/2 mb-2 hidden group-hover:block" style={{ transform: "translateX(-50%)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", fontSize: "0.75rem", color: "var(--muted)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10 }}>
                      Reactivate the league to generate a bracket
                    </div>
                  </>
                ) : teams.length < 3 ? (
                  <>
                    <button
                      disabled
                      className="px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)", cursor: "not-allowed", opacity: 0.5 }}
                    >
                      Generate Tournament Bracket
                    </button>
                    <div className="absolute bottom-full left-1/2 mb-2 hidden group-hover:block" style={{ transform: "translateX(-50%)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", fontSize: "0.75rem", color: "var(--muted)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10 }}>
                      At least 3 teams required
                    </div>
                  </>
                ) : bracket ? (
                  <>
                    <button
                      disabled
                      className="px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)", cursor: "not-allowed", opacity: 0.5 }}
                    >
                      Generate Tournament Bracket
                    </button>
                    <div className="absolute bottom-full left-1/2 mb-2 hidden group-hover:block" style={{ transform: "translateX(-50%)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", fontSize: "0.75rem", color: "var(--muted)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10 }}>
                      Delete the existing bracket to generate a new one
                    </div>
                  </>
                ) : (
                  <Link
                    href={`/leagues/${id}/bracket`}
                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: "var(--accent)", color: "#000" }}
                  >
                    Generate Tournament Bracket
                  </Link>
                )}
              </div>
            </div>

            {/* Row 2: secondary / destructive actions */}
            <div className="flex gap-2 items-center">
              {league.status === "ended" ? (
                <button
                  onClick={() => setShowReactivateModal(true)}
                  className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--accent)", border: "1px solid var(--accent)" }}
                >
                  Reactivate League
                </button>
              ) : (
                <button
                  onClick={() => setShowEndModal(true)}
                  className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--tie)", border: "1px solid var(--tie)" }}
                >
                  End Season
                </button>
              )}
              {games.length > 0 && league.status !== "ended" && (
                <button
                  onClick={() => setShowResetModal(true)}
                  className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--loss)", border: "1px solid var(--loss)" }}
                >
                  Reset League
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--loss)", border: "1px solid var(--loss)" }}
              >
                Delete League
              </button>
            </div>
          </div>
        </div>
      </div>

      {games.length === 0 && teams.length < 2 && league.status !== "ended" && (
        <div
          className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-3"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <span style={{ color: "var(--accent)", fontSize: "1.1rem" }}>ⓘ</span>
          <span>
            Add at least <strong style={{ color: "var(--foreground)" }}>2 teams</strong> before starting the league — the schedule can&apos;t be generated without them.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-semibold mb-3">Standings</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <StandingsTable rows={standings} leagueId={id} emptyMessage="No teams yet. Add teams below." />
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Teams</h2>
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="space-y-1 mb-4">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openRoster(t)}
                  className="cursor-pointer w-full text-left text-sm py-2 px-2 rounded-lg flex items-center justify-between transition-colors hover:opacity-80"
                  style={{ background: "var(--surface-2)", color: "var(--foreground)" }}
                >
                  <span>{t.name}</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Roster ›</span>
                </button>
              ))}
              {teams.length === 0 && (
                <p className="text-sm" style={{ color: "var(--muted)" }}>No teams yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
                placeholder="Team name"
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
      </div>
      {/* Tournament Bracket Preview */}
      {bracket && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg">Current Tournament Bracket</h2>
              <p className="text-xs mt-0.5 text-muted">
                Generated {new Date(bracket.generatedAt).toLocaleDateString()} · Open full bracket view to advance teams
              </p>
            </div>
            <Link
              href={`/leagues/${id}/bracket`}
              className="cursor-pointer inline-flex items-center text-sm px-3 py-1.5 rounded-lg bg-surface-2 text-muted border border-border"
            >
              Full bracket view →
            </Link>
          </div>
          <div className="overflow-x-auto pb-2">
            <BracketView
              rounds={bracket.rounds}
              teamName={(tid) => teams.find((t) => t.id === tid)?.name ?? "TBD"}
              seedMap={Object.fromEntries(standings.map((row, i) => [row.team.id, i + 1]))}
            />
          </div>
        </div>
      )}

      {/* Roster modal */}
      {rosterTeam && (
        <Modal size="md" className="flex flex-col max-h-[80vh]" onClose={() => setRosterTeam(null)}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h2 className="text-lg font-bold">{rosterTeam.name}</h2>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Roster</p>
            </div>
            <button
              onClick={() => setRosterTeam(null)}
              className="cursor-pointer text-lg leading-none px-2 py-1 rounded-lg hover:opacity-70"
              style={{ color: "var(--muted)", background: "var(--surface-2)" }}
            >
              ✕
            </button>
          </div>

          {/* Player list */}
          <div className="overflow-y-auto flex-1 px-6 py-4">
            {players.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>
                No players yet. Add one below.
              </p>
            ) : (
              <div className="space-y-2">
                {players.map((p) =>
                  editingPlayer?.id === p.id ? (
                    <div
                      key={p.id}
                      className="flex flex-col gap-2 p-3 rounded-lg"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--accent)" }}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                          placeholder="First name"
                          className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                        />
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                          placeholder="Last name"
                          className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editForm.jerseyNumber}
                          onChange={(e) => setEditForm({ ...editForm, jerseyNumber: e.target.value })}
                          placeholder="Jersey # (optional)"
                          className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                        />
                        <button
                          onClick={() => setEditingPlayer(null)}
                          className="cursor-pointer px-3 py-1.5 rounded-lg text-sm"
                          style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSavePlayer}
                          disabled={savingPlayer || !editForm.firstName.trim() || !editForm.lastName.trim()}
                          className="cursor-pointer px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                          style={{ background: "var(--accent)", color: "#000" }}
                        >
                          {savingPlayer ? <><Spinner /> Saving…</> : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg group"
                      style={{ background: "var(--surface-2)" }}
                    >
                      {p.jerseyNumber !== undefined && (
                        <span className="font-mono font-semibold text-xs w-8 text-center shrink-0" style={{ color: "var(--accent)" }}>
                          #{p.jerseyNumber}
                        </span>
                      )}
                      <span className={`flex-1 ${p.jerseyNumber === undefined ? "ml-11" : ""}`}>
                        {p.firstName} {p.lastName}
                      </span>
                      <button
                        onClick={() => {
                          setEditingPlayer(p);
                          setEditForm({
                            firstName: p.firstName,
                            lastName: p.lastName,
                            jerseyNumber: p.jerseyNumber !== undefined ? String(p.jerseyNumber) : "",
                          });
                        }}
                        className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded text-xs"
                        style={{ color: "var(--muted)", background: "var(--surface)" }}
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
          <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
              Add a player
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="First name"
                value={playerForm.firstName}
                onChange={(e) => setPlayerForm({ ...playerForm, firstName: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
              <input
                type="text"
                placeholder="Last name"
                value={playerForm.lastName}
                onChange={(e) => setPlayerForm({ ...playerForm, lastName: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Jersey # (optional)"
                value={playerForm.jerseyNumber}
                onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
              <button
                onClick={handleAddPlayer}
                disabled={addingPlayer || !playerForm.firstName.trim() || !playerForm.lastName.trim()}
                className="cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                {addingPlayer ? <><Spinner /> Adding…</> : "Add"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showEndModal && (
        <ConfirmModal
          title="End this season?"
          confirmLabel="End Season"
          busyLabel="Ending…"
          variant="warning"
          busy={actioning}
          onConfirm={handleEndSeason}
          onCancel={() => setShowEndModal(false)}
        >
          The league will move to Past Leagues. Stats and standings are preserved.
        </ConfirmModal>
      )}

      {showReactivateModal && (
        <ConfirmModal
          title="Reactivate this league?"
          confirmLabel="Reactivate"
          busyLabel="Reactivating…"
          variant="primary"
          busy={actioning}
          onConfirm={handleReactivate}
          onCancel={() => setShowReactivateModal(false)}
        >
          The league will move back to Active Leagues. You can create a new tournament bracket.
        </ConfirmModal>
      )}

      {showResetModal && (
        <ConfirmModal
          title="Reset this league?"
          confirmLabel="Reset League"
          busyLabel="Resetting…"
          busy={actioning}
          onConfirm={handleReset}
          onCancel={() => setShowResetModal(false)}
        >
          All game results, player stats and the tournament bracket will be cleared. Teams and rosters are kept. The schedule will need to be re-generated.
        </ConfirmModal>
      )}

      {showDeleteModal && (
        <ConfirmModal
          title="Delete this league?"
          confirmLabel="Delete League"
          busyLabel="Deleting…"
          busy={actioning}
          onConfirm={handleDeleteLeague}
          onCancel={() => setShowDeleteModal(false)}
        >
          This will permanently remove the league from your dashboard. This cannot be undone.
        </ConfirmModal>
      )}
    </div>
  );
}
