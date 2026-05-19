"use client";

import { useEffect, useState } from "react";

type CardRecord = { id: string; type: "Story"|"Task"|"Bug"|"Epic"; summary: string; project: string; jiraKey?: string; createdAt: string };

const TYPE_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  Story: { color: "#818cf8", bg: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.2)" },
  Task:  { color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.2)" },
  Bug:   { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" },
  Epic:  { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.2)" },
};

const DEMO: CardRecord[] = [
  { id:"1", type:"Story", summary:"As a user, I want to log in with email and password", project:"PROJ", jiraKey:"PROJ-42", createdAt: new Date(Date.now()-1800000).toISOString() },
  { id:"2", type:"Bug",   summary:"Login form does not show validation errors on empty submit", project:"PROJ", jiraKey:"PROJ-43", createdAt: new Date(Date.now()-5400000).toISOString() },
  { id:"3", type:"Task",  summary:"Set up CI/CD pipeline with GitHub Actions", project:"ENG", createdAt: new Date(Date.now()-14400000).toISOString() },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<CardRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("a3_history");
    setRecords(saved ? JSON.parse(saved) : DEMO);
  }, []);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px 32px", maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 15, fontWeight: 500, color: "#e4e4e4" }}>Card History</h1>
        <p style={{ fontSize: 13, color: "#666", marginTop: 3 }}>Previously generated Jira work items</p>
      </div>

      {records.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#333" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p style={{ fontSize: 14, color: "#555" }}>No cards yet</p>
          <p style={{ fontSize: 13, color: "#444" }}>Cards you create in chat will appear here</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {records.map(r => {
            const s = TYPE_STYLE[r.type] || TYPE_STYLE.Task;
            return (
              <div key={r.id}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#212121", border: "1px solid #2d2d2d", borderRadius: 10, transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#383838")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#2d2d2d")}
              >
                <span style={{ fontSize: 11.5, fontWeight: 500, padding: "3px 8px", borderRadius: 6, background: s.bg, color: s.color, border: `1px solid ${s.border}`, flexShrink: 0 }}>
                  {r.type}
                </span>
                <span style={{ flex: 1, fontSize: 13.5, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.summary}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: "#555", fontFamily: "monospace", background: "#1a1a1a", padding: "2px 7px", borderRadius: 5, border: "1px solid #2d2d2d" }}>{r.project}</span>
                  {r.jiraKey && <span style={{ fontSize: 12, color: "#d97757" }}>{r.jiraKey}</span>}
                  <span style={{ fontSize: 12, color: "#444" }}>{timeAgo(r.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
