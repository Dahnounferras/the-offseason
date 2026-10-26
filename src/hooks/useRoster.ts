"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { addPlayer, updatePlayer, deletePlayer } from "@/lib/firestore/leagues";
import {
  EMPTY_PLAYER_FORM,
  formToPlayerData,
  isPlayerFormComplete,
  jerseyError,
  playerToForm,
  type PlayerFormValues,
} from "@/lib/roster";
import type { Player } from "@/types";

// Add / edit / remove for one team's roster. The caller owns the players list so it can
// also feed stats or other views; every write is merged into it locally, no re-fetch.
export function useRoster(
  leagueId: string,
  teamId: string,
  players: Player[],
  setPlayers: Dispatch<SetStateAction<Player[]>>
) {
  const [addForm, setAddFormState] = useState<PlayerFormValues>(EMPTY_PLAYER_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<Player | null>(null);
  const [editForm, setEditFormState] = useState<PlayerFormValues>(EMPTY_PLAYER_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);

  // Typing clears a stale validation error.
  function setAddForm(form: PlayerFormValues) {
    setAddError(null);
    setAddFormState(form);
  }

  function setEditForm(form: PlayerFormValues) {
    setEditError(null);
    setEditFormState(form);
  }

  async function add() {
    if (!isPlayerFormComplete(addForm)) return;
    const error = jerseyError(addForm, players);
    if (error) return setAddError(error);
    setAdding(true);
    try {
      const data = { ...formToPlayerData(addForm), teamId };
      const playerId = await addPlayer(leagueId, teamId, data);
      setPlayers((prev) => [...prev, { id: playerId, ...data }]);
      setAddFormState(EMPTY_PLAYER_FORM);
    } finally {
      setAdding(false);
    }
  }

  function startEdit(player: Player) {
    setEditing(player);
    setEditError(null);
    setEditFormState(playerToForm(player));
  }

  function cancelEdit() {
    setEditing(null);
    setEditError(null);
  }

  async function save() {
    if (!editing || !isPlayerFormComplete(editForm)) return;
    const error = jerseyError(editForm, players, editing.id);
    if (error) return setEditError(error);
    setSaving(true);
    try {
      const data = formToPlayerData(editForm);
      const clearJersey = data.jerseyNumber === undefined && editing.jerseyNumber !== undefined;
      await updatePlayer(leagueId, teamId, editing.id, data, clearJersey);
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== editing.id) return p;
          const next = { ...p, ...data };
          if (clearJersey) delete next.jerseyNumber;
          return next;
        })
      );
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function remove(player: Player) {
    setRemovingId(player.id);
    try {
      await deletePlayer(leagueId, teamId, player.id);
      setPlayers((prev) => prev.filter((p) => p.id !== player.id));
    } finally {
      setRemovingId(null);
    }
  }

  return {
    addForm, setAddForm, addError, adding, add,
    editing, editForm, setEditForm, editError, saving, startEdit, cancelEdit, save,
    removingId, remove,
  };
}
