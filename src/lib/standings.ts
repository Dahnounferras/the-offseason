import type { Team, Game, League } from "@/types";

export type StandingRow = {
  team: Team;
  pts: number;
  w: number;
  l: number;
  t: number;
  gp: number;
  pf: number;
  pa: number;
  sportSum: number;
  sportCount: number;
};

export function computeStandings(
  teams: Team[],
  games: Game[],
  scoringRules: League["scoringRules"]
): StandingRow[] {
  const map: Record<string, StandingRow> = {};
  for (const t of teams) {
    map[t.id] = { team: t, pts: 0, w: 0, l: 0, t: 0, gp: 0, pf: 0, pa: 0, sportSum: 0, sportCount: 0 };
  }
  const playedGames = games.filter((g) => g.status !== "scheduled");
  for (const g of playedGames) {
    const home = map[g.homeTeamId];
    const away = map[g.awayTeamId];
    if (!home || !away) continue;
    home.gp++;
    away.gp++;
    const hs = g.homeScore ?? 0;
    const as_ = g.awayScore ?? 0;
    home.pf += hs; home.pa += as_;
    away.pf += as_; away.pa += hs;
    if (g.homeSportsmanship !== undefined) { home.sportSum += g.homeSportsmanship; home.sportCount++; }
    if (g.awaySportsmanship !== undefined) { away.sportSum += g.awaySportsmanship; away.sportCount++; }
    if (hs > as_) {
      home.w++; home.pts += scoringRules.win;
      away.l++; away.pts += scoringRules.loss;
    } else if (as_ > hs) {
      away.w++; away.pts += scoringRules.win;
      home.l++; home.pts += scoringRules.loss;
    } else {
      home.t++; home.pts += scoringRules.tie;
      away.t++; away.pts += scoringRules.tie;
    }
  }
  return Object.values(map).sort((a, b) => b.pts - a.pts || b.w - a.w);
}
