import type { Game, Player } from "@/types";
import type { SportConfig } from "@/lib/sportConfig";
import { findStatLine, type StatDraft } from "@/lib/stats";
import { JerseyBadge, StatHeaderCells, StatValueCell } from "@/components/league/statCells";

type StatGridProps = {
  rows: { player: Player; teamName?: string }[];
  game: Game;
  sportConfig: SportConfig;
  editing: boolean;
  draft: StatDraft;
  onDraftChange: (playerId: string, key: string, value: string) => void;
  // Dense: smaller text and a separate # column, for the side-by-side box scores on the game page.
  dense?: boolean;
  emptyMessage?: string;
};

// One game's stat lines, read-only or as an entry grid. Shows "—" for players with no saved line.
export default function StatGrid({
  rows,
  game,
  sportConfig,
  editing,
  draft,
  onDraftChange,
  dense = false,
  emptyMessage = "No players found for these teams.",
}: StatGridProps) {
  const statKeys = sportConfig.statKeys;
  const showTeam = rows.some((r) => r.teamName !== undefined);
  const head = dense ? "px-3 py-2 text-xs" : "px-4 py-2";
  const cell = dense ? "px-3 py-2.5 text-xs" : "px-4 py-2.5";
  const colCount = statKeys.length + (dense ? 2 : 1) + (showTeam ? 1 : 0);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-surface-2">
          {dense && <th className={`${head} text-left text-muted`}>#</th>}
          <th className={`${head} text-left ${dense ? "" : "font-medium text-muted"}`}>Player</th>
          {showTeam && <th className={`${head} text-left font-medium text-muted`}>Team</th>}
          <StatHeaderCells sportConfig={sportConfig} className={head} />
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={colCount} className="text-center py-8 text-muted">{emptyMessage}</td>
          </tr>
        ) : (
          rows.map(({ player, teamName }, i) => {
            const saved = findStatLine(game, player.id);
            return (
              <tr key={player.id} className={i % 2 === 0 ? "bg-surface" : "bg-surface-2"}>
                {dense && (
                  <td className={cell}>
                    <JerseyBadge number={player.jerseyNumber} />
                  </td>
                )}
                <td className={`${cell} font-medium`}>
                  {!dense && <JerseyBadge number={player.jerseyNumber} className="mr-2" />}
                  {player.firstName} {player.lastName}
                </td>
                {showTeam && <td className={`${cell} text-muted`}>{teamName}</td>}
                {statKeys.map((k) =>
                  editing ? (
                    <td key={k} className={`${dense ? "px-1" : "px-2"} py-2 text-center`}>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        aria-label={`${player.firstName} ${player.lastName} ${k}`}
                        value={draft[player.id]?.[k] ?? ""}
                        onChange={(e) => onDraftChange(player.id, k, e.target.value)}
                        className={`${dense ? "w-12 text-xs" : "w-14 text-sm"} px-1 py-1 rounded text-center outline-none bg-surface-2 border border-border text-foreground`}
                      />
                    </td>
                  ) : (
                    <StatValueCell key={k} sportConfig={sportConfig} statKey={k} className={cell}>
                      {saved ? (saved.stats[k] ?? 0) : "—"}
                    </StatValueCell>
                  )
                )}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
