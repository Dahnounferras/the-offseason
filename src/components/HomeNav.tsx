"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState } from "react";
import Spinner from "@/components/Spinner";

export default function HomeNav() {
  const { user, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut(auth);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      {loading ? (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        />
      ) : user ? (
        <>
          <Link
            href="/dashboard"
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: "var(--accent)",
              color: "#000",
              fontWeight: 600,
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            My leagues
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px 4px 4px",
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? ""}
                style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  flexShrink: 0,
                }}
              >
                {user.displayName?.[0] ?? user.email?.[0] ?? "?"}
              </div>
            )}
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.displayName ?? user.email}
            </span>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                background: "none",
                border: "none",
                cursor: signingOut ? "default" : "pointer",
                color: "var(--muted)",
                fontSize: "0.75rem",
                padding: 0,
                marginLeft: 4,
                opacity: signingOut ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {signingOut ? <><Spinner /> Signing out…</> : "Sign out"}
            </button>
          </div>
        </>
      ) : (
        <>
          <Link
            href="/login"
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--foreground)",
              fontWeight: 500,
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
          <Link
            href="/login"
            style={{
              padding: "8px 18px",
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
        </>
      )}
    </div>
  );
}
