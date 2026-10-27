import type { BracketMatchup } from "@/types";
import {
  CARD_H,
  CHAMPION_W,
  CONNECTOR_W,
  LABEL_H,
  ROUND_W,
  bracketHeight,
  championId,
  computeMatchupCenters,
  roundLabel,
} from "@/lib/bracketLayout";

type BracketViewProps = {
  rounds: BracketMatchup[][];
  teamName: (teamId: string) => string;
  seedMap: Record<string, number>;
  // Present: team slots are buttons that advance the clicked team. Absent: read-only.
  onPick?: (roundIdx: number, matchIdx: number, teamId: string) => void;
};

const LABEL_CLASS = "flex items-center justify-center text-[11px] font-medium text-muted tracking-[0.08em] uppercase";

export default function BracketView({ rounds, teamName, seedMap, onPick }: BracketViewProps) {
  const firstRoundCount = rounds[0]?.length ?? 0;
  const totalHeight = bracketHeight(firstRoundCount);
  const allCenters = computeMatchupCenters(firstRoundCount);
  const champion = championId(rounds);
  const finalCenter = allCenters[allCenters.length - 1]?.[0] ?? totalHeight / 2;

  return (
    <div className="flex items-start">
      {rounds.map((round, rIdx) => {
        const centers = allCenters[rIdx] ?? [];
        const isLastRound = rIdx === rounds.length - 1;

        return (
          <div key={rIdx} className="flex items-start">
            {/* Round column */}
            <div className="shrink-0">
              <div className={LABEL_CLASS} style={{ height: LABEL_H, width: ROUND_W }}>
                {roundLabel(rIdx, rounds.length)}
              </div>

              {/* Matchup cards, absolutely positioned within a fixed-height container */}
              <div className="relative" style={{ width: ROUND_W, height: totalHeight }}>
                {round.map((matchup, mIdx) => (
                  <div
                    key={mIdx}
                    className={`absolute left-0 rounded-lg overflow-hidden border-[0.5px] ${matchup.winnerId ? "border-accent" : "border-border"}`}
                    style={{ top: (centers[mIdx] ?? 0) - CARD_H / 2, width: ROUND_W }}
                  >
                    {[matchup.homeTeamId, matchup.awayTeamId].map((tid, slotIdx) => (
                      <TeamSlot
                        key={slotIdx}
                        teamId={tid}
                        isTop={slotIdx === 0}
                        winnerId={matchup.winnerId}
                        name={tid ? teamName(tid) : "TBD"}
                        seed={tid ? seedMap[tid] : undefined}
                        onPick={onPick && tid ? () => onPick(rIdx, mIdx, tid) : undefined}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Connector: bracket lines between rounds, or line to champion */}
            <svg width={CONNECTOR_W} height={totalHeight} className="shrink-0" style={{ marginTop: LABEL_H }}>
              {isLastRound ? (
                <line
                  x1={0} y1={finalCenter}
                  x2={CONNECTOR_W} y2={finalCenter}
                  stroke="var(--border)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ) : (
                centers.map((_, i) => {
                  if (i % 2 !== 0) return null;
                  const y1 = centers[i];
                  const y2 = centers[i + 1];
                  const ymid = allCenters[rIdx + 1]?.[i / 2];
                  if (y2 === undefined || ymid === undefined) return null;
                  const hw = CONNECTOR_W / 2;
                  return (
                    <g key={i} fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={`M0,${y1} H${hw} V${ymid} H${CONNECTOR_W}`} />
                      <path d={`M0,${y2} H${hw} V${ymid} H${CONNECTOR_W}`} />
                    </g>
                  );
                })
              )}
            </svg>
          </div>
        );
      })}

      {/* Champion slot */}
      <div className="shrink-0">
        <div className={LABEL_CLASS} style={{ height: LABEL_H, width: CHAMPION_W }}>
          Champion
        </div>
        <div className="relative" style={{ width: CHAMPION_W, height: totalHeight }}>
          <div
            className="absolute left-0 -translate-y-1/2 flex flex-col items-center gap-2 bg-accent-dim border-[1.5px] border-accent rounded-[10px] px-5 py-4"
            style={{ top: finalCenter, width: CHAMPION_W }}
          >
            {champion ? (
              <>
                <span className="text-[22px]">🏆</span>
                <span className="text-sm font-medium text-accent text-center">{teamName(champion)}</span>
                <span className="text-[11px] text-accent opacity-70">Seed #{seedMap[champion] ?? "?"}</span>
              </>
            ) : (
              <>
                <span className="text-[22px] opacity-20">🏆</span>
                <span className="text-[13px] text-muted">TBD</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamSlot({
  teamId,
  isTop,
  winnerId,
  name,
  seed,
  onPick,
}: {
  teamId: string | null;
  isTop: boolean;
  winnerId: string | null;
  name: string;
  seed?: number;
  onPick?: () => void;
}) {
  const isWinner = !!winnerId && winnerId === teamId;
  const isLoser = !!winnerId && winnerId !== teamId;
  const className = `flex items-center w-full px-3.5 py-[9px] text-left transition-colors ${
    isWinner ? "bg-accent-dim" : "bg-surface-2"
  } ${isTop ? "border-b-[0.5px] border-border" : ""}`;

  const content = (
    <div className="flex items-center gap-2.5">
      {teamId && (
        <span className={`text-[11px] font-medium min-w-3.5 shrink-0 ${isWinner ? "text-accent" : "text-muted"}`}>
          {seed ?? ""}
        </span>
      )}
      <span
        className={`text-[13px] ${isWinner ? "text-accent font-medium" : isLoser || !teamId ? "text-muted" : "text-foreground"}`}
      >
        {name}
      </span>
    </div>
  );

  if (!onPick) return <div className={className}>{content}</div>;
  return (
    <button onClick={onPick} className={`${className} cursor-pointer`}>
      {content}
    </button>
  );
}
