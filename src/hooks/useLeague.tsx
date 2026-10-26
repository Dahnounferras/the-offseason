"use client";

import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { getLeague, getTeams, getGames, getBracket } from "@/lib/firestore/leagues";
import LeagueStatus from "@/components/league/LeagueStatus";
import type { League, Team, Game, Bracket } from "@/types";

export type LeagueLoadStatus = "loading" | "ready" | "not-found" | "forbidden" | "error";

type LeagueContextValue = {
  league: League;
  teams: Team[];
  games: Game[];
  bracket: Bracket | null;
  setLeague: Dispatch<SetStateAction<League>>;
  setTeams: Dispatch<SetStateAction<Team[]>>;
  setGames: Dispatch<SetStateAction<Game[]>>;
  setBracket: Dispatch<SetStateAction<Bracket | null>>;
};

const LeagueContext = createContext<LeagueContextValue | null>(null);

// Firestore denies reads of a league ID that doesn't exist (the rules read resource.data),
// so permission-denied covers both "someone else's private league" and "no such league".
export function classifyLoadError(err: unknown): LeagueLoadStatus {
  return (err as { code?: string } | null)?.code === "permission-denied" ? "forbidden" : "error";
}

const byGameNumber = (a: Game, b: Game) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0);

// Loads a league and its teams, games and bracket once for every page under /leagues/[id].
// Pages write through Firestore and then update this state, so other tabs see the change
// without re-fetching. Children only render once the league is ready.
export function LeagueProvider({ leagueId, children }: { leagueId: string; children: React.ReactNode }) {
  const [status, setStatus] = useState<LeagueLoadStatus>("loading");
  const [league, setLeagueState] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [bracket, setBracket] = useState<Bracket | null>(null);

  // Bumped by Retry to re-run the load effect.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getLeague(leagueId), getTeams(leagueId), getGames(leagueId), getBracket(leagueId)])
      .then(([l, t, g, b]) => {
        if (cancelled) return;
        if (!l || l.status === "deleted") {
          setStatus("not-found");
          return;
        }
        setLeagueState(l);
        setTeams(t);
        setGames(g.sort(byGameNumber));
        setBracket(b);
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) setStatus(classifyLoadError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [leagueId, attempt]);

  function retry() {
    setStatus("loading");
    setAttempt((n) => n + 1);
  }

  const setLeague: Dispatch<SetStateAction<League>> = useCallback((action) => {
    setLeagueState((prev) => (prev ? (typeof action === "function" ? action(prev) : action) : prev));
  }, []);

  if (status !== "ready" || !league) {
    return <LeagueStatus status={status} onRetry={retry} />;
  }

  return (
    <LeagueContext.Provider value={{ league, teams, games, bracket, setLeague, setTeams, setGames, setBracket }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague must be used inside <LeagueProvider>");
  return ctx;
}
