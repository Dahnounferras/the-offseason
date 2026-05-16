"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getUserLeagues, createLeague } from "@/lib/firestore/leagues";
import type { League } from "@/types";

const SPORTS = ["Basketball", "Soccer", "Softball", "Football", "Volleyball", "Hockey", "Other"];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", sport: "Basketball", totalGames: 10, customSport: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getUserLeagues(user.uid).then(setLeagues);
    }
  }, [user]);

  async function handleCreate() {
    if (!user || !form.name.trim()) return;
    setSaving(true);
    const id = await createLeague({
      name: form.name.trim(),
      sport: form.sport === "Other" ? form.customSport.trim() || "Other" : form.sport,
      ownerId: user.uid,
      season: { totalGames: form.totalGames, currentGame: 0 },
      scoringRules: { win: 2, tie: 1, loss: 0 },
      isPublic: false,
    });
    router.push(`/leagues/${id}`);
  }

  const activeLeagues = leagues.filter((l) => !l.status || l.status === "active");
  const pastLeagues = leagues.filter((l) => l.status === "ended");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Leagues</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="cursor-pointer px-4 py-2 rounded-lg font-semibold text-sm transition-colors hover:opacity-90"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          + New League
        </button>
      </div>

      {/* Active Leagues */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Active Leagues
        </h2>
        {activeLeagues.length === 0 && !showCreate ? (
          <div
            className="text-center py-16 rounded-xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-lg font-medium mb-2">No active leagues</p>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              Create your first league to get started.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="cursor-pointer px-4 py-2 rounded-lg font-semibold text-sm"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Create a League
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLeagues.map((league) => (
              <Link
                key={league.id}
                href={`/leagues/${league.id}`}
                className="p-5 rounded-xl transition-colors hover:opacity-80"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}
              >
                <div className="text-xs font-medium mb-1" style={{ color: "var(--accent)" }}>
                  {league.sport}
                </div>
                <h2 className="font-semibold text-lg">{league.name}</h2>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  {league.season.totalGames} game season
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Past Leagues */}
      {pastLeagues.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Past Leagues
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastLeagues.map((league) => (
              <Link
                key={league.id}
                href={`/leagues/${league.id}`}
                className="p-5 rounded-xl transition-colors hover:opacity-70"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  opacity: 0.65,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                    {league.sport}
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                  >
                    ENDED
                  </span>
                </div>
                <h2 className="font-semibold text-lg">{league.name}</h2>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  {league.season.totalGames} game season
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div
            className="w-full max-w-md p-6 rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-bold mb-4">Create a League</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">League Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Monday Night Hoops"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sport</label>
                <select
                  value={form.sport}
                  onChange={(e) => setForm({ ...form, sport: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  {SPORTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              {form.sport === "Other" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Sport name</label>
                  <input
                    type="text"
                    value={form.customSport}
                    onChange={(e) => setForm({ ...form, customSport: e.target.value })}
                    placeholder="e.g. Pickleball, Dodgeball…"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Season Length (games)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.totalGames}
                  onChange={(e) => setForm({ ...form, totalGames: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim()}
                className="cursor-pointer flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {saving ? "Creating…" : "Create League"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
