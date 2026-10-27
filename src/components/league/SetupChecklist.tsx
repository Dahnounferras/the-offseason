"use client";

import Link from "next/link";
import Button, { buttonClasses } from "@/components/ui/Button";
import { nextStep, type SetupStep } from "@/lib/setup";

type SetupChecklistProps = {
  leagueId: string;
  steps: SetupStep[];
  onStart: () => void;
  starting: boolean;
  onHide: () => void;
};

// Getting-started card on the overview. Only the next required step gets an action,
// plus the optional roster hint, so the card always points at one thing to do.
export default function SetupChecklist({ leagueId, steps, onStart, starting, onHide }: SetupChecklistProps) {
  const next = nextStep(steps);
  const doneCount = steps.filter((s) => s.done).length;

  function action(step: SetupStep) {
    switch (step.id) {
      case "teams":
        return <span className="text-xs text-muted">Use the Teams panel below.</span>;
      case "players":
        return <span className="text-xs text-muted">Click a team below to edit its roster.</span>;
      case "start":
        return (
          <Button size="sm" onClick={onStart} loading={starting} loadingText="Generating…">
            Start League
          </Button>
        );
      case "result":
        return <Link href={`/leagues/${leagueId}/games`} className={buttonClasses("primary", "sm")}>Go to Games</Link>;
      case "bracket":
        return <Link href={`/leagues/${leagueId}/bracket`} className={buttonClasses("primary", "sm")}>Open Bracket</Link>;
    }
  }

  return (
    <section aria-labelledby="setup-title" className="mb-6 rounded-xl p-4 sm:p-5 bg-surface border border-border">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 id="setup-title" className="font-semibold">Get your league running</h2>
          <p className="text-xs text-muted">{doneCount} of {steps.length} done</p>
        </div>
        <button onClick={onHide} className="cursor-pointer text-xs text-muted hover:text-foreground underline">
          Hide
        </button>
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => {
          const isNext = step.id === next?.id;
          const showAction = step.available && !step.done && (isNext || step.optional);
          return (
            <li
              key={step.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg ${
                isNext ? "bg-surface-2 border border-accent" : ""
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <span
                  aria-hidden="true"
                  className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.done ? "bg-win text-black" : "bg-surface-2 text-muted border border-border"
                  }`}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <span className={`text-sm ${step.done ? "text-muted line-through" : step.available ? "" : "text-muted"}`}>
                  {step.label}
                  {step.optional && <span className="text-xs text-muted"> (optional)</span>}
                  <span className="sr-only">{step.done ? " (done)" : ""}</span>
                </span>
              </div>
              {showAction && <div className="pl-9 sm:pl-0">{action(step)}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
