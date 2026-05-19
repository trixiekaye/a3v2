"use client";

import { useState } from "react";

const card: React.CSSProperties = { background: "#212121", border: "1px solid #2d2d2d", borderRadius: 12, padding: "20px 24px", marginBottom: 12 };
const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#181818", border: "1px solid #2d2d2d", borderRadius: 8, padding: "9px 12px", fontSize: 13.5, color: "#e4e4e4", outline: "none", transition: "border-color 0.15s", fontFamily: "inherit" };

export default function SettingsPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle"); setErrorMsg("");
    if (current !== "password") { setStatus("error"); setErrorMsg("Current password is incorrect."); return; }
    if (next.length < 6) { setStatus("error"); setErrorMsg("New password must be at least 6 characters."); return; }
    if (next !== confirm) { setStatus("error"); setErrorMsg("Passwords do not match."); return; }
    setStatus("success"); setCurrent(""); setNext(""); setConfirm("");
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px 32px", maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 15, fontWeight: 500, color: "#e4e4e4" }}>Settings</h1>
        <p style={{ fontSize: 13, color: "#666", marginTop: 3 }}>Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div style={card}>
        <p style={sectionLabel}>Profile</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#d97757", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff", flexShrink: 0 }}>A</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#e4e4e4" }}>admin</p>
            <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Administrator</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={card}>
        <p style={sectionLabel}>Change password</p>
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Current password", value: current, setter: setCurrent, placeholder: "••••••••" },
            { label: "New password", value: next, setter: setNext, placeholder: "Min. 6 characters" },
            { label: "Confirm new password", value: confirm, setter: setConfirm, placeholder: "••••••••" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label style={{ display: "block", fontSize: 12, color: "#777", marginBottom: 6 }}>{label}</label>
              <input
                type="password" value={value} onChange={e => setter(e.target.value)}
                placeholder={placeholder} required style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "#d97757")}
                onBlur={e => (e.target.style.borderColor = "#2d2d2d")}
              />
            </div>
          ))}

          {status === "error" && (
            <div style={{ fontSize: 12.5, color: "#e05555", background: "rgba(224,85,85,0.08)", border: "1px solid rgba(224,85,85,0.18)", borderRadius: 8, padding: "8px 12px" }}>{errorMsg}</div>
          )}
          {status === "success" && (
            <div style={{ fontSize: 12.5, color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 8, padding: "8px 12px" }}>✓ Password updated successfully.</div>
          )}

          <div>
            <button type="submit"
              style={{ padding: "8px 16px", background: "#d97757", color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e8845f")}
              onMouseLeave={e => (e.currentTarget.style.background = "#d97757")}
            >Update password</button>
          </div>
        </form>
      </div>

      {/* About */}
      <div style={card}>
        <p style={sectionLabel}>About</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[["Version", "A3 V2"], ["Protocol", "Agile Artifact Architect"], ["16-hour gate", "Enabled"], ["Jira integration", "Atlassian MCP"]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#666" }}>{l}</span>
              <span style={{ fontSize: 13, color: "#999" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
