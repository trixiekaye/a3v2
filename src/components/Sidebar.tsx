"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useModelStatus, ModelStatus } from "@/context/ModelStatusContext";

const NAV = [
  { href: "/dashboard",            label: "New Chat",     icon: <PlusIcon /> },
  { href: "/dashboard/history",    label: "History",      icon: <HistoryIcon /> },
  { href: "/dashboard/knowledge",  label: "Knowledge",    icon: <BookIcon /> },
  { href: "/dashboard/connect",    label: "Jira Connect", icon: <LinkIcon /> },
  { href: "/dashboard/settings",   label: "Settings",     icon: <GearIcon /> },
];

function PlusIcon()    { return <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>; }
function HistoryIcon() { return <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function BookIcon()    { return <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>; }
function LinkIcon()    { return <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.1-1.1m-.757-4.9a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>; }
function GearIcon()    { return <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>; }
function RefreshIcon() { return <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>; }

// ── Mode config ───────────────────────────────────────────────────────────
type ModeInfo = { label: string; sub: string; icon: string; color: string };

function getModeInfo(pathname: string): ModeInfo | null {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return {
      label: "Card Creator",
      sub:   "Jira cards & stories",
      icon:  "◈",
      color: "var(--gold-500)",
    };
  }
  if (pathname.startsWith("/dashboard/knowledge/") && pathname.split("/").length >= 4) {
    return {
      label: "Requirements Analyst",
      sub:   "FRs, NFRs & use cases",
      icon:  "◉",
      color: "#7bb8f0",
    };
  }
  return null;
}

// ── Model status dot ──────────────────────────────────────────────────────
function StatusDot({ status }: { status: ModelStatus | "active" }) {
  const color =
    status === "active" ? "#6ee7a0" :
    status === "ok"     ? "#6ee7a0" :
    status === "quota"  ? "#f5a623" :
    status === "error"  ? "#e06060" :
                          "rgba(200,200,200,0.3)";
  return (
    <span style={{
      display: "inline-block",
      width: 6, height: 6, borderRadius: "50%",
      background: color,
      flexShrink: 0,
      boxShadow: (status === "ok" || status === "active") ? `0 0 4px ${color}` : "none",
    }} />
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { activeModel, isOnFallback, modelStatuses, lastChecked, checking, checkStatus } = useModelStatus();

  const mode = getModeInfo(pathname);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function fmtChecked(ts: number | null): string {
    if (!ts) return "";
    const diff = Math.round((Date.now() - ts) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    return `${Math.round(diff / 3600)}h ago`;
  }

  const hasStatusData =
    modelStatuses["gemini-2.5-pro"]  !== "unknown" ||
    modelStatuses["gemini-2.0-flash"] !== "unknown";

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--navy-900)",
      borderRight: "1px solid rgba(58,84,153,0.25)",
    }}>

      {/* ── Brand ── */}
      <div style={{ padding: "28px 20px 20px", borderBottom: "1px solid rgba(58,84,153,0.2)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600, color: "var(--gold-500)", letterSpacing: "0.12em" }}>
            A3
          </span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 400, color: "var(--navy-400)", letterSpacing: "0.18em" }}>
            V2
          </span>
        </div>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: 7.5, letterSpacing: "0.22em", color: "var(--navy-400)", marginTop: 5, textTransform: "uppercase" }}>
          Artifact Architect
        </p>
        <div style={{ marginTop: 16, height: 1, background: "linear-gradient(90deg, var(--gold-700), transparent)" }} />
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 6,
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? "var(--navy-50)" : "var(--navy-400)",
                background: active ? "rgba(58,84,153,0.25)" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s",
                borderLeft: active ? "2px solid var(--gold-500)" : "2px solid transparent",
              }}
              onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(58,84,153,0.15)"; el.style.color = "var(--navy-200)"; } }}
              onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "var(--navy-400)"; } }}
            >
              <span style={{ color: active ? "var(--gold-500)" : "inherit", flexShrink: 0 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Mode + AI Engine indicator ── */}
      <div style={{
        margin: "0 10px 10px",
        borderRadius: 8,
        border: "1px solid rgba(58,84,153,0.28)",
        background: "rgba(22,37,80,0.4)",
        overflow: "hidden",
        flexShrink: 0,
      }}>

        {/* Mode row */}
        <div style={{ padding: "9px 12px 8px", borderBottom: "1px solid rgba(58,84,153,0.2)" }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 7, letterSpacing: "0.3em", color: "var(--navy-400)", textTransform: "uppercase", marginBottom: 5 }}>
            Mode
          </p>
          {mode ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: mode.color, flexShrink: 0 }}>{mode.icon}</span>
              <div>
                <p style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: mode.color,
                  lineHeight: 1.25,
                }}>
                  {mode.label}
                </p>
                <p style={{ fontSize: 9.5, color: "var(--navy-400)", fontFamily: "var(--font-body)", marginTop: 1, fontWeight: 400 }}>
                  {mode.sub}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 10.5, color: "var(--navy-500)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
              —
            </p>
          )}
        </div>

        {/* AI Engine section */}
        <div style={{ padding: "8px 12px 9px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: 7, letterSpacing: "0.3em", color: "var(--navy-400)", textTransform: "uppercase" }}>
              AI Engine
            </p>
            <button
              onClick={checkStatus}
              disabled={checking}
              title={lastChecked ? `Last checked ${fmtChecked(lastChecked)}` : "Check model status"}
              style={{
                background: "none", border: "none",
                cursor: checking ? "default" : "pointer",
                color: "var(--navy-400)", padding: "1px 2px",
                opacity: checking ? 0.35 : 0.6,
                transition: "opacity 0.15s",
                display: "flex", alignItems: "center",
                animation: checking ? "spin 1s linear infinite" : "none",
              }}
              onMouseEnter={e => { if (!checking) e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={e => { if (!checking) e.currentTarget.style.opacity = "0.6"; }}
            >
              <RefreshIcon />
            </button>
          </div>

          {/* Active model pill */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            borderRadius: 5,
            background: isOnFallback ? "rgba(245,166,35,0.1)" : "rgba(110,231,160,0.07)",
            border: `1px solid ${isOnFallback ? "rgba(245,166,35,0.22)" : "rgba(110,231,160,0.18)"}`,
            marginBottom: hasStatusData ? 6 : 0,
          }}>
            <StatusDot status="active" />
            <span style={{
              fontSize: 10.5,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              color: isOnFallback ? "#f5a623" : "#6ee7a0",
              letterSpacing: "0.02em",
              lineHeight: 1.3,
              flex: 1,
            }}>
              {activeModel}
            </span>
            {isOnFallback && (
              <span style={{
                fontSize: 8,
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.18em",
                color: "rgba(245,166,35,0.65)",
                textTransform: "uppercase",
              }}>
                FALLBACK
              </span>
            )}
          </div>

          {/* Per-model quota rows — only shown once we have data */}
          {hasStatusData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {(["gemini-2.5-pro", "gemini-2.0-flash"] as const).map(id => {
                const status = modelStatuses[id];
                if (status === "unknown") return null;
                const label   = id === "gemini-2.5-pro" ? "Gemini 2.5 Pro" : "Gemini 2.0 Flash";
                const isQuota = status === "quota";
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <StatusDot status={status} />
                    <span style={{
                      fontSize: 10,
                      fontFamily: "var(--font-body)",
                      color: isQuota ? "rgba(240,100,60,0.6)" : "rgba(110,231,160,0.65)",
                      textDecoration: isQuota ? "line-through" : "none",
                      fontWeight: 400,
                      flex: 1,
                    }}>
                      {label}
                    </span>
                    {isQuota && (
                      <span style={{ fontSize: 8, color: "rgba(240,100,60,0.5)", fontFamily: "var(--font-heading)", letterSpacing: "0.15em" }}>
                        QUOTA
                      </span>
                    )}
                  </div>
                );
              })}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <StatusDot status="ok" />
                <span style={{ fontSize: 10, fontFamily: "var(--font-body)", color: "rgba(110,231,160,0.5)", fontWeight: 400 }}>
                  Groq · Llama 3.3
                </span>
              </div>
            </div>
          )}

          {lastChecked && (
            <p style={{ fontSize: 8.5, color: "var(--navy-500)", fontFamily: "var(--font-body)", marginTop: 5, textAlign: "right" }}>
              {checking ? "Checking…" : `Checked ${fmtChecked(lastChecked)}`}
            </p>
          )}
        </div>
      </div>

      {/* ── User ── */}
      <div style={{ padding: "12px 10px 20px", borderTop: "1px solid rgba(58,84,153,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", marginBottom: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: "rgba(201,168,76,0.15)",
            border: "1px solid rgba(201,168,76,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-heading)", fontSize: 10, color: "var(--gold-400)", fontWeight: 600,
          }}>TK</div>
          <div>
            <p style={{ fontSize: 12.5, color: "var(--navy-200)", fontFamily: "var(--font-body)", fontWeight: 500 }}>Trixie Kaye</p>
            <p style={{ fontSize: 10, color: "var(--navy-400)", letterSpacing: "0.08em", fontFamily: "var(--font-heading)" }}>Admin</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", borderRadius: 6, border: "none", cursor: "pointer",
            background: "transparent", color: "var(--navy-400)", fontSize: 13,
            fontFamily: "var(--font-body)", transition: "all 0.15s",
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(58,84,153,0.15)"; el.style.color = "#e07070"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "var(--navy-400)"; }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Sign out
        </button>
      </div>

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </aside>
  );
}
