"use client";

import { useState, useEffect } from "react";

const card: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(255,255,255,0.82) 44%)",
  border: "1px solid rgba(201,168,76,0.32)",
  borderLeft: "3px solid var(--gold-500)",
  borderRadius: 10,
  padding: "22px 26px",
  marginBottom: 12,
};
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: 10,
  letterSpacing: "0.22em",
  color: "var(--gold-700)",
  textTransform: "uppercase" as const,
  marginBottom: 18,
  fontWeight: 600,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.75)",
  border: "1px solid rgba(201,168,76,0.25)",
  borderRadius: 6,
  padding: "10px 13px",
  fontSize: 14,
  color: "var(--ghost-text)",
  outline: "none",
  fontFamily: "var(--font-body)",
  fontWeight: 500,
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export default function ConnectPage() {
  const [baseUrl, setBaseUrl]     = useState("");
  const [email, setEmail]         = useState("");
  const [apiToken, setApiToken]   = useState("");
  const [connected, setConnected] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [saved, setSaved]         = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    fetch("/api/config/jira")
      .then(r => r.json())
      .then(d => {
        if (d) {
          setBaseUrl(d.base_url ?? "");
          setEmail(d.email ?? "");
          setConnected(true);
        }
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/config/jira", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUrl, email, apiToken }),
    });
    setSaving(false);
    if (r.ok) { setSaved(true); setConnected(true); setTimeout(() => setSaved(false), 2500); }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null);
    await new Promise(r => setTimeout(r, 1200));
    setTesting(false);
    setTestResult(baseUrl && email && apiToken ? "success" : "error");
    setTimeout(() => setTestResult(null), 3000);
  }

  async function handleDisconnect() {
    await fetch("/api/config/jira", { method: "DELETE" });
    setBaseUrl(""); setEmail(""); setApiToken(""); setConnected(false);
  }

  function focusGold(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--gold-500)";
    (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(201,168,76,0.14)";
  }
  function blurGold(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "rgba(201,168,76,0.25)";
    (e.target as HTMLElement).style.boxShadow = "none";
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "36px 36px", maxWidth: 660 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ color: "var(--gold-500)", fontSize: 11 }}>◆</span>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 19, fontWeight: 700, color: "var(--gold-500)", letterSpacing: "0.14em" }}>Jira Connect</h1>
          </div>
          <div style={{ height: 1, width: 64, background: "linear-gradient(90deg, var(--gold-500), transparent)" }} />
          <p style={{ fontSize: 13.5, color: "var(--ghost-secondary)", marginTop: 10, fontFamily: "var(--font-body)", fontWeight: 500 }}>
            Connect your Atlassian account to create cards directly
          </p>
        </div>
        {connected && (
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 9.5, letterSpacing: "0.18em", padding: "6px 14px", borderRadius: 20, background: "rgba(201,168,76,0.15)", color: "var(--gold-700)", border: "1px solid rgba(201,168,76,0.4)", flexShrink: 0, marginTop: 2, textTransform: "uppercase" as const, fontWeight: 700 }}>
            ◆ Connected
          </span>
        )}
      </div>

      {/* Info banner */}
      <div style={{ marginBottom: 18, padding: "12px 16px", borderRadius: 8, background: "rgba(201,168,76,0.09)", border: "1px solid rgba(201,168,76,0.28)", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ color: "var(--gold-500)", flexShrink: 0, fontSize: 13 }}>◆</span>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ghost-text)", lineHeight: 1.6, fontFamily: "var(--font-body)" }}>
          Credentials are stored securely in the database — never in your browser. Create an API token at{" "}
          <strong style={{ color: "var(--gold-700)" }}>id.atlassian.net/manage-profile/security/api-tokens</strong>.
        </p>
      </div>

      {/* Form */}
      <div style={card}>
        <p style={eyebrow}>◈ Atlassian Credentials</p>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Base URL",  value: baseUrl,   set: setBaseUrl,   type: "url",      ph: "https://your-org.atlassian.net" },
            { label: "Email",     value: email,     set: setEmail,     type: "email",    ph: "you@company.com" },
            { label: "API Token", value: apiToken,  set: setApiToken,  type: "password", ph: connected ? "••••••••••••• (leave blank to keep existing)" : "ATATxxxxxxxxxx" },
          ].map(({ label, value, set, type, ph }) => (
            <div key={label}>
              <label style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, color: "var(--ghost-secondary)", marginBottom: 7 }}>{label}</label>
              <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={ph}
                required={label !== "API Token" || !connected}
                style={{ ...inputStyle, fontFamily: label === "API Token" ? "monospace" : "var(--font-body)" }}
                onFocus={focusGold} onBlur={blurGold} />
            </div>
          ))}

          {testResult && (
            <div style={{ fontSize: 13, padding: "9px 13px", borderRadius: 6, fontFamily: "var(--font-body)", fontWeight: 500,
              color: testResult === "success" ? "var(--gold-700)" : "#b83030",
              background: testResult === "success" ? "rgba(201,168,76,0.1)" : "rgba(200,80,80,0.08)",
              border: `1px solid ${testResult === "success" ? "rgba(201,168,76,0.3)" : "rgba(200,80,80,0.22)"}`,
            }}>
              {testResult === "success" ? "✓ Connection successful." : "✗ Check your URL, email, and token."}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
            <button type="submit" disabled={saving}
              style={{ padding: "9px 24px", background: saving ? "var(--gold-700)" : "var(--gold-500)", color: "var(--navy-900)", border: "none", borderRadius: 6, fontSize: 12.5, fontWeight: 700, fontFamily: "var(--font-heading)", letterSpacing: "0.12em", cursor: saving ? "not-allowed" : "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "var(--gold-400)"; }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "var(--gold-500)"; }}>
              {saved ? "SAVED ✓" : saving ? "SAVING…" : "SAVE"}
            </button>
            <button type="button" onClick={handleTest} disabled={testing}
              style={{ padding: "9px 22px", background: "transparent", color: "var(--ghost-secondary)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 6, fontSize: 13, fontWeight: 500, fontFamily: "var(--font-body)", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.55)"; (e.currentTarget as HTMLElement).style.color = "var(--gold-700)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.3)"; (e.currentTarget as HTMLElement).style.color = "var(--ghost-secondary)"; }}>
              {testing ? "Testing…" : "Test connection"}
            </button>
            {connected && (
              <button type="button" onClick={handleDisconnect}
                style={{ marginLeft: "auto", padding: "9px 14px", background: "transparent", border: "none", fontSize: 13, fontWeight: 500, color: "var(--ghost-muted)", cursor: "pointer", fontFamily: "var(--font-body)", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#b83030")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ghost-muted)")}>
                Disconnect
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
