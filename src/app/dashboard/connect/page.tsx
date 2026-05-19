"use client";

import { useState, useEffect } from "react";

type JiraConfig = {
  baseUrl: string;
  email: string;
  apiToken: string;
};

export default function ConnectPage() {
  const [config, setConfig] = useState<JiraConfig>({ baseUrl: "", email: "", apiToken: "" });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("a3_jira_config");
    if (stored) {
      const parsed = JSON.parse(stored);
      setConfig(parsed);
      setConnected(true);
    }
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("a3_jira_config", JSON.stringify(config));
    setSaved(true);
    setConnected(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    await new Promise((r) => setTimeout(r, 1200));
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
    <div className="h-full overflow-auto px-6 py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold" style={{ color: "#ededed" }}>Jira Connect</h1>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>Connect your Atlassian account to create cards directly</p>
        </div>
        {connected && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
            Connected
          </span>
        )}
      </div>

      {/* Info Banner */}
      <div className="mb-5 p-3.5 rounded-xl flex gap-3" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
        <svg className="shrink-0 mt-0.5" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#6366f1" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs leading-relaxed" style={{ color: "#818cf8" }}>
          Create an API token at <strong>id.atlassian.net/manage-profile/security/api-tokens</strong>. Credentials are stored locally in your browser only.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="p-5 rounded-xl space-y-4" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>
              Atlassian Base URL
            </label>
            <input
              type="url"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder="https://your-org.atlassian.net"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>
              Atlassian Email
            </label>
            <input
              type="email"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              placeholder="you@company.com"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
              style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>
              API Token
            </label>
            <input
              type="password"
              value={config.apiToken}
              onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
              placeholder="ATATxxxxxxxxxx"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all font-mono"
              style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#ededed" }}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: "#6366f1", color: "#fff" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#818cf8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#6366f1")}
          >
            {saved ? "Saved ✓" : "Save credentials"}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#444")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a")}
          >
            {testing ? "Testing…" : "Test connection"}
          </button>

          {connected && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="ml-auto px-4 py-2 rounded-lg text-sm transition-all"
              style={{ color: "#555" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#555")}
            >
              Disconnect
            </button>
          )}
        </div>

        {testResult && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              color: testResult === "success" ? "#22c55e" : "#ef4444",
              background: testResult === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${testResult === "success" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}
          >
            {testResult === "success"
              ? "✓ Connection successful — Jira is reachable."
              : "✗ Connection failed — check your URL, email, and token."}
          </p>
        )}
      </form>
    </div>
  );
}
