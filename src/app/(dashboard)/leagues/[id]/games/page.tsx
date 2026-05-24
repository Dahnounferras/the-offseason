"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLeague, getTeams, getGames, recordResult, updateResult } from "@/lib/firestore/leagues";
import type { League, Team, Game } from "@/types";

export default function GamesPage() {
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [enteringResult, setEnteringResult] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState({ homeScore: "", awayScore: "", homeSport: "", awaySport: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [editResultForm, setEditResultForm] = useState({ homeScore: "", awayScore: "", homeSport: "", awaySport: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    Promise.all([getLeague(id), getTeams(id), getGames(id)]).then(([l, t, g]) => {
      if (l) setLeague(l);
      setTeams(t);
      setGames(g.sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0)));
    });
  }, [id]);

  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? tid;

  async function handleRecordResult(game: Game) {
    const hs = Number(resultForm.homeScore);
    const as = Number(resultForm.awayScore);
    if (isNaN(hs) || isNaN(as) || resultForm.homeScore === "" || resultForm.awayScore === "") return;
    const homeSport = resultForm.homeSport ? Number(resultForm.homeSport) : undefined;
    const awaySport = resultForm.awaySport ? Number(resultForm.awaySport) : undefined;
    setSubmitting(true);
    try {
      await recordResult(id, game.id, hs, as, homeSport, awaySport);
      setGames((prev) =>
        prev.map((g) =>
          g.id === game.id
            ? { ...g, status: "played" as const, homeScore: hs, awayScore: as, homeSportsmanship: homeSport, awaySportsmanship: awaySport, playedAt: Date.now() }
            : g
        )
      );
      setEnteringResult(null);
      setResultForm({ homeScore: "", awayScore: "", homeSport: "", awaySport: "" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditResult(game: Game) {
    const hs = Number(editResultForm.homeScore);
    const as = Number(editResultForm.awayScore);
    if (editResultForm.homeScore === "" || editResultForm.awayScore === "" || isNaN(hs) || isNaN(as)) return;
    const homeSport = editResultForm.homeSport ? Number(editResultForm.homeSport) : undefined;
    const awaySport = editResultForm.awaySport ? Number(editResultForm.awaySport) : undefined;
    setSavingEdit(true);
    try {
      await updateResult(id, game.id, hs, as, homeSport, awaySport);
      setGames((prev) =>
        prev.map((g) => g.id === game.id ? { ...g, homeScore: hs, awayScore: as, homeSportsmanship: homeSport, awaySportsmanship: awaySport } : g)
      );
      setEditingGame(null);
    } finally {
      setSavingEdit(false);
    }
  }

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
          <Link href={`/leagues/${id}`} className="underline">
            Go to the league page
          </Link>{" "}
          to start the league and generate a schedule.
        </div>
      ) : (
        <>
          {/* Upcoming games */}
          {scheduled.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold mb-3">Upcoming</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {scheduled.map((g, i) =>
                  enteringResult === g.id && league.status !== "ended" ? (
                    <div
                      key={g.id}
                      className="px-4 py-3 flex flex-col gap-2"
                      style={{
                        background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                        borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                      }}
                    >
                      {/* Score row */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono shrink-0" style={{ color: "var(--muted)" }}>Game {g.gameNumber}</span>
                        <span className="flex-1 text-sm font-medium">{teamName(g.homeTeamId)}</span>
                        <input type="number" min={0} placeholder="0" value={resultForm.homeScore}
                          onChange={(e) => setResultForm({ ...resultForm, homeScore: e.target.value })}
                          className="w-16 px-2 py-1 rounded-lg text-sm text-center outline-none"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                        <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>–</span>
                        <input type="number" min={0} placeholder="0" value={resultForm.awayScore}
                          onChange={(e) => setResultForm({ ...resultForm, awayScore: e.target.value })}
                          className="w-16 px-2 py-1 rounded-lg text-sm text-center outline-none"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                        <span className="flex-1 text-sm font-medium text-right">{teamName(g.awayTeamId)}</span>
                      </div>
                      {/* Sportsmanship + actions row */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>Sportsmanship (1–5)</span>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>{teamName(g.homeTeamId)}</span>
                        <select value={resultForm.homeSport} onChange={(e) => setResultForm({ ...resultForm, homeSport: e.target.value })}
                          className="px-2 py-1 rounded-lg text-xs outline-none"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                          <option value="">—</option>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>{teamName(g.awayTeamId)}</span>
                        <select value={resultForm.awaySport} onChange={(e) => setResultForm({ ...resultForm, awaySport: e.target.value })}
                          className="px-2 py-1 rounded-lg text-xs outline-none"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                          <option value="">—</option>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <div className="flex gap-2 ml-auto shrink-0">
                          <button onClick={() => { setEnteringResult(null); setResultForm({ homeScore: "", awayScore: "", homeSport: "", awaySport: "" }); }}
                            className="cursor-pointer px-3 py-1 rounded-lg text-xs"
                            style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                            Cancel
                          </button>
                          <button onClick={() => handleRecordResult(g)}
                            disabled={submitting || resultForm.homeScore === "" || resultForm.awayScore === ""}
                            className="cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                            style={{ background: "var(--accent)", color: "#000" }}>
                            {submitting ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={g.id}
                      className="px-4 py-3 flex items-center gap-3 text-sm"
                      style={{
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
                        <button
                          onClick={() => { setEnteringResult(g.id); setResultForm({ homeScore: "", awayScore: "", homeSport: "", awaySport: "" }); }}
                          className="cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold shrink-0"
                          style={{ background: "var(--surface-2)", color: "var(--accent)", border: "1px solid var(--accent)" }}
                        >
                          Enter Result
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Completed games */}
          {played.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Completed</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {played.map((g, i) =>
                  editingGame === g.id && league.status !== "ended" ? (
                    <div
                      key={g.id}
                      className="px-4 py-3 flex flex-col gap-2"
                      style={{
                        background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                        borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                        outline: "1px solid var(--accent)",
                      }}
                    >
                      {/* Score row */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono shrink-0" style={{ color: "var(--muted)" }}>{g.gameNumber ? `Game ${g.gameNumber}` : "—"}</span>
                        <span className="flex-1 text-sm font-medium">{teamName(g.homeTeamId)}</span>
                        <input type="number" min={0} value={editResultForm.homeScore}
                          onChange={(e) => setEditResultForm({ ...editResultForm, homeScore: e.target.value })}
                          className="w-16 px-2 py-1 rounded-lg text-sm text-center outline-none"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                        <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>–</span>
                        <input type="number" min={0} value={editResultForm.awayScore}
                          onChange={(e) => setEditResultForm({ ...editResultForm, awayScore: e.target.value })}
                          className="w-16 px-2 py-1 rounded-lg text-sm text-center outline-none"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                        <span className="flex-1 text-sm font-medium text-right">{teamName(g.awayTeamId)}</span>
                      </div>
                      {/* Sportsmanship + actions row */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>Sportsmanship (1–5)</span>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>{teamName(g.homeTeamId)}</span>
                        <select value={editResultForm.homeSport} onChange={(e) => setEditResultForm({ ...editResultForm, homeSport: e.target.value })}
                          className="px-2 py-1 rounded-lg text-xs outline-none"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                          <option value="">—</option>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>{teamName(g.awayTeamId)}</span>
                        <select value={editResultForm.awaySport} onChange={(e) => setEditResultForm({ ...editResultForm, awaySport: e.target.value })}
                          className="px-2 py-1 rounded-lg text-xs outline-none"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                          <option value="">—</option>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <div className="flex gap-2 ml-auto shrink-0">
                          <button onClick={() => setEditingGame(null)}
                            className="cursor-pointer px-3 py-1 rounded-lg text-xs"
                            style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                            Cancel
                          </button>
                          <button onClick={() => handleEditResult(g)}
                            disabled={savingEdit || editResultForm.homeScore === "" || editResultForm.awayScore === ""}
                            className="cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                            style={{ background: "var(--accent)", color: "#000" }}>
                            {savingEdit ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={g.id}
                      className="px-4 py-3 flex items-center gap-3 text-sm group"
                      style={{
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
                      {league.status !== "ended" && (
                        <button
                          onClick={() => {
                            setEditingGame(g.id);
                            setEditResultForm({
                              homeScore: String(g.homeScore ?? ""),
                              awayScore: String(g.awayScore ?? ""),
                              homeSport: g.homeSportsmanship !== undefined ? String(g.homeSportsmanship) : "",
                              awaySport: g.awaySportsmanship !== undefined ? String(g.awaySportsmanship) : "",
                            });
                          }}
                          className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded text-xs shrink-0"
                          style={{ color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
