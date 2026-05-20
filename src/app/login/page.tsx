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
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) { setError("Invalid credentials. Please try again."); return; }
      router.push("/dashboard");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(22,37,80,0.6)",
    border: "1px solid rgba(58,84,153,0.4)",
    borderRadius: 6,
    padding: "11px 14px",
    fontSize: 13.5,
    color: "var(--navy-50)",
    outline: "none",
    fontFamily: "var(--font-body)",
    transition: "border-color 0.2s",
    letterSpacing: "0.01em",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--navy-900)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(58,84,153,0.2) 0%, transparent 60%)",
    }}>
      <div style={{ width: "100%", maxWidth: 360, padding: "0 24px" }}>

        {/* ── Brand mark ── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          {/* Diamond motif */}
          <div style={{ color: "var(--gold-500)", fontSize: 14, letterSpacing: "0.5em", marginBottom: 20, opacity: 0.6 }}>◆ · ◆</div>
          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "2.2rem",
            fontWeight: 700,
            color: "var(--gold-400)",
            letterSpacing: "0.2em",
            lineHeight: 1,
            marginBottom: 10,
          }}>A3 V2</h1>
          <p style={{
            fontFamily: "var(--font-heading)",
            fontSize: 9,
            letterSpacing: "0.28em",
            color: "var(--navy-400)",
            textTransform: "uppercase",
          }}>
            Agile Artifact Architect
          </p>
          {/* Gold rule */}
          <div style={{ margin: "18px auto 0", width: 60, height: 1, background: "linear-gradient(90deg, transparent, var(--gold-700), transparent)" }} />
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text" value={username} onChange={e => setUsername(e.target.value)}
            placeholder="Username" autoComplete="username" required
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "var(--gold-500)")}
            onBlur={e => (e.target.style.borderColor = "rgba(58,84,153,0.4)")}
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" autoComplete="current-password" required
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "var(--gold-500)")}
            onBlur={e => (e.target.style.borderColor = "rgba(58,84,153,0.4)")}
          />

          {error && (
            <div style={{
              fontSize: 12, color: "#e8a0a0",
              background: "rgba(200,80,80,0.1)", border: "1px solid rgba(200,80,80,0.2)",
              borderRadius: 6, padding: "8px 12px", fontFamily: "var(--font-body)",
            }}>{error}</div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 6,
              width: "100%", padding: "11px 14px",
              background: loading ? "var(--gold-700)" : "var(--gold-500)",
              color: "var(--navy-900)",
              border: "none", borderRadius: 6,
              fontSize: 13, fontWeight: 600,
              fontFamily: "var(--font-heading)",
              letterSpacing: "0.12em",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--gold-400)"; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--gold-500)"; }}
          >
            {loading ? "SIGNING IN…" : "CONTINUE"}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "var(--navy-600)", fontFamily: "var(--font-body)", letterSpacing: "0.04em" }}>
          Default: admin / password
        </p>
      </div>
    </div>
  );
}
