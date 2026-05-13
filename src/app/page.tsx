import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="max-w-2xl w-full">
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          The <span style={{ color: "var(--accent)" }}>Offseason</span>
        </h1>
        <p className="text-lg mb-8" style={{ color: "var(--muted)" }}>
          Run your recreational league for free. Track standings, input stats,
          and generate tournament brackets for any sport.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg font-semibold transition-colors hover:opacity-90"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Get Started — It&apos;s Free
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            {
              title: "Any Sport",
              body: "Basketball, soccer, softball, bowling — custom stat fields for any game.",
            },
            {
              title: "Live Standings",
              body: "Standings update the moment you enter a game score. No manual math.",
            },
            {
              title: "Tournament Brackets",
              body: "Generate a bracket seeded from your regular season standings in one click.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-xl"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
