"use client";

import { use } from "react";
import { LeagueProvider } from "@/hooks/useLeague";
import LeagueHeader from "@/components/league/LeagueHeader";

// Layouts don't re-render on navigation, so the league loaded here (and the header with
// its tab bar) is shared by every tab. The provider renders an error screen instead when
// the league can't be loaded, so the header never shows without a league.
export default function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <LeagueProvider key={id} leagueId={id}>
      <LeagueHeader />
      {children}
    </LeagueProvider>
  );
}
