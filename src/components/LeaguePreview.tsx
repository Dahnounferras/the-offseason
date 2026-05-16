"use client";

import { useState } from "react";

type Tab = "standings" | "bracket" | "stats";

const teams = [
  { rank: 1, name: "Raleigh Rim Rockers", w: 11, l: 3, pct: 0.786, playoff: true },
  { rank: 2, name: "Durham Dunkers", w: 10, l: 4, pct: 0.714, playoff: true },
  { rank: 3, name: "Chapel Hill Chiefs", w: 9, l: 5, pct: 0.643, playoff: true },
  { rank: 4, name: "Cary Clutch", w: 8, l: 6, pct: 0.571, playoff: true },
  { rank: 5, name: "Apex Assassins", w: 6, l: 8, pct: 0.429, playoff: false },
  { rank: 6, name: "Morrisville Mavericks", w: 5, l: 9, pct: 0.357, playoff: false },
];

const players = [
  { name: "J. Thompson", team: "Rim Rockers", pts: 22.4, ast: 4.1, reb: 6.2 },
  { name: "M. Davis", team: "Dunkers", pts: 19.8, ast: 7.3, reb: 3.1 },
  { name: "K. Williams", team: "Chiefs", pts: 18.2, ast: 2.9, reb: 8.7 },
  { name: "T. Johnson", team: "Cary Clutch", pts: 17.5, ast: 5.6, reb: 4.4 },
  { name: "D. Brown", team: "Rim Rockers", pts: 15.9, ast: 3.2, reb: 5.8 },
];

function StandingsTab() {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
      <thead>
        <tr style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500 }}>#</th>
          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500 }}>Team</th>
          <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 500 }}>W</th>
          <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 500 }}>L</th>
          <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 500 }}>PCT</th>
          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500, minWidth: 80 }}>Win %</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((t) => (
          <tr key={t.rank} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 8px", color: "var(--muted)" }}>{t.rank}</td>
            <td style={{ padding: "8px 8px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: t.playoff ? "var(--accent)" : "var(--muted)",
                    flexShrink: 0,
                  }}
                />
                {t.name}
                {t.playoff && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      background: "var(--accent-dim)",
                      color: "var(--accent)",
                      border: "1px solid var(--accent)",
                      borderRadius: 4,
                      padding: "1px 4px",
                      fontWeight: 600,
                    }}
                  >
                    P
                  </span>
                )}
              </span>
            </td>
            <td style={{ padding: "8px 8px", textAlign: "center" }}>{t.w}</td>
            <td style={{ padding: "8px 8px", textAlign: "center" }}>{t.l}</td>
            <td style={{ padding: "8px 8px", textAlign: "center", color: "var(--muted)" }}>
              {t.pct.toFixed(3)}
            </td>
            <td style={{ padding: "8px 8px" }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "var(--surface-2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${t.pct * 100}%`,
                    borderRadius: 3,
                    background: t.playoff ? "var(--accent)" : "var(--muted)",
                  }}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BracketTab() {
  const semi = [
    { top: "Raleigh Rim Rockers", bottom: "Cary Clutch", winner: "Raleigh Rim Rockers" },
    { top: "Durham Dunkers", bottom: "Chapel Hill Chiefs", winner: "Durham Dunkers" },
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "16px 8px",
        fontSize: "0.8rem",
      }}
    >
      {/* Semis */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32, flex: 1 }}>
        {semi.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[m.top, m.bottom].map((team) => (
              <div
                key={team}
                style={{
                  padding: "7px 10px",
                  borderRadius: 6,
                  background: team === m.winner ? "var(--accent-dim)" : "var(--surface-2)",
                  border: `1px solid ${team === m.winner ? "var(--accent)" : "var(--border)"}`,
                  color: team === m.winner ? "var(--accent)" : "var(--foreground)",
                  fontWeight: team === m.winner ? 600 : 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 180,
                }}
              >
                {team}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Connector lines */}
      <div style={{ width: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            height: 80,
            borderRight: "2px solid var(--border)",
            borderTop: "2px solid var(--border)",
            borderBottom: "2px solid var(--border)",
            width: 12,
            alignSelf: "flex-end",
          }}
        />
      </div>
      {/* Final */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 4, color: "var(--muted)", fontSize: "0.7rem", fontWeight: 600 }}>
          CHAMPIONSHIP
        </div>
        <div
          style={{
            padding: "7px 10px",
            borderRadius: 6,
            background: "var(--accent-dim)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            fontWeight: 600,
            fontSize: "0.8rem",
          }}
        >
          TBD
        </div>
      </div>
    </div>
  );
}

function StatsTab() {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
      <thead>
        <tr style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500 }}>Player</th>
          <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 500 }}>Team</th>
          <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 500 }}>PTS</th>
          <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 500 }}>AST</th>
          <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 500 }}>REB</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p) => (
          <tr key={p.name} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 8px", fontWeight: 500 }}>{p.name}</td>
            <td style={{ padding: "8px 8px", color: "var(--muted)" }}>{p.team}</td>
            <td style={{ padding: "8px 8px", textAlign: "center" }}>{p.pts}</td>
            <td style={{ padding: "8px 8px", textAlign: "center" }}>{p.ast}</td>
            <td style={{ padding: "8px 8px", textAlign: "center" }}>{p.reb}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LeaguePreview() {
  const [tab, setTab] = useState<Tab>("standings");

  const tabs: { id: Tab; label: string }[] = [
    { id: "standings", label: "Standings" },
    { id: "bracket", label: "Bracket" },
    { id: "stats", label: "Player stats" },
  ];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          background: "var(--surface-2)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
        <span
          style={{
            flex: 1,
            marginLeft: 8,
            background: "var(--background)",
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: "0.75rem",
            color: "var(--muted)",
          }}
        >
          theoffseason.app/league/triangle-hoops
        </span>
      </div>

      {/* League header */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Triangle Hoops League</div>
            <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 2 }}>
              Basketball · Season 3 · 8 teams · 24-game season
            </div>
          </div>
          <span
            style={{
              fontSize: "0.72rem",
              background: "var(--accent-dim)",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: 20,
              padding: "3px 10px",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Week 14 of 24
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 16, borderBottom: "1px solid var(--border)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? "var(--accent)" : "var(--muted)",
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
                transition: "color 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: "0 12px 12px" }}>
        {tab === "standings" && <StandingsTab />}
        {tab === "bracket" && <BracketTab />}
        {tab === "stats" && <StatsTab />}
      </div>

      {/* Footer note */}
      {tab === "standings" && (
        <div
          style={{
            padding: "8px 20px 12px",
            fontSize: "0.72rem",
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              background: "var(--accent-dim)",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: 4,
              padding: "1px 4px",
              fontWeight: 600,
            }}
          >
            P
          </span>
          Playoff position · Top 4 teams qualify
        </div>
      )}
    </div>
  );
}
