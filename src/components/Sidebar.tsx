"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  {
    href: "/dashboard",
    label: "New chat",
    icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  },
  {
    href: "/dashboard/history",
    label: "History",
    icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
  {
    href: "/dashboard/connect",
    label: "Jira Connect",
    icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  },
];

const Asterisk = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside
      className="flex flex-col h-full shrink-0"
      style={{ width: 216, background: "#141414", borderRight: "1px solid #242424" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span style={{ color: "#d97757" }}><Asterisk size={18} /></span>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#e4e4e4", letterSpacing: "-0.01em" }}>A3 V2</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 rounded-lg transition-colors"
              style={{
                height: 36,
                color: active ? "#e4e4e4" : "#666",
                background: active ? "#242424" : "transparent",
                fontSize: 13.5,
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#aaa"; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#666"; } }}
            >
              <span style={{ color: active ? "#d97757" : "inherit", flexShrink: 0 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid #242424" }}>
        <div className="flex items-center gap-2.5 px-3 mb-1" style={{ height: 36 }}>
          <div className="flex items-center justify-center rounded-full text-xs font-semibold shrink-0"
            style={{ width: 24, height: 24, background: "#d97757", color: "#fff", fontSize: 11 }}>
            A
          </div>
          <span style={{ fontSize: 13.5, color: "#666" }}>admin</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 rounded-lg transition-colors"
          style={{ height: 36, color: "#555", fontSize: 13.5, background: "transparent" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1e1e1e"; (e.currentTarget as HTMLElement).style.color = "#e05555"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#555"; }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
