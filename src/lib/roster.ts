import type { Player } from "@/types";

export type PlayerFormValues = { firstName: string; lastName: string; jerseyNumber: string };

export const EMPTY_PLAYER_FORM: PlayerFormValues = { firstName: "", lastName: "", jerseyNumber: "" };

export function playerToForm(player: Player): PlayerFormValues {
  return {
    firstName: player.firstName,
    lastName: player.lastName,
    jerseyNumber: player.jerseyNumber !== undefined ? String(player.jerseyNumber) : "",
  };
}

export function isPlayerFormComplete(form: PlayerFormValues): boolean {
  return !!form.firstName.trim() && !!form.lastName.trim();
}

// Jersey numbers are unique within a team. Pass the player being edited so they don't clash with themselves.
export function jerseyError(form: PlayerFormValues, roster: Player[], editingId?: string): string | null {
  if (!form.jerseyNumber.trim()) return null;
  const num = Number(form.jerseyNumber);
  const taken = roster.some((p) => p.jerseyNumber === num && p.id !== editingId);
  return taken ? `Jersey #${num} is already taken by another player.` : null;
}

// Trimmed names, plus jerseyNumber only when one was entered.
export function formToPlayerData(form: PlayerFormValues): Pick<Player, "firstName" | "lastName" | "jerseyNumber"> {
  const data: Pick<Player, "firstName" | "lastName" | "jerseyNumber"> = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
  };
  if (form.jerseyNumber.trim()) data.jerseyNumber = Number(form.jerseyNumber);
  return data;
}

export function sortByJersey(players: Player[]): Player[] {
  return [...players].sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999));
}
