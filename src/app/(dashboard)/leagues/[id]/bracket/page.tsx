"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { saveBracket, deleteBracket, updateBracket } from "@/lib/firestore/leagues";
import type { Bracket } from "@/types";
import { useLeague } from "@/hooks/useLeague";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/errors";
import { computeSeedings, generateBracket, advanceWinner, clearResults, bracketBlockedReason } from "@/lib/bracket";
import { championId, countRemaining } from "@/lib/bracketLayout";
import Spinner from "@/components/Spinner";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Button from "@/components/ui/Button";
import ResponsiveBracket from "@/components/league/ResponsiveBracket";

export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const { league, teams, games, bracket, setBracket } = useLeague();
  const toast = useToast();
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

  const blockedReason = bracketBlockedReason(league, teams.length);

  async function handleGenerate() {
    if (blockedReason) return;
    setGenerating(true);
    try {
      const rounds = generateBracket(computeSeedings(teams, games, league.scoringRules));
      const newBracket: Omit<Bracket, "id"> = { rounds, generatedAt: Date.now(), status: "active" };
      const bracketId = await saveBracket(id, newBracket);
      setBracket({ id: bracketId, ...newBracket });
    } catch (err) {
      toast.error(errorMessage(err));
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
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handlePickWinner(roundIdx: number, matchIdx: number, winnerId: string) {
    if (!bracket) return;
    const rounds = advanceWinner(bracket.rounds, roundIdx, matchIdx, winnerId);
    if (!rounds) return;
    // Optimistic: show the pick at once, and put the old rounds back if the write fails.
    setBracket({ ...bracket, rounds });
    try {
      await updateBracket(id, bracket.id, rounds);
    } catch (err) {
      setBracket(bracket);
      toast.error(errorMessage(err));
    }
  }

  async function handleReset() {
    if (!bracket) return;
    setResetting(true);
    try {
      const rounds = clearResults(bracket.rounds);
      setBracket({ ...bracket, rounds });
      await updateBracket(id, bracket.id, rounds);
    } catch (err) {
      setBracket(bracket);
      toast.error(errorMessage(err));
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Tournament Bracket</h2>
          {bracket ? (
            <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
              Delete Bracket
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={!!blockedReason} loading={generating} loadingText="Generating…">
              Generate Bracket
            </Button>
          )}
        </div>
        {bracket && (
          <p className="text-xs mt-1 flex flex-wrap items-center gap-2 text-muted">
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
          <p className="text-sm text-muted">
            {blockedReason ?? "Click Generate Bracket to seed teams from the current standings."}
          </p>
        </div>
      ) : (
        <>
          <ResponsiveBracket
            rounds={bracket.rounds}
            teamName={teamName}
            seedMap={seedMap}
            onPick={league.status === "ended" ? undefined : handlePickWinner}
          />

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
