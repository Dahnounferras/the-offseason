"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useLeague } from "@/hooks/useLeague";

// segment is the child route under /leagues/[id]; null is the overview.
const TABS: { label: string; segment: string | null }[] = [
  { label: "Overview", segment: null },
  { label: "Games", segment: "games" },
  { label: "Stats", segment: "stats" },
  { label: "Teams", segment: "teams" },
  { label: "Bracket", segment: "bracket" },
];

// League title and tab bar, rendered once by the league layout above every tab.
export default function LeagueHeader() {
  const { league, games } = useLeague();
  const active = useSelectedLayoutSegment();
  const played = games.filter((g) => g.status === "played").length;

  return (
    <div className="mb-6">
      <div className="text-sm mb-1 text-muted">
        <Link href="/dashboard" className="hover:underline">My Leagues</Link> / {league.name}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold">{league.name}</h1>
        {league.status === "ended" && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-2 text-muted border border-border">
            Season Ended
          </span>
        )}
      </div>
      <p className="text-sm text-muted mt-1">
        <span className="text-accent">{league.sport}</span>
        {games.length > 0 && <> &bull; {played} / {league.season.totalGames} games played</>}
      </p>

      <nav aria-label="League sections" className="mt-4 border-b border-border overflow-x-auto">
        <ul className="flex gap-1 whitespace-nowrap">
          {TABS.map(({ label, segment }) => {
            const isActive = active === segment;
            return (
              <li key={label}>
                <Link
                  href={`/leagues/${league.id}${segment ? `/${segment}` : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-block px-3 sm:px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    isActive
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
