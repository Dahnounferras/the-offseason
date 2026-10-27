import type { League } from "@/types";

export const MAX_SEASON_GAMES = 100;

// Form state is kept as strings so inputs can be cleared while typing.
export type SettingsForm = {
  name: string;
  win: string;
  tie: string;
  loss: string;
  totalGames: string;
};

export type SettingsUpdate = Pick<League, "name" | "scoringRules" | "season">;

export function leagueToSettingsForm(league: League): SettingsForm {
  return {
    name: league.name,
    win: String(league.scoringRules.win),
    tie: String(league.scoringRules.tie),
    loss: String(league.scoringRules.loss),
    totalGames: String(league.season.totalGames),
  };
}

const isWholeNumber = (v: string) => /^\d+$/.test(v.trim());

// Returns the update to write, or an error message. Once a schedule exists the
// season length is locked, so the league's current value is kept.
export function validateSettings(
  form: SettingsForm,
  league: League,
  { scheduled }: { scheduled: boolean }
): { update: SettingsUpdate } | { error: string } {
  const name = form.name.trim();
  if (!name) return { error: "League name can't be empty." };

  if (![form.win, form.tie, form.loss].every(isWholeNumber)) {
    return { error: "Points must be whole numbers, 0 or more." };
  }

  let totalGames = league.season.totalGames;
  if (!scheduled) {
    totalGames = Number(form.totalGames);
    if (!isWholeNumber(form.totalGames) || totalGames < 1 || totalGames > MAX_SEASON_GAMES) {
      return { error: `Season length must be between 1 and ${MAX_SEASON_GAMES} games.` };
    }
  }

  return {
    update: {
      name,
      scoringRules: { win: Number(form.win), tie: Number(form.tie), loss: Number(form.loss) },
      season: { ...league.season, totalGames },
    },
  };
}
