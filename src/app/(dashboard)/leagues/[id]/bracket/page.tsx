"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLeague, getTeams, getGames, getBracket, saveBracket, deleteBracket, updateBracket } from "@/lib/firestore/leagues";
import type { League, Team, Game, Bracket, BracketMatchup } from "@/types";
import { computeSeedings, generateBracket, cascadeClear } from "@/lib/bracket";

const TEAM_ROW_H = 40;
const CARD_H = TEAM_ROW_H * 2;
const MATCH_GAP = 24;
const CONNECTOR_W = 32;
const ROUND_W = 180;
const LABEL_H = 30;
const CHAMPION_W = 160;

// Computes the vertical center (in px) of each matchup in each round,
// where round 0 is evenly spaced and later rounds are centered between their feeders.
function computeMatchupCenters(firstRoundCount: number): number[][] {
  const allCenters: number[][] = [];
  const r0 = Array.from({ length: firstRoundCount }, (_, i) =>
    i * (CARD_H + MATCH_GAP) + CARD_H / 2
  );
  allCenters.push(r0);
  let prev = r0;
  while (prev.length > 1) {
    const next: number[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push((prev[i] + prev[i + 1]) / 2);
    }
    allCenters.push(next);
    prev = next;
  }
  return allCenters;
}

function countRemaining(rounds: BracketMatchup[][]): number {
  let count = 0;
  for (const round of rounds) {
    for (const m of round) {
      if (m.homeTeamId && m.awayTeamId && !m.winnerId) count++;
    }
  }
  return count;
}

function roundLabel(rIdx: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - rIdx;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${rIdx + 1}`;
}

export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([getLeague(id), getTeams(id), getGames(id), getBracket(id)]).then(
      ([l, t, g, b]) => {
        if (l) setLeague(l);
        setTeams(t);
        setGames(g);
        setBracket(b);
      }
    );
  }, [id]);

  const seedMap = useMemo(() => {
    if (!league) return {} as Record<string, number>;
    const seeded = computeSeedings([...teams], games, league.scoringRules);
    const map: Record<string, number> = {};
    seeded.forEach((t, i) => { map[t.id] = i + 1; });
    return map;
  }, [teams, games, league]);

  async function handleGenerate() {
    if (!league) return;
    setGenerating(true);
    const seeded = computeSeedings([...teams], games, league.scoringRules);
    const rounds = generateBracket(seeded);
    const newBracket: Omit<Bracket, "id"> = { rounds, generatedAt: Date.now(), status: "active" };
    const bracketId = await saveBracket(id, newBracket);
    setBracket({ id: bracketId, ...newBracket });
    setGenerating(false);
  }

  async function handleDeleteBracket() {
    if (!bracket) return;
    setDeleting(true);
    await deleteBracket(id, bracket.id);
    setBracket(null);
    setDeleting(false);
    setShowDeleteModal(false);
  }

  async function handlePickWinner(roundIdx: number, matchIdx: number, winnerId: string) {
    if (!bracket) return;
    const updated: Bracket = JSON.parse(JSON.stringify(bracket));
    const matchup = updated.rounds[roundIdx][matchIdx];
    if (matchup.winnerId === winnerId) return;
    matchup.winnerId = winnerId;
    if (roundIdx + 1 < updated.rounds.length) {
      const nextMatchIdx = Math.floor(matchIdx / 2);
      const nextMatch = updated.rounds[roundIdx + 1][nextMatchIdx];
      if (matchIdx % 2 === 0) {
        nextMatch.homeTeamId = winnerId;
      } else {
        nextMatch.awayTeamId = winnerId;
      }
      if (nextMatch.winnerId) {
        cascadeClear(updated.rounds, roundIdx + 1, nextMatchIdx);
      }
    }
    setBracket(updated);
    await updateBracket(id, bracket.id, updated.rounds);
  }

  async function handleReset() {
    if (!bracket) return;
    const reset: Bracket = JSON.parse(JSON.stringify(bracket));
    for (let r = 0; r < reset.rounds.length; r++) {
      for (const m of reset.rounds[r]) {
        m.winnerId = null;
        if (r > 0) { m.homeTeamId = null; m.awayTeamId = null; }
      }
    }
    setBracket(reset);
    await updateBracket(id, bracket.id, reset.rounds);
  }

  const teamName = (tid: string | null) =>
    tid ? (teams.find((t) => t.id === tid)?.name ?? "TBD") : "TBD";

  if (!league) return <div className="py-20 text-center" style={{ color: "var(--muted)" }}>Loading…</div>;

  const firstRoundCount = bracket?.rounds[0]?.length ?? 0;
  const totalHeight = firstRoundCount > 0
    ? firstRoundCount * CARD_H + (firstRoundCount - 1) * MATCH_GAP
    : 0;
  const allCenters = firstRoundCount > 0 ? computeMatchupCenters(firstRoundCount) : [];
  const champion = bracket ? (bracket.rounds[bracket.rounds.length - 1]?.[0]?.winnerId ?? null) : null;
  const remaining = bracket ? countRemaining(bracket.rounds) : 0;
  const finalCenter = allCenters[allCenters.length - 1]?.[0] ?? totalHeight / 2;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>
          <Link href="/dashboard" className="hover:underline">My Leagues</Link>
          {" / "}
          <Link href={`/leagues/${id}`} className="hover:underline">{league.name}</Link>
          {" / Bracket"}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tournament Bracket</h1>
          <div className="flex items-center gap-2">
            <Link
              href={`/leagues/${id}`}
              className="cursor-pointer inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            >
              ← Back to League
            </Link>
            {bracket && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--loss)", border: "1px solid var(--loss)" }}
              >
                Delete Bracket
              </button>
            )}
            {!bracket && (
              <button
                onClick={handleGenerate}
                disabled={generating || teams.length < 2}
                className="cursor-pointer px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {generating ? "Generating…" : "Generate Bracket"}
              </button>
            )}
          </div>
        </div>
        {bracket && (
          <p className="text-xs mt-1 flex items-center gap-2" style={{ color: "var(--muted)" }}>
            <span>Generated {new Date(bracket.generatedAt).toLocaleDateString()}</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border)", display: "inline-block", flexShrink: 0 }} />
            <span>{league.status === "ended" ? "Reactivate the league to edit this bracket" : "Click a team to advance them"}</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border)", display: "inline-block", flexShrink: 0 }} />
            {champion ? (
              <span style={{ color: "var(--accent)" }}>{teamName(champion)} is champion!</span>
            ) : (
              <span>{remaining} game{remaining !== 1 ? "s" : ""} remaining</span>
            )}
          </p>
        )}
      </div>

      {/* Empty state */}
      {!bracket ? (
        <div
          className="rounded-xl py-16 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="font-medium mb-2">No bracket yet</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {teams.length < 2
              ? "Add at least 2 teams first."
              : "Click Generate Bracket to seed teams from standings."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto pb-4">
            <div style={{ display: "flex", alignItems: "flex-start" }}>

              {bracket.rounds.map((round, rIdx) => {
                const centers = allCenters[rIdx] ?? [];
                const isLastRound = rIdx === bracket.rounds.length - 1;

                return (
                  <div key={rIdx} style={{ display: "flex", alignItems: "flex-start" }}>
                    {/* Round column */}
                    <div style={{ flexShrink: 0 }}>
                      {/* Label */}
                      <div style={{
                        height: LABEL_H,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--muted)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        width: ROUND_W,
                      }}>
                        {roundLabel(rIdx, bracket.rounds.length)}
                      </div>

                      {/* Matchup cards, absolutely positioned within a fixed-height container */}
                      <div style={{ position: "relative", width: ROUND_W, height: totalHeight }}>
                        {round.map((matchup, mIdx) => {
                          const top = (centers[mIdx] ?? 0) - CARD_H / 2;
                          return (
                            <div
                              key={mIdx}
                              style={{
                                position: "absolute",
                                top,
                                left: 0,
                                width: ROUND_W,
                                border: `0.5px solid ${matchup.winnerId ? "var(--accent)" : "var(--border)"}`,
                                borderRadius: 8,
                                overflow: "hidden",
                              }}
                            >
                              {([matchup.homeTeamId, matchup.awayTeamId] as (string | null)[]).map((tid, slotIdx) => {
                                const isTop = slotIdx === 0;
                                const isWinner = !!matchup.winnerId && matchup.winnerId === tid;
                                const isLoser = !!matchup.winnerId && matchup.winnerId !== tid;
                                const isTbd = !tid;
                                const clickable = !!tid && !isTbd && league?.status !== "ended";

                                return (
                                  <button
                                    key={slotIdx}
                                    disabled={!clickable}
                                    onClick={() => clickable && handlePickWinner(rIdx, mIdx, tid!)}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      width: "100%",
                                      padding: "9px 14px",
                                      background: isWinner ? "var(--accent-dim)" : "var(--surface-2)",
                                      borderBottom: isTop ? `0.5px solid var(--border)` : undefined,
                                      cursor: clickable ? "pointer" : "default",
                                      transition: "background 0.15s, border-color 0.15s",
                                      textAlign: "left",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      {tid && (
                                        <span style={{
                                          fontSize: 11,
                                          color: isWinner ? "var(--accent)" : "var(--muted)",
                                          fontWeight: 500,
                                          minWidth: 14,
                                          flexShrink: 0,
                                        }}>
                                          {seedMap[tid] ?? ""}
                                        </span>
                                      )}
                                      <span style={{
                                        fontSize: 13,
                                        color: isWinner
                                          ? "var(--accent)"
                                          : isLoser || isTbd
                                          ? "var(--muted)"
                                          : "var(--foreground)",
                                        fontWeight: isWinner ? 500 : 400,
                                      }}>
                                        {tid ? teamName(tid) : "TBD"}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Connector: bracket lines between rounds, or line to champion */}
                    {isLastRound ? (
                      <svg
                        width={CONNECTOR_W}
                        height={totalHeight}
                        style={{ flexShrink: 0, marginTop: LABEL_H }}
                      >
                        <line
                          x1={0} y1={finalCenter}
                          x2={CONNECTOR_W} y2={finalCenter}
                          stroke="var(--border)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width={CONNECTOR_W}
                        height={totalHeight}
                        style={{ flexShrink: 0, marginTop: LABEL_H }}
                      >
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
                              <path
                                d={`M0,${y1} H${hw} V${ymid} H${CONNECTOR_W}`}
                                fill="none"
                                stroke="var(--border)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d={`M0,${y2} H${hw} V${ymid} H${CONNECTOR_W}`}
                                fill="none"
                                stroke="var(--border)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
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
                  height: LABEL_H,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  width: CHAMPION_W,
                }}>
                  Champion
                </div>
                <div style={{ position: "relative", width: CHAMPION_W, height: totalHeight }}>
                  <div style={{
                    position: "absolute",
                    top: finalCenter,
                    left: 0,
                    transform: "translateY(-50%)",
                    width: CHAMPION_W,
                    background: "var(--accent-dim)",
                    border: `1.5px solid var(--accent)`,
                    borderRadius: 10,
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
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

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={league.status === "ended"}
            className="cursor-pointer mt-6 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              fontSize: 12,
              padding: "6px 16px",
              background: "transparent",
              border: "0.5px solid var(--border)",
              borderRadius: 6,
              color: "var(--muted)",
            }}
          >
            ↺ Reset bracket
          </button>
        </>
      )}

      {/* Delete bracket modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-bold mb-2">Delete this bracket?</h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              This will permanently remove the tournament bracket. You can generate a new one after.
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
                onClick={handleDeleteBracket}
                disabled={deleting}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--loss)", color: "#fff" }}
              >
                {deleting ? "Deleting…" : "Delete Bracket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
