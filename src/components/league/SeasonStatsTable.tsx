import type { Player } from "@/types";
import type { SportConfig } from "@/lib/sportConfig";
import { emptyTotals, perGame, type StatTotals } from "@/lib/stats";
import { JerseyBadge, StatHeaderCells, StatValueCell } from "@/components/league/statCells";

type SeasonStatsTableProps = {
  rows: { player: Player; teamName: string }[];
  totals: Record<string, StatTotals>;
  sportConfig: SportConfig;
  emptyMessage: string;
};

// League-wide season totals, sorted by the sport's primary stat.
export default function SeasonStatsTable({ rows, totals, sportConfig, emptyMessage }: SeasonStatsTableProps) {
  const { statKeys, primaryStat } = sportConfig;
  const sorted = rows
    .map((r) => ({ ...r, totals: totals[r.player.id] ?? emptyTotals(statKeys) }))
    .sort((a, b) => (b.totals[primaryStat] ?? 0) - (a.totals[primaryStat] ?? 0));

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-surface-2">
          <th className="text-left px-4 py-3">Player</th>
          <th className="text-left px-4 py-3">Team</th>
          <th className="px-4 py-3 text-center text-muted">GP</th>
          <StatHeaderCells sportConfig={sportConfig} className="px-4 py-3" />
          <th className="px-4 py-3 text-center text-muted">{sportConfig.computedStatLabel}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.length === 0 ? (
          <tr>
            <td colSpan={statKeys.length + 4} className="text-center py-10 text-muted">{emptyMessage}</td>
          </tr>
        ) : (
          sorted.map(({ player, teamName, totals: t }, i) => (
            <tr key={player.id} className={i % 2 === 0 ? "bg-surface" : "bg-surface-2"}>
              <td className="px-4 py-3 font-medium">
                <JerseyBadge number={player.jerseyNumber} className="mr-2" />
                {player.firstName} {player.lastName}
              </td>
              <td className="px-4 py-3 text-muted">{teamName}</td>
              <td className="px-4 py-3 text-center text-muted">{t.gp}</td>
              {statKeys.map((k) => (
                <StatValueCell key={k} sportConfig={sportConfig} statKey={k} className="px-4 py-3">
                  {t[k] ?? 0}
                </StatValueCell>
              ))}
              <td className="px-4 py-3 text-center text-muted">{perGame(t, primaryStat)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
