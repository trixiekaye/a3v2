"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setErrorMsg("");

    if (current !== "password") {
      setStatus("error");
      setErrorMsg("Current password is incorrect.");
      return;
    }
    if (next.length < 6) {
      setStatus("error");
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      setStatus("error");
      setErrorMsg("Passwords do not match.");
      return;
    }

    setStatus("success");
    setCurrent("");
    setNext("");
    setConfirm("");
    setTimeout(() => setStatus("idle"), 3000);
  }

  const inputStyle = {
    background: "#0a0a0a",
    border: "1px solid #2a2a2a",
    color: "#ededed" as const,
  };

  return (
    <div className="h-full overflow-auto px-6 py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-base font-semibold" style={{ color: "#ededed" }}>Settings</h1>
        <p className="text-xs mt-0.5" style={{ color: "#555" }}>Manage your account and preferences</p>
      </div>

      {/* Profile card */}
      <div className="mb-4 p-5 rounded-xl" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#444" }}>Profile</h2>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}
          >
            A
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "#ededed" }}>admin</p>
            <p className="text-xs mt-0.5" style={{ color: "#555" }}>Administrator</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="p-5 rounded-xl" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#444" }}>Change password</h2>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>Current password</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>New password</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Min. 6 characters"
              required
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          {status === "error" && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              {errorMsg}
            </p>
          )}
          {status === "success" && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              ✓ Password updated successfully.
            </p>
          )}

          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: "#6366f1", color: "#fff" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#818cf8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#6366f1")}
          >
            Update password
          </button>
        </form>
      </div>

      {/* A3 Version Info */}
      <div className="mt-4 p-5 rounded-xl" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#444" }}>About</h2>
        <div className="space-y-2">
          {[
            ["Version", "A3 V2"],
            ["Protocol", "Agile Artifact Architect"],
            ["16-hour gate", "Enabled"],
            ["Jira integration", "Atlassian MCP"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-xs" style={{ color: "#555" }}>{label}</span>
              <span className="text-xs font-medium" style={{ color: "#888" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
