export interface League {
  id: string;
  name: string;
  sport: string;
  ownerId: string;
  season: { totalGames: number };
  scoringRules: { win: number; tie: number; loss: number };
  isPublic: boolean;
  createdAt: number;
  status?: "active" | "ended" | "deleted";
}

export interface Team {
  id: string;
  name: string;
  seed?: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: number;
  teamId: string;
}

// Rosters keyed by team ID. A team with no entry has no players yet; entries for
// deleted teams may linger, so always look players up through the current teams.
export type PlayersByTeam = Record<string, Player[]>;

export interface StatLine {
  playerId: string;
  stats: Record<string, number>;
}

export interface Game {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  gameNumber?: number;
  status: "scheduled" | "played";
  homeScore?: number;
  awayScore?: number;
  homeSportsmanship?: number;
  awaySportsmanship?: number;
  playedAt?: number;
  // Optional schedule details, set from the game page.
  scheduledAt?: number;
  location?: string;
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
