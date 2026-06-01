"use client";

import { useEffect, useState } from "react";

type CardRecord = { id: string; type: "Story"|"Task"|"Bug"|"Epic"; summary: string; project: string; jiraKey?: string; createdAt: string };

const BADGE: Record<string, { color: string; bg: string; border: string }> = {
  Story: { color: "var(--navy-400)",  bg: "rgba(58,84,153,0.12)",  border: "rgba(58,84,153,0.3)"   },
  Task:  { color: "var(--gold-700)",  bg: "rgba(201,168,76,0.14)", border: "rgba(201,168,76,0.35)" },
  Bug:   { color: "#b83030",          bg: "rgba(200,80,80,0.1)",   border: "rgba(200,80,80,0.28)"  },
  Epic:  { color: "var(--gold-500)",  bg: "rgba(201,168,76,0.2)",  border: "rgba(201,168,76,0.45)" },
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
  useEffect(() => {
    fetch("/api/history")
      .then(r => r.json())
      .then(d => setRecords(Array.isArray(d) && d.length > 0
        ? d.map((r: { id: string; type: string; summary: string; project_key: string; jira_key?: string; created_at: string }) => ({
            id: r.id, type: r.type as CardRecord["type"],
            summary: r.summary, project: r.project_key,
            jiraKey: r.jira_key, createdAt: r.created_at,
          }))
        : DEMO
      ));
  }, []);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "36px 36px", maxWidth: 760 }}>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ color: "var(--gold-500)", fontSize: 11 }}>◆</span>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 19, fontWeight: 700, color: "var(--gold-500)", letterSpacing: "0.14em" }}>History</h1>
        </div>
        <div style={{ height: 1, width: 80, background: "linear-gradient(90deg, var(--gold-500), rgba(201,168,76,0.2), transparent)" }} />
        <p style={{ fontSize: 13.5, color: "var(--ghost-secondary)", marginTop: 10, fontFamily: "var(--font-body)", fontWeight: 500 }}>Previously generated Jira work items</p>
      </div>

      {records.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 12, color: "var(--ghost-secondary)" }}>
          <span style={{ fontSize: 28, color: "var(--gold-400)", opacity: 0.5 }}>◆</span>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 500 }}>No cards yet</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ghost-muted)", fontWeight: 500 }}>Cards you create in chat will appear here</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {records.map(r => {
            const b = BADGE[r.type] || BADGE.Task;
            return (
              <div key={r.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px",
                  background: "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(255,255,255,0.82) 44%)",
                  border: "1px solid rgba(201,168,76,0.25)",
                  borderLeft: "3px solid var(--gold-500)",
                  borderRadius: 8,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"; e.currentTarget.style.borderLeftColor = "var(--gold-400)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(201,168,76,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)"; e.currentTarget.style.borderLeftColor = "var(--gold-500)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <span style={{
                  fontFamily: "var(--font-heading)", fontSize: 10.5, fontWeight: 700,
                  letterSpacing: "0.12em", padding: "4px 10px", borderRadius: 4,
                  background: b.bg, color: b.color, border: `1px solid ${b.border}`,
                  flexShrink: 0, textTransform: "uppercase" as const,
                }}>
                  {r.type}
                </span>
                <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--ghost-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.summary}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "var(--navy-200)", background: "var(--navy-800)", padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(58,84,153,0.4)", letterSpacing: "0.04em" }}>{r.project}</span>
                  {r.jiraKey && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold-700)", fontFamily: "var(--font-body)" }}>{r.jiraKey}</span>}
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ghost-muted)", fontFamily: "var(--font-body)" }}>{timeAgo(r.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
