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

      if (!res.ok) {
        setError("Invalid username or password.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <span className="text-xl font-bold" style={{ color: "#6366f1" }}>A3</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#ededed" }}>A3 V2</h1>
          <p className="mt-1 text-sm" style={{ color: "#666" }}>Agile Artifact Architect</p>
        </div>

        {/* Card */}
        <div className="rounded-xl p-6" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "#0a0a0a",
                  border: "1px solid #2a2a2a",
                  color: "#ededed",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "#0a0a0a",
                  border: "1px solid #2a2a2a",
                  color: "#ededed",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
              />
            </div>

            {error && (
              <p className="text-xs py-2 px-3 rounded-lg" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "#6366f1", color: "#fff" }}
              onMouseEnter={(e) => !loading && ((e.target as HTMLElement).style.background = "#818cf8")}
              onMouseLeave={(e) => !loading && ((e.target as HTMLElement).style.background = "#6366f1")}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: "#444" }}>
          Default: admin / password
        </p>
      </div>
    </div>
  );
}
