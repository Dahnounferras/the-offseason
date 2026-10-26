"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { saveBracket, deleteBracket, updateBracket } from "@/lib/firestore/leagues";
import type { Bracket } from "@/types";
import { useLeague } from "@/hooks/useLeague";
import { computeSeedings, generateBracket, advanceWinner, clearResults } from "@/lib/bracket";
import { championId, countRemaining } from "@/lib/bracketLayout";
import Spinner from "@/components/Spinner";
import ConfirmModal from "@/components/ui/ConfirmModal";
import BracketView from "@/components/league/BracketView";

export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const { league, teams, games, bracket, setBracket } = useLeague();
  const [generating, setGenerating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const seedMap = useMemo(() => {
    const seeded = computeSeedings(teams, games, league.scoringRules);
    const map: Record<string, number> = {};
    seeded.forEach((t, i) => { map[t.id] = i + 1; });
    return map;
  }, [teams, games, league.scoringRules]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const rounds = generateBracket(computeSeedings(teams, games, league.scoringRules));
      const newBracket: Omit<Bracket, "id"> = { rounds, generatedAt: Date.now(), status: "active" };
      const bracketId = await saveBracket(id, newBracket);
      setBracket({ id: bracketId, ...newBracket });
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteBracket() {
    if (!bracket) return;
    setDeleting(true);
    try {
      await deleteBracket(id, bracket.id);
      setBracket(null);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handlePickWinner(roundIdx: number, matchIdx: number, winnerId: string) {
    if (!bracket) return;
    const rounds = advanceWinner(bracket.rounds, roundIdx, matchIdx, winnerId);
    if (!rounds) return;
    setBracket({ ...bracket, rounds });
    await updateBracket(id, bracket.id, rounds);
  }

  async function handleReset() {
    if (!bracket) return;
    setResetting(true);
    try {
      const rounds = clearResults(bracket.rounds);
      setBracket({ ...bracket, rounds });
      await updateBracket(id, bracket.id, rounds);
    } finally {
      setResetting(false);
    }
  }

  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? "TBD";

  const champion = bracket ? championId(bracket.rounds) : null;
  const remaining = bracket ? countRemaining(bracket.rounds) : 0;

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
                {generating ? <><Spinner /> Generating…</> : "Generate Bracket"}
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
            <BracketView
              rounds={bracket.rounds}
              teamName={teamName}
              seedMap={seedMap}
              onPick={league.status === "ended" ? undefined : handlePickWinner}
            />
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={resetting || league.status === "ended"}
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
            {resetting ? <><Spinner /> Resetting…</> : "↺ Reset bracket"}
          </button>
        </>
      )}

      {showDeleteModal && (
        <ConfirmModal
          title="Delete this bracket?"
          confirmLabel="Delete Bracket"
          busyLabel="Deleting…"
          busy={deleting}
          onConfirm={handleDeleteBracket}
          onCancel={() => setShowDeleteModal(false)}
        >
          This will permanently remove the tournament bracket. You can generate a new one after.
        </ConfirmModal>
      )}
    </div>
  );
}
