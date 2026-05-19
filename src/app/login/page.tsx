"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const Asterisk = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

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

  const inputBase: React.CSSProperties = {
    width: "100%",
    background: "#212121",
    border: "1px solid #2d2d2d",
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 14,
    color: "#e4e4e4",
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#181818", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 360, padding: "0 24px" }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ color: "#d97757" }}><Asterisk /></span>
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1.75rem", fontWeight: 300, color: "#e4e4e4", letterSpacing: "-0.02em" }}>A3 V2</span>
          </div>
          <p style={{ fontSize: 13, color: "#666" }}>Agile Artifact Architect</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
            style={inputBase}
            onFocus={e => (e.target.style.borderColor = "#d97757")}
            onBlur={e => (e.target.style.borderColor = "#2d2d2d")}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            style={inputBase}
            onFocus={e => (e.target.style.borderColor = "#d97757")}
            onBlur={e => (e.target.style.borderColor = "#2d2d2d")}
          />

          {error && (
            <div style={{ fontSize: 12.5, color: "#e05555", background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.18)", borderRadius: 8, padding: "8px 12px" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              width: "100%",
              background: loading ? "#b86743" : "#d97757",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 14px",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#e8845f"; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#d97757"; }}
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#444" }}>
          Default: admin / password
        </p>
      </div>
    </div>
  );
}
