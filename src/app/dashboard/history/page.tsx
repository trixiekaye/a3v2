"use client";

import { useEffect, useState } from "react";

type CardRecord = { id: string; type: "Story"|"Task"|"Bug"|"Epic"; summary: string; project: string; jiraKey?: string; createdAt: string };

const BADGE: Record<string, { color: string; bg: string; border: string }> = {
  Story: { color: "var(--navy-200)",  bg: "rgba(58,84,153,0.2)",   border: "rgba(58,84,153,0.4)"   },
  Task:  { color: "var(--gold-300)",  bg: "rgba(201,168,76,0.12)", border: "rgba(201,168,76,0.3)"  },
  Bug:   { color: "#e8a0a0",          bg: "rgba(200,80,80,0.1)",   border: "rgba(200,80,80,0.25)"  },
  Epic:  { color: "var(--gold-400)",  bg: "rgba(201,168,76,0.18)", border: "rgba(201,168,76,0.38)" },
};

const DEMO: CardRecord[] = [
  { id:"1", type:"Story", summary:"As a user, I want to log in with email and password",       project:"PROJ", jiraKey:"PROJ-42", createdAt: new Date(Date.now()-1800000).toISOString() },
  { id:"2", type:"Bug",   summary:"Login form does not show validation errors on empty submit", project:"PROJ", jiraKey:"PROJ-43", createdAt: new Date(Date.now()-5400000).toISOString() },
  { id:"3", type:"Task",  summary:"Set up CI/CD pipeline with GitHub Actions",                  project:"ENG",                    createdAt: new Date(Date.now()-14400000).toISOString() },
];

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d/60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<CardRecord[]>([]);
  useEffect(() => { const s = localStorage.getItem("a3_history"); setRecords(s ? JSON.parse(s) : DEMO); }, []);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px 32px", maxWidth: 720 }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600, color: "var(--gold-400)", letterSpacing: "0.12em" }}>History</h1>
        <div style={{ marginTop: 6, height: 1, width: 48, background: "linear-gradient(90deg, var(--gold-700), transparent)" }} />
        <p style={{ fontSize: 13, color: "var(--navy-400)", marginTop: 8, fontFamily: "var(--font-body)" }}>Previously generated Jira work items</p>
      </div>

      {records.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 10, color: "var(--navy-400)" }}>
          <span style={{ fontSize: 24 }}>◆</span>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>No cards yet</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--navy-600)" }}>Cards you create in chat will appear here</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {records.map(r => {
            const b = BADGE[r.type] || BADGE.Task;
            return (
              <div key={r.id}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "rgba(22,37,80,0.4)", border: "1px solid rgba(58,84,153,0.25)", borderRadius: 8, transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(58,84,153,0.25)")}
              >
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", padding: "3px 9px", borderRadius: 4, background: b.bg, color: b.color, border: `1px solid ${b.border}`, flexShrink: 0, textTransform: "uppercase" as const }}>
                  {r.type}
                </span>
                <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--navy-200)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.summary}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11.5, color: "var(--navy-400)", background: "rgba(6,14,34,0.6)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(58,84,153,0.25)" }}>{r.project}</span>
                  {r.jiraKey && <span style={{ fontSize: 12, color: "var(--gold-500)", fontFamily: "var(--font-body)" }}>{r.jiraKey}</span>}
                  <span style={{ fontSize: 11.5, color: "var(--navy-600)", fontFamily: "var(--font-body)" }}>{timeAgo(r.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
