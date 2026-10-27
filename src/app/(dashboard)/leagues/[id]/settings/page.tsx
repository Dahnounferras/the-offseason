"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { updateLeague, endLeague, deleteLeague, reactivateLeague, resetLeague } from "@/lib/firestore/leagues";
import { useLeague } from "@/hooks/useLeague";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/errors";
import { leagueToSettingsForm, validateSettings, MAX_SEASON_GAMES, type SettingsForm } from "@/lib/leagueSettings";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmModal from "@/components/ui/ConfirmModal";

type DangerAction = "end" | "reactivate" | "reset" | "delete";

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { league, games, setLeague, setGames, setBracket } = useLeague();
  const toast = useToast();

  const [form, setForm] = useState<SettingsForm>(() => leagueToSettingsForm(league));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState<DangerAction | null>(null);
  const [actioning, setActioning] = useState(false);

  const scheduled = games.length > 0;
  const ended = league.status === "ended";

  function update(patch: Partial<SettingsForm>) {
    setFormError(null);
    setForm((f) => ({ ...f, ...patch }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const result = validateSettings(form, league, { scheduled });
    if ("error" in result) return setFormError(result.error);
    setSaving(true);
    try {
      await updateLeague(id, result.update);
      setLeague((l) => ({ ...l, ...result.update }));
      setForm(leagueToSettingsForm({ ...league, ...result.update }));
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // On success the page navigates away; finally only matters when the write fails.
  async function handleEndSeason() {
    setActioning(true);
    try {
      await endLeague(id);
      router.push("/dashboard");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActioning(false);
    }
  }

  async function handleDeleteLeague() {
    setActioning(true);
    try {
      await deleteLeague(id);
      router.push("/dashboard");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActioning(false);
    }
  }

  async function handleReset() {
    setActioning(true);
    try {
      await resetLeague(id);
      setGames([]);
      setBracket(null);
      setConfirm(null);
      toast.success("League reset. Teams and rosters were kept.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActioning(false);
    }
  }

  async function handleReactivate() {
    setActioning(true);
    try {
      await reactivateLeague(id);
      setLeague((l) => ({ ...l, status: "active" }));
      setConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActioning(false);
    }
  }

  const cancelConfirm = () => setConfirm(null);

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-lg font-semibold">Settings</h2>

      <form onSubmit={handleSave} className="rounded-xl p-5 bg-surface border border-border space-y-5">
        <h3 className="font-semibold">General</h3>

        <div>
          <label htmlFor="league-name" className="block text-sm font-medium mb-1">League name</label>
          <Input
            id="league-name"
            type="text"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            className="w-full"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium mb-1">Points per result</legend>
          <p className="text-xs text-muted mb-2">Standings on every tab update as soon as you save.</p>
          <div className="grid grid-cols-3 gap-3">
            {(["win", "tie", "loss"] as const).map((k) => (
              <div key={k}>
                <label htmlFor={`points-${k}`} className="block text-xs text-muted mb-1 capitalize">{k}</label>
                <Input
                  id={`points-${k}`}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={form[k]}
                  onChange={(e) => update({ [k]: e.target.value })}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="season-length" className="block text-sm font-medium mb-1">Season length (games)</label>
          <Input
            id="season-length"
            type="number"
            min={1}
            max={MAX_SEASON_GAMES}
            inputMode="numeric"
            value={form.totalGames}
            onChange={(e) => update({ totalGames: e.target.value })}
            disabled={scheduled}
            aria-describedby={scheduled ? "season-length-note" : undefined}
            className="w-32 disabled:opacity-60"
          />
          {scheduled && (
            <p id="season-length-note" className="text-xs text-muted mt-1">
              The schedule has been generated. Reset the league to change season length.
            </p>
          )}
        </div>

        {formError && <p role="alert" className="text-sm text-loss">{formError}</p>}

        <Button type="submit" loading={saving} loadingText="Saving…">Save changes</Button>
      </form>

      <section className="rounded-xl p-5 bg-surface border border-loss/50">
        <h3 className="font-semibold mb-4 text-loss">Danger zone</h3>
        <ul className="divide-y divide-border">
          {ended ? (
            <DangerRow
              title="Reactivate league"
              description="Move the league back to Active Leagues so results and the bracket can be edited again."
              action={<Button variant="secondary" size="sm" onClick={() => setConfirm("reactivate")}>Reactivate</Button>}
            />
          ) : (
            <DangerRow
              title="End season"
              description="Move the league to Past Leagues. Stats and standings are kept, and editing is locked."
              action={<Button variant="warning" size="sm" onClick={() => setConfirm("end")}>End Season</Button>}
            />
          )}
          {scheduled && !ended && (
            <DangerRow
              title="Reset league"
              description="Clear every result, player stat and the bracket. Teams and rosters are kept."
              action={<Button variant="danger" size="sm" onClick={() => setConfirm("reset")}>Reset League</Button>}
            />
          )}
          <DangerRow
            title="Delete league"
            description="Remove the league from your dashboard. This can't be undone."
            action={<Button variant="danger" size="sm" onClick={() => setConfirm("delete")}>Delete League</Button>}
          />
        </ul>
      </section>

      {confirm === "end" && (
        <ConfirmModal
          title="End this season?"
          confirmLabel="End Season"
          busyLabel="Ending…"
          variant="warning"
          busy={actioning}
          onConfirm={handleEndSeason}
          onCancel={cancelConfirm}
        >
          The league will move to Past Leagues. Stats and standings are preserved.
        </ConfirmModal>
      )}

      {confirm === "reactivate" && (
        <ConfirmModal
          title="Reactivate this league?"
          confirmLabel="Reactivate"
          busyLabel="Reactivating…"
          variant="primary"
          busy={actioning}
          onConfirm={handleReactivate}
          onCancel={cancelConfirm}
        >
          The league will move back to Active Leagues. You can create a new tournament bracket.
        </ConfirmModal>
      )}

      {confirm === "reset" && (
        <ConfirmModal
          title="Reset this league?"
          confirmLabel="Reset League"
          busyLabel="Resetting…"
          busy={actioning}
          onConfirm={handleReset}
          onCancel={cancelConfirm}
        >
          All game results, player stats and the tournament bracket will be cleared. Teams and rosters are kept. The schedule will need to be re-generated.
        </ConfirmModal>
      )}

      {confirm === "delete" && (
        <ConfirmModal
          title="Delete this league?"
          confirmLabel="Delete League"
          busyLabel="Deleting…"
          busy={actioning}
          onConfirm={handleDeleteLeague}
          onCancel={cancelConfirm}
        >
          This will permanently remove the league from your dashboard. This cannot be undone.
        </ConfirmModal>
      )}
    </div>
  );
}

function DangerRow({ title, description, action }: { title: string; description: string; action: React.ReactNode }) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}
