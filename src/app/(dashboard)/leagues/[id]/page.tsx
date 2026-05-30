"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLeague, getTeams, getGames, addTeam, getBracket, getPlayers, addPlayer, updatePlayer, scheduleGames, endLeague, deleteLeague, reactivateLeague } from "@/lib/firestore/leagues";
import type { League, Team, Game, Bracket, Player } from "@/types";
import { generateSchedule } from "@/lib/schedule";
import { computeStandings } from "@/lib/standings";

const CARD_H = 80;
const MATCH_GAP = 24;
const CONNECTOR_W = 32;
const ROUND_W = 180;
const LABEL_H = 30;
const CHAMPION_W = 160;

function computeMatchupCenters(firstRoundCount: number): number[][] {
  const allCenters: number[][] = [];
  const r0 = Array.from({ length: firstRoundCount }, (_, i) =>
    i * (CARD_H + MATCH_GAP) + CARD_H / 2
  );
  allCenters.push(r0);
  let prev = r0;
  while (prev.length > 1) {
    const next: number[] = [];
    for (let i = 0; i < prev.length; i += 2) next.push((prev[i] + prev[i + 1]) / 2);
    allCenters.push(next);
    prev = next;
  }
  return allCenters;
}

function bracketRoundLabel(rIdx: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - rIdx;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${rIdx + 1}`;
}

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
        stats: {},
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
                <> &bull; {games.filter((g) => g.status === "played" || !g.status).length} / {league.season.totalGames} games played</>
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
                  {starting ? "Generating…" : "Start League"}
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
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-center">GP</th>
                  <th className="px-4 py-3 text-center">W</th>
                  <th className="px-4 py-3 text-center">L</th>
                  <th className="px-4 py-3 text-center">T</th>
                  <th className="px-4 py-3 text-center font-bold" style={{ color: "var(--accent)" }}>PTS</th>
                  <th className="px-4 py-3 text-center">PF</th>
                  <th className="px-4 py-3 text-center">PA</th>
                  <th className="px-4 py-3 text-center">RTG</th>
                </tr>
              </thead>
              <tbody>
                {standings.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8" style={{ color: "var(--muted)" }}>
                      No teams yet. Add teams below.
                    </td>
                  </tr>
                )}
                {standings.map((row, i) => (
                  <tr
                    key={row.team.id}
                    style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{i + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/leagues/${id}/teams/${row.team.id}`}
                        className="hover:underline"
                        style={{ color: "var(--foreground)" }}
                      >
                        {row.team.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>{row.gp}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--win)" }}>{row.w}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--loss)" }}>{row.l}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--tie)" }}>{row.t}</td>
                    <td className="px-4 py-3 text-center font-bold" style={{ color: "var(--accent)" }}>{row.pts}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>{row.pf}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>{row.pa}</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                      {row.sportCount > 0 ? (row.sportSum / row.sportCount).toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTeam()}
                placeholder="Team name"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <button
                onClick={handleAddTeam}
                disabled={addingTeam || !newTeamName.trim()}
                className="cursor-pointer px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Tournament Bracket Preview */}
      {bracket && (() => {
        const firstRoundCount = bracket.rounds[0]?.length ?? 0;
        const totalHeight = firstRoundCount > 0
          ? firstRoundCount * CARD_H + (firstRoundCount - 1) * MATCH_GAP
          : 0;
        const allCenters = firstRoundCount > 0 ? computeMatchupCenters(firstRoundCount) : [];
        const champion = bracket.rounds[bracket.rounds.length - 1]?.[0]?.winnerId ?? null;
        const finalCenter = allCenters[allCenters.length - 1]?.[0] ?? totalHeight / 2;
        const teamName = (tid: string | null) => tid ? (teams.find((t) => t.id === tid)?.name ?? "TBD") : "TBD";
        const seedMap: Record<string, number> = {};
        standings.forEach((row, i) => { seedMap[row.team.id] = i + 1; });

        return (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg">Current Tournament Bracket</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  Generated {new Date(bracket.generatedAt).toLocaleDateString()} · Open full bracket view to advance teams
                </p>
              </div>
              <Link
                href={`/leagues/${id}/bracket`}
                className="cursor-pointer inline-flex items-center text-sm px-3 py-1.5 rounded-lg"
                style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                Full bracket view →
              </Link>
            </div>
            <div className="overflow-x-auto pb-2">
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                {bracket.rounds.map((round, rIdx) => {
                  const centers = allCenters[rIdx] ?? [];
                  const isLastRound = rIdx === bracket.rounds.length - 1;
                  return (
                    <div key={rIdx} style={{ display: "flex", alignItems: "flex-start" }}>
                      {/* Round column */}
                      <div style={{ flexShrink: 0 }}>
                        <div style={{
                          height: LABEL_H, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 500, color: "var(--muted)", letterSpacing: "0.08em",
                          textTransform: "uppercase", width: ROUND_W,
                        }}>
                          {bracketRoundLabel(rIdx, bracket.rounds.length)}
                        </div>
                        <div style={{ position: "relative", width: ROUND_W, height: totalHeight + 1 }}>
                          {round.map((matchup, mIdx) => {
                            const top = (centers[mIdx] ?? 0) - CARD_H / 2;
                            return (
                              <div key={mIdx} style={{
                              position: "absolute", top, left: 0, width: ROUND_W,
                              border: `0.5px solid ${matchup.winnerId ? "var(--accent)" : "var(--border)"}`,
                              borderRadius: 8,
                              overflow: "hidden",
                            }}>
                                {([matchup.homeTeamId, matchup.awayTeamId] as (string | null)[]).map((tid, slotIdx) => {
                                  const isTop = slotIdx === 0;
                                  const isWinner = !!matchup.winnerId && matchup.winnerId === tid;
                                  const isLoser = !!matchup.winnerId && matchup.winnerId !== tid;
                                  return (
                                    <div
                                      key={slotIdx}
                                      style={{
                                        display: "flex", alignItems: "center", width: "100%",
                                        padding: "9px 14px",
                                        background: isWinner ? "var(--accent-dim)" : "var(--surface-2)",
                                        borderBottom: isTop ? "0.5px solid var(--border)" : undefined,
                                      }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        {tid && (
                                          <span style={{ fontSize: 11, color: isWinner ? "var(--accent)" : "var(--muted)", fontWeight: 500, minWidth: 14, flexShrink: 0 }}>
                                            {seedMap[tid] ?? ""}
                                          </span>
                                        )}
                                        <span style={{
                                          fontSize: 13,
                                          color: isWinner ? "var(--accent)" : isLoser || !tid ? "var(--muted)" : "var(--foreground)",
                                          fontWeight: isWinner ? 500 : 400,
                                        }}>
                                          {tid ? teamName(tid) : "TBD"}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Connector */}
                      {isLastRound ? (
                        <svg width={CONNECTOR_W} height={totalHeight} style={{ flexShrink: 0, marginTop: LABEL_H }}>
                          <line x1={0} y1={finalCenter} x2={CONNECTOR_W} y2={finalCenter}
                            stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width={CONNECTOR_W} height={totalHeight} style={{ flexShrink: 0, marginTop: LABEL_H }}>
                          {centers.map((_, i) => {
                            if (i % 2 !== 0) return null;
                            const y1 = centers[i];
                            const y2 = centers[i + 1];
                            if (y2 === undefined) return null;
                            const ymid = allCenters[rIdx + 1]?.[i / 2];
                            if (ymid === undefined) return null;
                            const hw = CONNECTOR_W / 2;
                            return (
                              <g key={i}>
                                <path d={`M0,${y1} H${hw} V${ymid} H${CONNECTOR_W}`} fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d={`M0,${y2} H${hw} V${ymid} H${CONNECTOR_W}`} fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </g>
                            );
                          })}
                        </svg>
                      )}
                    </div>
                  );
                })}
                {/* Champion slot */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{
                    height: LABEL_H, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 500, color: "var(--muted)", letterSpacing: "0.08em",
                    textTransform: "uppercase", width: CHAMPION_W,
                  }}>
                    Champion
                  </div>
                  <div style={{ position: "relative", width: CHAMPION_W, height: totalHeight }}>
                    <div style={{
                      position: "absolute", top: finalCenter, left: 0, transform: "translateY(-50%)",
                      width: CHAMPION_W, background: "var(--accent-dim)", border: "1.5px solid var(--accent)",
                      borderRadius: 10, padding: "16px 20px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    }}>
                      {champion ? (
                        <>
                          <span style={{ fontSize: 22 }}>🏆</span>
                          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--accent)", textAlign: "center" }}>
                            {teamName(champion)}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--accent)", opacity: 0.7 }}>
                            Seed #{seedMap[champion] ?? "?"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: 22, opacity: 0.2 }}>🏆</span>
                          <span style={{ fontSize: 13, color: "var(--muted)" }}>TBD</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Roster modal */}
      {rosterTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-md rounded-2xl flex flex-col"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "80vh" }}
          >
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
                            {savingPlayer ? "Saving…" : "Save"}
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
                  {addingPlayer ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Season modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-bold mb-2">End this season?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              The league will move to Past Leagues. Stats and standings are preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleEndSeason}
                disabled={actioning}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--tie)", color: "#000" }}
              >
                {actioning ? "Ending…" : "End Season"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate League modal */}
      {showReactivateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-bold mb-2">Reactivate this league?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              The league will move back to Active Leagues. You can create a new tournament bracket.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReactivateModal(false)}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleReactivate}
                disabled={actioning}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                {actioning ? "Reactivating…" : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete League modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-bold mb-2">Delete this league?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              This will permanently remove the league from your dashboard. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLeague}
                disabled={actioning}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--loss)", color: "#fff" }}
              >
                {actioning ? "Deleting…" : "Delete League"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
