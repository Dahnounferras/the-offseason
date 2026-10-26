import type { SportConfig } from "@/lib/sportConfig";

// The sport's primary stat (PTS, GLS, …) is highlighted in every stat table.
function isPrimary(sportConfig: SportConfig, key: string) {
  return key === sportConfig.primaryStat;
}

export function statAbbrev(sportConfig: SportConfig, key: string) {
  return sportConfig.statLabels[key]?.abbrev ?? key.toUpperCase();
}

export function StatHeaderCells({ sportConfig, className }: { sportConfig: SportConfig; className: string }) {
  return sportConfig.statKeys.map((k) => (
    <th
      key={k}
      className={`${className} text-center ${isPrimary(sportConfig, k) ? "text-accent font-bold" : "text-muted font-normal"}`}
    >
      {statAbbrev(sportConfig, k)}
    </th>
  ));
}

export function StatValueCell({
  sportConfig,
  statKey,
  className,
  children,
}: {
  sportConfig: SportConfig;
  statKey: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <td className={`${className} text-center ${isPrimary(sportConfig, statKey) ? "text-accent font-semibold" : "text-muted"}`}>
      {children}
    </td>
  );
}

export function JerseyBadge({ number, className = "" }: { number?: number; className?: string }) {
  if (number === undefined) return null;
  return <span className={`font-mono text-xs text-accent ${className}`}>#{number}</span>;
}
