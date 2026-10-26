import Link from "next/link";
import Button, { buttonClasses } from "@/components/ui/Button";
import type { LeagueLoadStatus } from "@/hooks/useLeague";

const MESSAGES: Record<Exclude<LeagueLoadStatus, "loading" | "ready">, { title: string; body: string }> = {
  "not-found": {
    title: "League not found",
    body: "This league has been deleted or never existed.",
  },
  forbidden: {
    title: "No access to this league",
    body: "This league doesn't exist, or it's private and you're not its owner.",
  },
  error: {
    title: "Couldn't load this league",
    body: "Something went wrong while loading. Check your connection and try again.",
  },
};

export default function LeagueStatus({ status, onRetry }: { status: LeagueLoadStatus; onRetry: () => void }) {
  if (status === "loading" || status === "ready") {
    return <div className="flex items-center justify-center py-20 text-muted">Loading…</div>;
  }

  const { title, body } = MESSAGES[status];
  return (
    <div role="alert" className="max-w-md mx-auto mt-16 text-center rounded-xl p-8 bg-surface border border-border">
      <h1 className="text-lg font-bold mb-2">{title}</h1>
      <p className="text-sm text-muted mb-6">{body}</p>
      <div className="flex justify-center gap-3">
        <Link href="/dashboard" className={buttonClasses("secondary")}>
          Back to My Leagues
        </Link>
        {status === "error" && <Button onClick={onRetry}>Try again</Button>}
      </div>
    </div>
  );
}
