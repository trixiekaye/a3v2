"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

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
        {/* Gold rule */}
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

      {/* ── User ── */}
      <div style={{ padding: "12px 10px 20px", borderTop: "1px solid rgba(58,84,153,0.2)" }}>
        {/* Profile row */}
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
        {/* Sign out */}
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
    </aside>
  );
}
