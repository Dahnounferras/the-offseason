import type { Bracket, Game, PlayersByTeam, Team } from "@/types";
import { MIN_BRACKET_TEAMS } from "@/lib/bracket";

export type SetupStepId = "teams" | "players" | "start" | "result" | "bracket";

export type SetupStep = {
  id: SetupStepId;
  label: string;
  done: boolean;
  // Whether the step can be acted on yet; earlier required steps must be done.
  available: boolean;
  optional?: boolean;
};

const MIN_TEAMS = 2;

// The new-league checklist, in order. Players are optional, so they never block later steps.
export function setupSteps({
  teams,
  players,
  games,
  bracket,
}: {
  teams: Team[];
  players: PlayersByTeam;
  games: Game[];
  bracket: Bracket | null;
}): SetupStep[] {
  const hasTeams = teams.length >= MIN_TEAMS;
  const hasPlayers = teams.some((t) => (players[t.id]?.length ?? 0) > 0);
  const started = games.length > 0;
  const hasResult = games.some((g) => g.status === "played");

  return [
    { id: "teams", label: `Add at least ${MIN_TEAMS} teams`, done: hasTeams, available: true },
    { id: "players", label: "Add players to rosters", done: hasPlayers, available: teams.length > 0, optional: true },
    { id: "start", label: "Start the season", done: started, available: hasTeams },
    { id: "result", label: "Record your first result", done: hasResult, available: started },
    {
      id: "bracket",
      label: "Generate the playoff bracket",
      done: bracket !== null,
      available: started && teams.length >= MIN_BRACKET_TEAMS,
    },
  ];
}

// The first required step that isn't done, which the checklist highlights.
export function nextStep(steps: SetupStep[]): SetupStep | null {
  return steps.find((s) => !s.done && !s.optional) ?? null;
}
