"use client";

import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { getLeague, getTeams, getGames, getBracket, getPlayers } from "@/lib/firestore/leagues";
import LeagueStatus from "@/components/league/LeagueStatus";
import type { League, Team, Game, Bracket, Player, PlayersByTeam } from "@/types";

export type LeagueLoadStatus = "loading" | "ready" | "not-found" | "forbidden" | "error";

type LeagueContextValue = {
  league: League;
  teams: Team[];
  games: Game[];
  bracket: Bracket | null;
  players: PlayersByTeam;
  setLeague: Dispatch<SetStateAction<League>>;
  setTeams: Dispatch<SetStateAction<Team[]>>;
  setGames: Dispatch<SetStateAction<Game[]>>;
  setBracket: Dispatch<SetStateAction<Bracket | null>>;
  setPlayers: Dispatch<SetStateAction<PlayersByTeam>>;
};

const LeagueContext = createContext<LeagueContextValue | null>(null);

// Firestore denies reads of a league ID that doesn't exist (the rules read resource.data),
// so permission-denied covers both "someone else's private league" and "no such league".
export function classifyLoadError(err: unknown): LeagueLoadStatus {
  return (err as { code?: string } | null)?.code === "permission-denied" ? "forbidden" : "error";
}

const byGameNumber = (a: Game, b: Game) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0);

async function getTeamsWithPlayers(leagueId: string): Promise<[Team[], PlayersByTeam]> {
  const teams = await getTeams(leagueId);
  const rosters = await Promise.all(teams.map((t) => getPlayers(leagueId, t.id)));
  return [teams, Object.fromEntries(teams.map((t, i) => [t.id, rosters[i]]))];
}

// Loads a league and its teams, rosters, games and bracket once for every page under /leagues/[id].
// Pages write through Firestore and then update this state, so other tabs see the change
// without re-fetching. Children only render once the league is ready.
export function LeagueProvider({ leagueId, children }: { leagueId: string; children: React.ReactNode }) {
  const [status, setStatus] = useState<LeagueLoadStatus>("loading");
  const [league, setLeagueState] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [players, setPlayers] = useState<PlayersByTeam>({});

  // Bumped by Retry to re-run the load effect.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getLeague(leagueId), getTeamsWithPlayers(leagueId), getGames(leagueId), getBracket(leagueId)])
      .then(([l, [t, p], g, b]) => {
        if (cancelled) return;
        if (!l || l.status === "deleted") {
          setStatus("not-found");
          return;
        }
        setLeagueState(l);
        setTeams(t);
        setPlayers(p);
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
    <LeagueContext.Provider value={{ league, teams, games, bracket, players, setLeague, setTeams, setGames, setBracket, setPlayers }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague must be used inside <LeagueProvider>");
  return ctx;
}

const NO_PLAYERS: Player[] = [];

// One team's roster from the shared state, with a setter shaped like useState's,
// so useRoster can edit it and every tab sees the change.
export function useTeamPlayers(teamId: string): [Player[], Dispatch<SetStateAction<Player[]>>] {
  const { players, setPlayers } = useLeague();
  const setTeamPlayers: Dispatch<SetStateAction<Player[]>> = useCallback(
    (action) =>
      setPlayers((prev) => {
        const current = prev[teamId] ?? [];
        return { ...prev, [teamId]: typeof action === "function" ? action(current) : action };
      }),
    [setPlayers, teamId]
  );
  return [players[teamId] ?? NO_PLAYERS, setTeamPlayers];
}
