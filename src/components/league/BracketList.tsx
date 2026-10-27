import type { BracketMatchup } from "@/types";
import { championId, roundLabel } from "@/lib/bracketLayout";
import { TeamSlot } from "@/components/league/BracketView";

type BracketListProps = {
  rounds: BracketMatchup[][];
  teamName: (teamId: string) => string;
  seedMap: Record<string, number>;
  onPick?: (roundIdx: number, matchIdx: number, teamId: string) => void;
};

// Phone layout of the bracket: one stacked section per round, full-width matchup cards.
// Same props and pick behavior as BracketView, which needs a wide screen.
export default function BracketList({ rounds, teamName, seedMap, onPick }: BracketListProps) {
  const champion = championId(rounds);

  return (
    <div className="space-y-5">
      {rounds.map((round, rIdx) => (
        <section key={rIdx}>
          <h3 className="text-[11px] font-medium text-muted tracking-[0.08em] uppercase mb-2">
            {roundLabel(rIdx, rounds.length)}
          </h3>
          <ul className="space-y-2">
            {round.map((matchup, mIdx) => (
              <li
                key={mIdx}
                className={`rounded-lg overflow-hidden border-[0.5px] ${matchup.winnerId ? "border-accent" : "border-border"}`}
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
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="flex items-center gap-3 rounded-[10px] px-4 py-3 bg-accent-dim border-[1.5px] border-accent">
        <span className={`text-[22px] ${champion ? "" : "opacity-20"}`} aria-hidden="true">🏆</span>
        <div>
          <p className="text-[11px] font-medium text-muted tracking-[0.08em] uppercase">Champion</p>
          {champion ? (
            <p className="text-sm font-medium text-accent">
              {teamName(champion)} <span className="text-[11px] opacity-70">· Seed #{seedMap[champion] ?? "?"}</span>
            </p>
          ) : (
            <p className="text-[13px] text-muted">TBD</p>
          )}
        </div>
      </section>
    </div>
  );
}
