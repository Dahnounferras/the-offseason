"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLeague } from "@/hooks/useLeague";
import { recordResult } from "@/lib/firestore/leagues";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/errors";
import { parseScoreInput, formatGameWhen } from "@/lib/games";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { Game } from "@/types";

export default function GamesPage() {
  const { id } = useParams<{ id: string }>();
  const { league, teams, games, setGames } = useLeague();
  const toast = useToast();
  // Only one quick-score form is open at a time.
  const [scoringId, setScoringId] = useState<string | null>(null);

  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? tid;
  const ended = league.status === "ended";

  const scheduled = games.filter((g) => g.status === "scheduled");
  const played = games.filter((g) => g.status === "played").sort((a, b) => (b.gameNumber ?? 0) - (a.gameNumber ?? 0));

  async function saveQuickScore(game: Game, home: number, away: number) {
    try {
      const playedAt = await recordResult(id, game.id, home, away);
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, status: "played", homeScore: home, awayScore: away, playedAt } : g))
      );
      setScoringId(null);
      toast.success(`Saved: ${teamName(game.homeTeamId)} ${home} – ${away} ${teamName(game.awayTeamId)}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Games</h2>
        {ended && (
          <p className="text-sm mt-1 text-muted">
            This season has ended.{" "}
            <Link href={`/leagues/${id}/settings`} className="underline">Reactivate the league</Link>
            {" "}to enter or edit results.
          </p>
        )}
      </div>

      {games.length === 0 ? (
        <div className="rounded-xl p-10 text-center text-sm bg-surface border border-border text-muted">
          No schedule yet.{" "}
          <Link href={`/leagues/${id}`} className="underline">Start the league from the Overview</Link>{" "}
          to generate a schedule.
        </div>
      ) : (
        <>
          {scheduled.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold mb-3">Upcoming</h3>
              <ul className="rounded-xl overflow-hidden border border-border">
                {scheduled.map((g, i) => (
                  <li key={g.id} className={`px-4 py-3 text-sm ${rowClasses(i)}`}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="text-xs font-mono shrink-0 text-muted w-16">Game {g.gameNumber}</span>
                      <Link
                        href={`/leagues/${id}/games/${g.id}`}
                        className="flex-1 min-w-0 flex items-center gap-3 font-medium hover:underline"
                      >
                        <span className="flex-1 truncate">{teamName(g.homeTeamId)}</span>
                        <span className="text-xs text-muted">vs</span>
                        <span className="flex-1 truncate text-right">{teamName(g.awayTeamId)}</span>
                      </Link>
                      {!ended && scoringId !== g.id && (
                        <Button variant="secondary" size="sm" onClick={() => setScoringId(g.id)} className="shrink-0">
                          Score
                        </Button>
                      )}
                    </div>
                    {(g.scheduledAt || g.location) && (
                      <p className="text-xs text-muted mt-1 sm:pl-[4.75rem]">
                        {[g.scheduledAt && formatGameWhen(g.scheduledAt), g.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {scoringId === g.id && (
                      <QuickScore
                        homeName={teamName(g.homeTeamId)}
                        awayName={teamName(g.awayTeamId)}
                        onSave={(home, away) => saveQuickScore(g, home, away)}
                        onCancel={() => setScoringId(null)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {played.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Completed</h3>
              <ul className="rounded-xl overflow-hidden border border-border">
                {played.map((g, i) => (
                  <li key={g.id} className={rowClasses(i)}>
                    <Link
                      href={`/leagues/${id}/games/${g.id}`}
                      className="px-4 py-3 flex items-center gap-3 text-sm hover:opacity-80 transition-opacity"
                    >
                      <span className="text-xs font-mono shrink-0 text-muted w-16">
                        {g.gameNumber ? `Game ${g.gameNumber}` : "—"}
                      </span>
                      <span className="flex-1 min-w-0 truncate font-medium">{teamName(g.homeTeamId)}</span>
                      <span className="font-bold tabular-nums">
                        {g.homeScore} – {g.awayScore}
                      </span>
                      <span className="flex-1 min-w-0 truncate font-medium text-right">{teamName(g.awayTeamId)}</span>
                      {g.playedAt && (
                        <span className="hidden sm:inline text-xs shrink-0 text-muted">
                          {new Date(g.playedAt).toLocaleDateString()}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const rowClasses = (i: number) => `${i % 2 === 0 ? "bg-surface" : "bg-surface-2"} ${i > 0 ? "border-t border-border" : ""}`;

type QuickScoreProps = {
  homeName: string;
  awayName: string;
  onSave: (home: number, away: number) => Promise<void>;
  onCancel: () => void;
};

// Inline score entry for an upcoming game. Sportsmanship and stats stay on the game page.
function QuickScore({ homeName, awayName, onSave, onCancel }: QuickScoreProps) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [saving, setSaving] = useState(false);
  const parsed = parseScoreInput(home, away);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed) return;
    setSaving(true);
    try {
      await onSave(parsed.home, parsed.away);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
      <Input
        type="number" min={0} inputMode="numeric" compact
        aria-label={`${homeName} score`}
        placeholder={homeName}
        value={home}
        onChange={(e) => setHome(e.target.value)}
        autoFocus
        className="w-24 text-center"
      />
      <span aria-hidden="true" className="text-muted">–</span>
      <Input
        type="number" min={0} inputMode="numeric" compact
        aria-label={`${awayName} score`}
        placeholder={awayName}
        value={away}
        onChange={(e) => setAway(e.target.value)}
        className="w-24 text-center"
      />
      <Button type="submit" size="sm" disabled={!parsed} loading={saving} loadingText="Saving…">Save</Button>
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
    </form>
  );
}
