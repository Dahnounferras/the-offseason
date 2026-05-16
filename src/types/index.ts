export interface League {
  id: string;
  name: string;
  sport: string;
  ownerId: string;
  season: { totalGames: number; currentGame: number };
  scoringRules: { win: number; tie: number; loss: number };
  isPublic: boolean;
  createdAt: number;
  status?: "active" | "ended" | "deleted";
}

export interface Team {
  id: string;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  seed?: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: number;
  teamId: string;
  stats: Record<string, number>;
}

export interface StatLine {
  playerId: string;
  stats: Record<string, number>;
}

export interface Game {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  playedAt: number;
  statLines: StatLine[];
}

export interface BracketMatchup {
  homeTeamId: string | null;
  awayTeamId: string | null;
  winnerId: string | null;
}

export interface Bracket {
  id: string;
  rounds: BracketMatchup[][];
  generatedAt: number;
  status: "active" | "complete";
}
