import Link from "next/link";
import type { StandingRow } from "@/lib/standings";

type StandingsTableProps = {
  rows: StandingRow[];
  leagueId: string;
  // Full adds PF, PA and sportsmanship rating; compact stops at points.
  variant?: "full" | "compact";
  emptyMessage?: string;
  // Extra trailing cell per row, e.g. roster link and delete button on the teams page.
  actions?: (row: StandingRow) => React.ReactNode;
  dimmedTeamId?: string | null;
};

export default function StandingsTable({
  rows,
  leagueId,
  variant = "full",
  emptyMessage,
  actions,
  dimmedTeamId,
}: StandingsTableProps) {
  const full = variant === "full";
  const colCount = 7 + (full ? 3 : 0) + (actions ? 1 : 0);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-surface-2">
          <th className="text-left px-4 py-3">#</th>
          <th className="text-left px-4 py-3">Team</th>
          <th className="px-4 py-3 text-center">GP</th>
          <th className="px-4 py-3 text-center text-win">W</th>
          <th className="px-4 py-3 text-center text-loss">L</th>
          <th className="px-4 py-3 text-center text-tie">T</th>
          <th className="px-4 py-3 text-center font-bold text-accent">PTS</th>
          {full && (
            <>
              <th className="px-4 py-3 text-center">PF</th>
              <th className="px-4 py-3 text-center">PA</th>
              <th className="px-4 py-3 text-center">RTG</th>
            </>
          )}
          {actions && <th className="px-4 py-3"></th>}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && emptyMessage && (
          <tr>
            <td colSpan={colCount} className="text-center py-8 text-muted">{emptyMessage}</td>
          </tr>
        )}
        {rows.map((row, i) => (
          <tr
            key={row.team.id}
            className={`${i % 2 === 0 ? "bg-surface" : "bg-surface-2"} ${dimmedTeamId === row.team.id ? "opacity-40" : ""}`}
          >
            <td className="px-4 py-3 text-muted">{i + 1}</td>
            <td className="px-4 py-3 font-medium">
              <Link href={`/leagues/${leagueId}/teams/${row.team.id}`} className="hover:underline text-foreground">
                {row.team.name}
              </Link>
            </td>
            <td className="px-4 py-3 text-center text-muted">{row.gp}</td>
            <td className="px-4 py-3 text-center text-win">{row.w}</td>
            <td className="px-4 py-3 text-center text-loss">{row.l}</td>
            <td className="px-4 py-3 text-center text-tie">{row.t}</td>
            <td className="px-4 py-3 text-center font-bold text-accent">{row.pts}</td>
            {full && (
              <>
                <td className="px-4 py-3 text-center text-muted">{row.pf}</td>
                <td className="px-4 py-3 text-center text-muted">{row.pa}</td>
                <td className="px-4 py-3 text-center text-muted">
                  {row.sportCount > 0 ? (row.sportSum / row.sportCount).toFixed(1) : "—"}
                </td>
              </>
            )}
            {actions && (
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-3">{actions(row)}</div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
