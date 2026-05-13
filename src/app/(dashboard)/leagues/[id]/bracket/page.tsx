"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLeague, getTeams, getGames, getBracket, saveBracket } from "@/lib/firestore/leagues";
import type { League, Team, Game, Bracket, BracketMatchup } from "@/types";

function computeSeedings(teams: Team[], games: Game[], scoringRules: League["scoringRules"]) {
  const map: Record<string, number> = {};
  for (const t of teams) map[t.id] = 0;
  for (const g of games) {
    if (g.homeScore > g.awayScore) {
      map[g.homeTeamId] = (map[g.homeTeamId] ?? 0) + scoringRules.win;
      map[g.awayTeamId] = (map[g.awayTeamId] ?? 0) + scoringRules.loss;
    } else if (g.awayScore > g.homeScore) {
      map[g.awayTeamId] = (map[g.awayTeamId] ?? 0) + scoringRules.win;
      map[g.homeTeamId] = (map[g.homeTeamId] ?? 0) + scoringRules.loss;
    } else {
      map[g.homeTeamId] = (map[g.homeTeamId] ?? 0) + scoringRules.tie;
      map[g.awayTeamId] = (map[g.awayTeamId] ?? 0) + scoringRules.tie;
    }
  }
  return teams.sort((a, b) => (map[b.id] ?? 0) - (map[a.id] ?? 0));
}

function generateBracket(seededTeams: Team[]): BracketMatchup[][] {
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(seededTeams.length, 2))));
  const slots: (Team | null)[] = [...seededTeams];
  while (slots.length < size) slots.push(null);

  const firstRound: BracketMatchup[] = [];
  for (let i = 0; i < size / 2; i++) {
    firstRound.push({
      homeTeamId: slots[i]?.id ?? null,
      awayTeamId: slots[size - 1 - i]?.id ?? null,
      winnerId: null,
    });
  }

  const rounds: BracketMatchup[][] = [firstRound];
  let currentSize = size / 2;
  while (currentSize > 1) {
    const round: BracketMatchup[] = [];
    for (let i = 0; i < currentSize / 2; i++) {
      round.push({ homeTeamId: null, awayTeamId: null, winnerId: null });
    }
    rounds.push(round);
    currentSize = currentSize / 2;
  }
  return rounds;
}

export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [generating, setGenerating] = useState(false);

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

  async function handleGenerate() {
    if (!league) return;
    setGenerating(true);
    const seeded = computeSeedings([...teams], games, league.scoringRules);
    const rounds = generateBracket(seeded);
    const newBracket: Omit<Bracket, "id"> = {
      rounds,
      generatedAt: Date.now(),
      status: "active",
    };
    const bracketId = await saveBracket(id, newBracket);
    setBracket({ id: bracketId, ...newBracket });
    setGenerating(false);
  }

  async function handlePickWinner(roundIdx: number, matchIdx: number, winnerId: string) {
    if (!bracket) return;
    const updated: Bracket = JSON.parse(JSON.stringify(bracket));
    updated.rounds[roundIdx][matchIdx].winnerId = winnerId;
    if (roundIdx + 1 < updated.rounds.length) {
      const nextMatchIdx = Math.floor(matchIdx / 2);
      const isHome = matchIdx % 2 === 0;
      if (isHome) {
        updated.rounds[roundIdx + 1][nextMatchIdx].homeTeamId = winnerId;
      } else {
        updated.rounds[roundIdx + 1][nextMatchIdx].awayTeamId = winnerId;
      }
    }
    setBracket(updated);
  }

  const teamName = (tid: string | null) =>
    tid ? (teams.find((t) => t.id === tid)?.name ?? "TBD") : "TBD";

  if (!league) return <div className="py-20 text-center" style={{ color: "var(--muted)" }}>Loading…</div>;

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>
          <Link href="/dashboard" className="hover:underline">My Leagues</Link>
          {" / "}
          <Link href={`/leagues/${id}`} className="hover:underline">{league.name}</Link>
          {" / Bracket"}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tournament Bracket</h1>
          <button
            onClick={handleGenerate}
            disabled={generating || teams.length < 2}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {generating ? "Generating…" : bracket ? "Regenerate" : "Generate Bracket"}
          </button>
        </div>
        {bracket && (
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Generated {new Date(bracket.generatedAt).toLocaleDateString()} · Click a team name to advance them
          </p>
        )}
      </div>

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
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {bracket.rounds.map((round, rIdx) => (
              <div key={rIdx} className="flex flex-col justify-around gap-4" style={{ minWidth: 180 }}>
                <div className="text-xs font-medium mb-2 text-center" style={{ color: "var(--muted)" }}>
                  {rIdx === bracket.rounds.length - 1
                    ? "Champion"
                    : rIdx === bracket.rounds.length - 2
                    ? "Final"
                    : rIdx === bracket.rounds.length - 3
                    ? "Semifinals"
                    : `Round ${rIdx + 1}`}
                </div>
                {round.map((matchup, mIdx) => (
                  <div
                    key={mIdx}
                    className="rounded-lg overflow-hidden"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    {[
                      { tid: matchup.homeTeamId, label: "home" },
                      { tid: matchup.awayTeamId, label: "away" },
                    ].map(({ tid }) => (
                      <button
                        key={tid ?? `empty-${mIdx}`}
                        disabled={!tid}
                        onClick={() => tid && handlePickWinner(rIdx, mIdx, tid)}
                        className="w-full text-left px-3 py-2 text-sm transition-colors"
                        style={{
                          background:
                            matchup.winnerId === tid
                              ? "var(--accent)"
                              : "var(--surface)",
                          color:
                            matchup.winnerId === tid
                              ? "#fff"
                              : tid
                              ? "var(--foreground)"
                              : "var(--muted)",
                          borderBottom: "1px solid var(--border)",
                          fontWeight: matchup.winnerId === tid ? 600 : 400,
                        }}
                      >
                        {teamName(tid)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
