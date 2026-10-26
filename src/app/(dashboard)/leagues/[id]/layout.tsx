"use client";

import { use } from "react";
import { LeagueProvider } from "@/hooks/useLeague";

// Layouts don't re-render on navigation, so the league loaded here is shared by every tab.
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
      {children}
    </LeagueProvider>
  );
}
