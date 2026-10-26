import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { isPlayerFormComplete, type PlayerFormValues } from "@/lib/roster";

type PlayerFormProps = {
  values: PlayerFormValues;
  onChange: (values: PlayerFormValues) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  onCancel?: () => void;
  error?: string | null;
  // Inline: one wrapping row (team page). Stacked: names, then jersey + buttons (roster modal).
  layout?: "inline" | "stacked";
  // Editing an existing player: accent borders and compact inputs.
  editing?: boolean;
};

export default function PlayerForm({
  values,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
  submittingLabel,
  onCancel,
  error,
  layout = "inline",
  editing = false,
}: PlayerFormProps) {
  const nameTone = editing ? "accent" : "default";
  const jerseyTone = error ? "error" : nameTone;
  const submitOnEnter = (e: React.KeyboardEvent) => e.key === "Enter" && onSubmit();
  const inline = layout === "inline";

  const names = (
    <>
      <Input
        type="text"
        placeholder="First name"
        aria-label="First name"
        value={values.firstName}
        onChange={(e) => onChange({ ...values, firstName: e.target.value })}
        onKeyDown={submitOnEnter}
        tone={nameTone}
        compact={editing}
        className={inline ? "min-w-28" : "flex-1 min-w-0"}
      />
      <Input
        type="text"
        placeholder="Last name"
        aria-label="Last name"
        value={values.lastName}
        onChange={(e) => onChange({ ...values, lastName: e.target.value })}
        onKeyDown={submitOnEnter}
        tone={nameTone}
        compact={editing}
        className={inline ? "min-w-28" : "flex-1 min-w-0"}
      />
    </>
  );

  const jerseyAndActions = (
    <>
      <Input
        type="number"
        placeholder="Jersey # (optional)"
        aria-label="Jersey number"
        value={values.jerseyNumber}
        onChange={(e) => onChange({ ...values, jerseyNumber: e.target.value })}
        onKeyDown={submitOnEnter}
        tone={jerseyTone}
        compact={editing}
        className={inline ? "w-40" : "flex-1 min-w-0"}
      />
      {onCancel && (
        <Button variant="ghost" size={editing ? "sm" : "md"} onClick={onCancel}>
          Cancel
        </Button>
      )}
      <Button
        size={editing ? "sm" : "md"}
        onClick={onSubmit}
        disabled={!isPlayerFormComplete(values)}
        loading={submitting}
        loadingText={submittingLabel}
      >
        {submitLabel}
      </Button>
    </>
  );

  return (
    <div>
      {inline ? (
        <div className="flex items-center gap-2 flex-wrap">
          {names}
          {jerseyAndActions}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">{names}</div>
          <div className="flex gap-2">{jerseyAndActions}</div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-loss">{error}</p>}
    </div>
  );
}
