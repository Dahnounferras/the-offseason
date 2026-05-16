import Link from "next/link";
import LeaguePreview from "@/components/LeaguePreview";
import HomeNav from "@/components/HomeNav";

const sports = [
  { icon: "🏀", label: "Basketball" },
  { icon: "🏈", label: "Football" },
  { icon: "⚽", label: "Soccer" },
  { icon: "⚾", label: "Baseball" },
  { icon: "🏐", label: "Volleyball" },
  { icon: "···", label: "Any sport" },
];

const features = [
  {
    icon: "☰",
    title: "Live standings",
    body: "Auto-updated win/loss records and points as you enter game results.",
  },
  {
    icon: "📅",
    title: "Custom season length",
    body: "Set however many games fit your schedule — 10 games or 82, your call.",
  },
  {
    icon: "📊",
    title: "Player stat tracking",
    body: "Log per-game stats for every player and view season-long leaderboards.",
  },
  {
    icon: "🔀",
    title: "Playoff brackets",
    body: "Auto-seed tournament brackets straight from your regular season standings.",
  },
];

const freeFeatures = [
  "Unlimited leagues",
  "Standings & schedules",
  "Player stat tracking",
  "Playoff brackets",
  "Any sport",
];

const proFeatures = [
  "Everything in Free",
  "Ad-free experience",
  "Custom league branding",
  "Advanced stat exports",
  "Priority support",
];

export default function LandingPage() {
  return (
    <>
      {/* ── Nav ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(15,17,23,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "var(--foreground)",
              fontWeight: 700,
              fontSize: "1rem",
              flexShrink: 0,
            }}
          >
            <img src="/logo.png" alt="" style={{ width: 30, height: 30, borderRadius: 8 }} />
            The Offseason
          </Link>

          {/* Nav links */}
          <nav
            style={{
              display: "flex",
              gap: 24,
              flex: 1,
              fontSize: "0.875rem",
              color: "var(--muted)",
            }}
            className="nav-links"
          >
            <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>
              Features
            </a>
            <a href="#preview" style={{ color: "inherit", textDecoration: "none" }}>
              How it works
            </a>
            <a href="#pricing" style={{ color: "inherit", textDecoration: "none" }}>
              Pricing
            </a>
          </nav>

          <HomeNav />
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "80px 24px 60px",
            textAlign: "center",
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              fontSize: "0.82rem",
              color: "var(--muted)",
              marginBottom: 32,
            }}
          >
            🏆 Free for every league, every sport
          </div>

          <h1
            style={{
              fontSize: "clamp(2.4rem, 6vw, 4rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginBottom: 20,
            }}
          >
            Your league.
            <br />
            <span style={{ color: "var(--accent)" }}>Your rules. Your stats.</span>
          </h1>

          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--muted)",
              maxWidth: 520,
              margin: "0 auto 36px",
              lineHeight: 1.65,
            }}
          >
            Set up standings, track player stats, and run tournament brackets — for any sport,
            any skill level, totally free.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 24px",
                borderRadius: 8,
                background: "var(--accent)",
                color: "#000",
                fontWeight: 600,
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              + Create a league
            </Link>
          </div>
        </section>

        {/* ── Sport pills ── */}
        <section
          style={{
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            padding: "20px 24px",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: "0.85rem", flexShrink: 0 }}>
              Works for any sport:
            </span>
            {sports.map((s) => (
              <span
                key={s.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  fontSize: "0.82rem",
                  color: "var(--foreground)",
                }}
              >
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section
          id="features"
          style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px" }}
        >
          <div style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>
            FEATURES
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 12 }}>
            Everything a commissioner needs
          </h2>
          <p style={{ color: "var(--muted)", maxWidth: 480, lineHeight: 1.6, marginBottom: 48 }}>
            From day one of the season to the championship bracket — manage your league start to finish.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  padding: "24px",
                  borderRadius: 12,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: "var(--accent-dim)",
                    border: "1px solid var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    marginBottom: 16,
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live Preview ── */}
        <section
          id="preview"
          style={{
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            padding: "80px 24px",
          }}
        >
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>
              LIVE PREVIEW
            </div>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 40 }}>
              See it in action
            </h2>
            <LeaguePreview />
          </div>
        </section>

        {/* ── Pricing ── */}
        <section
          id="pricing"
          style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px" }}
        >
          <div style={{ color: "var(--accent)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>
            PRICING
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 12 }}>
            Always free. Optionally more.
          </h2>
          <p style={{ color: "var(--muted)", maxWidth: 480, lineHeight: 1.6, marginBottom: 48 }}>
            The core experience is free forever. A future Pro tier can unlock extras for power commissioners.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              maxWidth: 700,
            }}
          >
            {/* Free tier */}
            <div
              style={{
                padding: 28,
                borderRadius: 12,
                background: "var(--surface)",
                border: "1px solid var(--accent)",
                position: "relative",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 20,
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                Free forever
              </span>
              <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>Free</div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: 4 }}>$0</div>
              <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 24 }}>
                For any league, always
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
                {freeFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
                    <span style={{ color: "var(--accent)", fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "10px",
                  borderRadius: 8,
                  background: "var(--accent)",
                  color: "#000",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textDecoration: "none",
                }}
              >
                Create a league
              </Link>
            </div>

            {/* Pro tier */}
            <div
              style={{
                padding: 28,
                borderRadius: 12,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                opacity: 0.85,
              }}
            >
              <div style={{ color: "var(--muted)", fontSize: "0.72rem", fontWeight: 600, marginBottom: 16, letterSpacing: "0.05em" }}>
                Pro
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4 }}>Coming soon</div>
              <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 24 }}>
                For serious commissioners
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {proFeatures.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", color: "var(--muted)" }}>
                    <span style={{ color: "var(--muted)", fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "28px 24px",
          textAlign: "center",
          color: "var(--muted)",
          fontSize: "0.82rem",
        }}
      >
        © {new Date().getFullYear()} The Offseason. Free for every league.
      </footer>
    </>
  );
}
