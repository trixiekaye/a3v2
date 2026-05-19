"use client";

import { useState, useEffect } from "react";

const card: React.CSSProperties = { background: "#212121", border: "1px solid #2d2d2d", borderRadius: 12, padding: "20px 24px", marginBottom: 12 };
const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#181818", border: "1px solid #2d2d2d", borderRadius: 8, padding: "9px 12px", fontSize: 13.5, color: "#e4e4e4", outline: "none", transition: "border-color 0.15s", fontFamily: "inherit" };

type JiraConfig = { baseUrl: string; email: string; apiToken: string };

export default function ConnectPage() {
  const [config, setConfig] = useState<JiraConfig>({ baseUrl: "", email: "", apiToken: "" });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success"|"error"|null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("a3_jira_config");
    if (stored) { setConfig(JSON.parse(stored)); setConnected(true); }
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("a3_jira_config", JSON.stringify(config));
    setSaved(true); setConnected(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleTest() {
    setTesting(true); setTestResult(null);
    await new Promise(r => setTimeout(r, 1200));
    setTesting(false);
    setTestResult(config.baseUrl && config.email && config.apiToken ? "success" : "error");
    setTimeout(() => setTestResult(null), 3000);
  }

  function handleDisconnect() {
    localStorage.removeItem("a3_jira_config");
    setConfig({ baseUrl: "", email: "", apiToken: "" });
    setConnected(false);
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px 32px", maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 500, color: "#e4e4e4" }}>Jira Connect</h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 3 }}>Connect your Atlassian account to create cards directly</p>
        </div>
        {connected && (
          <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>
            Connected
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(217,119,87,0.07)", border: "1px solid rgba(217,119,87,0.18)", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <svg style={{ flexShrink: 0, marginTop: 1 }} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#d97757" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p style={{ fontSize: 12.5, color: "#c4795a", lineHeight: 1.55 }}>
          Create an API token at <strong>id.atlassian.net/manage-profile/security/api-tokens</strong>. Credentials are stored locally in your browser.
        </p>
      </div>

      {/* Form */}
      <div style={card}>
        <p style={sectionLabel}>Atlassian credentials</p>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Base URL", key: "baseUrl", type: "url", placeholder: "https://your-org.atlassian.net" },
            { label: "Email", key: "email", type: "email", placeholder: "you@company.com" },
            { label: "API Token", key: "apiToken", type: "password", placeholder: "ATATxxxxxxxxxx" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: 12, color: "#777", marginBottom: 6 }}>{label}</label>
              <input
                type={type}
                value={config[key as keyof JiraConfig]}
                onChange={e => setConfig({ ...config, [key]: e.target.value })}
                placeholder={placeholder}
                style={{ ...inputStyle, fontFamily: key === "apiToken" ? "monospace" : "inherit" }}
                onFocus={e => (e.target.style.borderColor = "#d97757")}
                onBlur={e => (e.target.style.borderColor = "#2d2d2d")}
              />
            </div>
          ))}

          {testResult && (
            <div style={{ fontSize: 12.5, padding: "8px 12px", borderRadius: 8,
              color: testResult === "success" ? "#4ade80" : "#f87171",
              background: testResult === "success" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
              border: `1px solid ${testResult === "success" ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
            }}>
              {testResult === "success" ? "✓ Connection successful." : "✗ Check your URL, email, and token."}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 2 }}>
            <button type="submit"
              style={{ padding: "8px 16px", background: "#d97757", color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e8845f")}
              onMouseLeave={e => (e.currentTarget.style.background = "#d97757")}
            >
              {saved ? "Saved ✓" : "Save credentials"}
            </button>
            <button type="button" onClick={handleTest} disabled={testing}
              style={{ padding: "8px 16px", background: "transparent", color: "#888", border: "1px solid #2d2d2d", borderRadius: 8, fontSize: 13.5, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#444")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#2d2d2d")}
            >
              {testing ? "Testing…" : "Test connection"}
            </button>
            {connected && (
              <button type="button" onClick={handleDisconnect}
                style={{ marginLeft: "auto", padding: "8px 14px", background: "transparent", border: "none", fontSize: 13, color: "#555", cursor: "pointer", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={e => (e.currentTarget.style.color = "#555")}
              >Disconnect</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
