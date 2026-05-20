"use client";

import { useState } from "react";

const card: React.CSSProperties  = { background: "rgba(22,37,80,0.45)", border: "1px solid rgba(58,84,153,0.3)", borderRadius: 10, padding: "20px 24px", marginBottom: 10 };
const eyebrow: React.CSSProperties = { fontFamily: "var(--font-heading)", fontSize: 8.5, letterSpacing: "0.24em", color: "var(--navy-400)", textTransform: "uppercase" as const, marginBottom: 18 };
const inputStyle: React.CSSProperties = { width: "100%", background: "rgba(6,14,34,0.6)", border: "1px solid rgba(58,84,153,0.35)", borderRadius: 6, padding: "9px 12px", fontSize: 13.5, color: "var(--navy-50)", outline: "none", fontFamily: "var(--font-body)", transition: "border-color 0.15s" };

export default function SettingsPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus]   = useState<"idle"|"success"|"error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault(); setStatus("idle"); setErrorMsg("");
    if (current !== "password")  { setStatus("error"); setErrorMsg("Current password is incorrect."); return; }
    if (next.length < 6)         { setStatus("error"); setErrorMsg("New password must be at least 6 characters."); return; }
    if (next !== confirm)        { setStatus("error"); setErrorMsg("Passwords do not match."); return; }
    setStatus("success"); setCurrent(""); setNext(""); setConfirm("");
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px 32px", maxWidth: 640 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600, color: "var(--gold-400)", letterSpacing: "0.12em" }}>Settings</h1>
        <div style={{ marginTop: 6, height: 1, width: 48, background: "linear-gradient(90deg, var(--gold-700), transparent)" }} />
        <p style={{ fontSize: 13, color: "var(--navy-400)", marginTop: 8, fontFamily: "var(--font-body)" }}>Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div style={card}>
        <p style={eyebrow}>Profile</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heading)", fontSize: 12, color: "var(--gold-400)", fontWeight: 600, letterSpacing: "0.06em" }}>TK</div>
          <div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--navy-50)" }}>Trixie Kaye Pelobello</p>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: 8.5, letterSpacing: "0.2em", color: "var(--navy-400)", marginTop: 3, textTransform: "uppercase" }}>Administrator</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={card}>
        <p style={eyebrow}>Change password</p>
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Current password", value: current, setter: setCurrent, placeholder: "••••••••" },
            { label: "New password",     value: next,    setter: setNext,    placeholder: "Min. 6 characters" },
            { label: "Confirm new password", value: confirm, setter: setConfirm, placeholder: "••••••••" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--navy-400)", marginBottom: 6, letterSpacing: "0.02em" }}>{label}</label>
              <input type="password" value={value} onChange={e => setter(e.target.value)} placeholder={placeholder} required style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "var(--gold-500)")}
                onBlur={e => (e.target.style.borderColor = "rgba(58,84,153,0.35)")} />
            </div>
          ))}

          {status === "error" && <div style={{ fontSize: 12.5, color: "#e8a0a0", background: "rgba(200,80,80,0.1)", border: "1px solid rgba(200,80,80,0.2)", borderRadius: 6, padding: "8px 12px", fontFamily: "var(--font-body)" }}>{errorMsg}</div>}
          {status === "success" && <div style={{ fontSize: 12.5, color: "var(--gold-300)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 6, padding: "8px 12px", fontFamily: "var(--font-body)" }}>✓ Password updated successfully.</div>}

          <div>
            <button type="submit" style={{ padding: "8px 20px", background: "var(--gold-500)", color: "var(--navy-900)", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-heading)", letterSpacing: "0.1em", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--gold-400)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--gold-500)")}>
              UPDATE
            </button>
          </div>
        </form>
      </div>

      {/* About */}
      <div style={card}>
        <p style={eyebrow}>About</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[["Version","A3 V2"],["Protocol","Agile Artifact Architect"],["16-hour gate","Enabled"],["Jira integration","Atlassian MCP"]].map(([l,v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--navy-400)" }}>{l}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--navy-200)" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
