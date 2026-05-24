export function generateSchedule(
  teamIds: string[],
  totalGames: number
): { homeTeamId: string; awayTeamId: string }[] {
  const list = teamIds.length % 2 === 0 ? [...teamIds] : [...teamIds, "BYE"];
  const size = list.length;
  const allMatchups: { homeTeamId: string; awayTeamId: string }[] = [];
  let safety = 0;
  while (allMatchups.length < totalGames && safety < 1000) {
    safety++;
    for (let r = 0; r < size - 1 && allMatchups.length < totalGames; r++) {
      for (let i = 0; i < size / 2 && allMatchups.length < totalGames; i++) {
        const home = list[i], away = list[size - 1 - i];
        if (home !== "BYE" && away !== "BYE") allMatchups.push({ homeTeamId: home, awayTeamId: away });
      }
      list.splice(1, 0, list.pop()!);
    }
  }
  return allMatchups.slice(0, totalGames);
}
