"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLeague, getTeams, getGames, addGame } from "@/lib/firestore/leagues";
import type { League, Team, Game } from "@/types";

export default function GamesPage() {
  const { id } = useParams<{ id: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [form, setForm] = useState({ homeTeamId: "", awayTeamId: "", homeScore: 0, awayScore: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getLeague(id), getTeams(id), getGames(id)]).then(([l, t, g]) => {
      if (l) {
        setLeague(l);
        if (t.length >= 2) setForm((f) => ({ ...f, homeTeamId: t[0].id, awayTeamId: t[1].id }));
      }
      setTeams(t);
      setGames(g.sort((a, b) => b.playedAt - a.playedAt));
    });
  }, [id]);

  async function handleSubmit() {
    if (!form.homeTeamId || !form.awayTeamId || form.homeTeamId === form.awayTeamId) return;
    setSaving(true);
    await addGame(id, {
      homeTeamId: form.homeTeamId,
      awayTeamId: form.awayTeamId,
      homeScore: form.homeScore,
      awayScore: form.awayScore,
      playedAt: Date.now(),
      statLines: [],
    });
    const updated = await getGames(id);
    setGames(updated.sort((a, b) => b.playedAt - a.playedAt));
    setForm((f) => ({ ...f, homeScore: 0, awayScore: 0 }));
    setSaving(false);
  }

  const teamName = (tid: string) => teams.find((t) => t.id === tid)?.name ?? tid;

  if (!league) return <div className="py-20 text-center" style={{ color: "var(--muted)" }}>Loading…</div>;

  return (
    <div>
      <div className="mb-6">
        <div className="text-sm mb-1" style={{ color: "var(--muted)" }}>
          <Link href="/dashboard" className="hover:underline">My Leagues</Link>
          {" / "}
          <Link href={`/leagues/${id}`} className="hover:underline">{league.name}</Link>
          {" / Games"}
        </div>
        <h1 className="text-2xl font-bold">Games</h1>
      </div>

      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="font-semibold mb-4">Enter Game Result</h2>
        {teams.length < 2 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Add at least 2 teams on the{" "}
            <Link href={`/leagues/${id}`} className="underline">league page</Link> first.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Home Team</label>
              <select
                value={form.homeTeamId}
                onChange={(e) => setForm({ ...form, homeTeamId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="w-20">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Score</label>
              <input
                type="number"
                min={0}
                value={form.homeScore}
                onChange={(e) => setForm({ ...form, homeScore: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg text-sm text-center outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
            </div>
            <div className="text-sm font-bold px-1" style={{ color: "var(--muted)" }}>vs</div>
            <div className="w-20">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Score</label>
              <input
                type="number"
                min={0}
                value={form.awayScore}
                onChange={(e) => setForm({ ...form, awayScore: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg text-sm text-center outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>Away Team</label>
              <select
                value={form.awayTeamId}
                onChange={(e) => setForm({ ...form, awayTeamId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {saving ? "Saving…" : "Save Result"}
            </button>
          </div>
        )}
      </div>

      <h2 className="font-semibold mb-3">Game Log</h2>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {games.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: "var(--muted)" }}>No games recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <th className="text-left px-4 py-3">Home</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="text-right px-4 py-3">Away</th>
                <th className="text-right px-4 py-3" style={{ color: "var(--muted)" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g, i) => (
                <tr key={g.id} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                  <td className="px-4 py-3 font-medium">{teamName(g.homeTeamId)}</td>
                  <td className="px-4 py-3 text-center font-bold">
                    {g.homeScore} – {g.awayScore}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{teamName(g.awayTeamId)}</td>
                  <td className="px-4 py-3 text-right text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(g.playedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
