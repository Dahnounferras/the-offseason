// Parses the two score inputs. Scores are whole numbers, 0 or more; anything else is null.
export function parseScoreInput(home: string, away: string): { home: number; away: number } | null {
  const valid = (v: string) => /^\d+$/.test(v.trim());
  if (!valid(home) || !valid(away)) return null;
  return { home: Number(home), away: Number(away) };
}

const pad = (n: number) => String(n).padStart(2, "0");

// Epoch ms → the local "YYYY-MM-DDTHH:mm" an <input type="datetime-local"> expects.
export function toDateTimeLocal(ms: number | undefined): string {
  if (ms === undefined) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The reverse; empty or invalid input means no date.
export function fromDateTimeLocal(value: string): number | undefined {
  if (!value) return undefined;
  // A date-time string without an offset is parsed as local time.
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

// e.g. "Mon, Oct 26, 7:30 PM" in the viewer's locale.
export function formatGameWhen(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
