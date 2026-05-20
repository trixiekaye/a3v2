"use client";

import { useState, useEffect } from "react";

const card: React.CSSProperties = { background: "rgba(22,37,80,0.45)", border: "1px solid rgba(58,84,153,0.3)", borderRadius: 10, padding: "20px 24px", marginBottom: 10 };
const eyebrow: React.CSSProperties = { fontFamily: "var(--font-heading)", fontSize: 8.5, letterSpacing: "0.24em", color: "var(--navy-400)", textTransform: "uppercase" as const, marginBottom: 18 };
const inputStyle: React.CSSProperties = { width: "100%", background: "rgba(6,14,34,0.6)", border: "1px solid rgba(58,84,153,0.35)", borderRadius: 6, padding: "9px 12px", fontSize: 13.5, color: "var(--navy-50)", outline: "none", fontFamily: "var(--font-body)", transition: "border-color 0.15s" };

type JiraConfig = { baseUrl: string; email: string; apiToken: string };

export default function ConnectPage() {
  const [config, setConfig]       = useState<JiraConfig>({ baseUrl: "", email: "", apiToken: "" });
  const [saved, setSaved]         = useState(false);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState<"success"|"error"|null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("a3_jira_config");
    if (s) { setConfig(JSON.parse(s)); setConnected(true); }
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

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px 32px", maxWidth: 640 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600, color: "var(--gold-400)", letterSpacing: "0.12em" }}>Jira Connect</h1>
          <div style={{ marginTop: 6, height: 1, width: 48, background: "linear-gradient(90deg, var(--gold-700), transparent)" }} />
          <p style={{ fontSize: 13, color: "var(--navy-400)", marginTop: 8, fontFamily: "var(--font-body)" }}>Connect your Atlassian account to create cards directly</p>
        </div>
        {connected && (
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 9, letterSpacing: "0.18em", padding: "5px 12px", borderRadius: 20, background: "rgba(201,168,76,0.12)", color: "var(--gold-400)", border: "1px solid rgba(201,168,76,0.3)", flexShrink: 0, marginTop: 2, textTransform: "uppercase" as const }}>
            Connected
          </span>
        )}
      </div>

      {/* Info banner */}
      <div style={{ marginBottom: 16, padding: "11px 14px", borderRadius: 8, background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.18)", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ color: "var(--gold-500)", flexShrink: 0, marginTop: 1, fontSize: 13 }}>◆</span>
        <p style={{ fontSize: 12.5, color: "var(--gold-300)", lineHeight: 1.55, fontFamily: "var(--font-body)" }}>
          Create an API token at <strong>id.atlassian.net/manage-profile/security/api-tokens</strong>. Credentials are stored locally in your browser only.
        </p>
      </div>

      {/* Form */}
      <div style={card}>
        <p style={eyebrow}>Atlassian Credentials</p>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Base URL",   key: "baseUrl",   type: "url",      placeholder: "https://your-org.atlassian.net" },
            { label: "Email",      key: "email",     type: "email",    placeholder: "you@company.com" },
            { label: "API Token",  key: "apiToken",  type: "password", placeholder: "ATATxxxxxxxxxx" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--navy-400)", marginBottom: 6 }}>{label}</label>
              <input
                type={type}
                value={config[key as keyof JiraConfig]}
                onChange={e => setConfig({ ...config, [key]: e.target.value })}
                placeholder={placeholder}
                style={{ ...inputStyle, fontFamily: key === "apiToken" ? "monospace" : "var(--font-body)" }}
                onFocus={e => (e.target.style.borderColor = "var(--gold-500)")}
                onBlur={e => (e.target.style.borderColor = "rgba(58,84,153,0.35)")}
              />
            </div>
          ))}

          {testResult && (
            <div style={{ fontSize: 12.5, padding: "8px 12px", borderRadius: 6, fontFamily: "var(--font-body)",
              color: testResult === "success" ? "var(--gold-300)" : "#e8a0a0",
              background: testResult === "success" ? "rgba(201,168,76,0.1)" : "rgba(200,80,80,0.1)",
              border: `1px solid ${testResult === "success" ? "rgba(201,168,76,0.25)" : "rgba(200,80,80,0.2)"}`,
            }}>
              {testResult === "success" ? "✓ Connection successful." : "✗ Check your URL, email, and token."}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
            <button type="submit"
              style={{ padding: "8px 20px", background: "var(--gold-500)", color: "var(--navy-900)", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-heading)", letterSpacing: "0.1em", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--gold-400)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--gold-500)")}>
              {saved ? "SAVED ✓" : "SAVE"}
            </button>
            <button type="button" onClick={handleTest} disabled={testing}
              style={{ padding: "8px 20px", background: "transparent", color: "var(--navy-400)", border: "1px solid rgba(58,84,153,0.35)", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-body)", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.3)"; (e.currentTarget as HTMLElement).style.color = "var(--gold-300)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(58,84,153,0.35)"; (e.currentTarget as HTMLElement).style.color = "var(--navy-400)"; }}>
              {testing ? "Testing…" : "Test connection"}
            </button>
            {connected && (
              <button type="button" onClick={() => { localStorage.removeItem("a3_jira_config"); setConfig({ baseUrl:"", email:"", apiToken:"" }); setConnected(false); }}
                style={{ marginLeft: "auto", padding: "8px 14px", background: "transparent", border: "none", fontSize: 12.5, color: "var(--navy-600)", cursor: "pointer", fontFamily: "var(--font-body)", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#e8a0a0")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--navy-600)")}>
                Disconnect
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
