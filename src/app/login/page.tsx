"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) { setError("Invalid username or password."); return; }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1c1c1c" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span style={{ color: "#d97757" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="1" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 300, color: "#e2e2e2", letterSpacing: "-0.02em" }}>A3 V2</span>
          </div>
          <p className="text-sm" style={{ color: "#666" }}>Agile Artifact Architect</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              required
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{ background: "#252525", border: "1px solid #333", color: "#e2e2e2" }}
              onFocus={e => (e.target.style.borderColor = "#d97757")}
              onBlur={e => (e.target.style.borderColor = "#333")}
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{ background: "#252525", border: "1px solid #333", color: "#e2e2e2" }}
              onFocus={e => (e.target.style.borderColor = "#d97757")}
              onBlur={e => (e.target.style.borderColor = "#333")}
            />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-50 mt-1"
            style={{ background: "#d97757", color: "#fff" }}
            onMouseEnter={e => !loading && ((e.target as HTMLElement).style.background = "#e8845f")}
            onMouseLeave={e => !loading && ((e.target as HTMLElement).style.background = "#d97757")}
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs" style={{ color: "#444" }}>
          admin / password
        </p>
      </div>
    </div>
  );
}
