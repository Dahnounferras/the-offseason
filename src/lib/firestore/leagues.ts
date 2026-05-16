import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { League, Team, Game, Bracket, Player } from "@/types";

export async function getLeague(leagueId: string): Promise<League | null> {
  const snap = await getDoc(doc(db, "leagues", leagueId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as League) : null;
}

export async function getUserLeagues(userId: string): Promise<League[]> {
  const q = query(collection(db, "leagues"), where("ownerId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as League));
}

export async function createLeague(
  data: Omit<League, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "leagues"), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateLeague(
  leagueId: string,
  data: Partial<League>
): Promise<void> {
  await updateDoc(doc(db, "leagues", leagueId), data);
}

export async function getTeams(leagueId: string): Promise<Team[]> {
  const snap = await getDocs(collection(db, "leagues", leagueId, "teams"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
}

export async function addTeam(
  leagueId: string,
  name: string
): Promise<string> {
  const ref = await addDoc(collection(db, "leagues", leagueId, "teams"), {
    name,
    wins: 0,
    losses: 0,
    ties: 0,
  });
  return ref.id;
}

export async function getGames(leagueId: string): Promise<Game[]> {
  const snap = await getDocs(collection(db, "leagues", leagueId, "games"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Game));
}

export async function addGame(
  leagueId: string,
  game: Omit<Game, "id">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "leagues", leagueId, "games"),
    game
  );
  return ref.id;
}

export async function getPlayers(leagueId: string, teamId: string): Promise<Player[]> {
  const snap = await getDocs(collection(db, "leagues", leagueId, "teams", teamId, "players"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player));
}

export async function addPlayer(
  leagueId: string,
  teamId: string,
  data: Omit<Player, "id">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "leagues", leagueId, "teams", teamId, "players"),
    data
  );
  return ref.id;
}

export async function endLeague(leagueId: string): Promise<void> {
  await updateLeague(leagueId, { status: "ended" });
}

export async function deleteLeague(leagueId: string): Promise<void> {
  await updateLeague(leagueId, { status: "deleted" });
}

export async function getBracket(leagueId: string): Promise<Bracket | null> {
  const snap = await getDocs(
    collection(db, "leagues", leagueId, "brackets")
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    ...data,
    // Firestore can't store nested arrays, so rounds are stored as [{matchups:[]}]
    rounds: (data.rounds as { matchups: Bracket["rounds"][number] }[]).map((r) => r.matchups),
  } as Bracket;
}

export async function saveBracket(
  leagueId: string,
  bracket: Omit<Bracket, "id">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "leagues", leagueId, "brackets"),
    {
      ...bracket,
      rounds: bracket.rounds.map((matchups) => ({ matchups })),
    }
  );
  return ref.id;
}

export async function deleteBracket(leagueId: string, bracketId: string): Promise<void> {
  await deleteDoc(doc(db, "leagues", leagueId, "brackets", bracketId));
}

export async function updateBracket(
  leagueId: string,
  bracketId: string,
  rounds: Bracket["rounds"]
): Promise<void> {
  await updateDoc(
    doc(db, "leagues", leagueId, "brackets", bracketId),
    { rounds: rounds.map((matchups) => ({ matchups })) }
  );
}
