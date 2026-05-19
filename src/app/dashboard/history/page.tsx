"use client";

import { useEffect, useState } from "react";

type CardRecord = {
  id: string;
  type: "Story" | "Task" | "Bug" | "Epic";
  summary: string;
  project: string;
  jiraKey?: string;
  createdAt: string;
};

const TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Story: { bg: "rgba(99,102,241,0.1)", color: "#818cf8", border: "rgba(99,102,241,0.2)" },
  Task: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", border: "rgba(34,197,94,0.2)" },
  Bug: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", border: "rgba(239,68,68,0.2)" },
  Epic: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "rgba(245,158,11,0.2)" },
};

const DEMO_RECORDS: CardRecord[] = [
  {
    id: "1",
    type: "Story",
    summary: "As a user, I want to log in with email and password",
    project: "PROJ",
    jiraKey: "PROJ-42",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2",
    type: "Bug",
    summary: "Login form does not show validation errors on empty submit",
    project: "PROJ",
    jiraKey: "PROJ-43",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "3",
    type: "Task",
    summary: "Set up CI/CD pipeline with GitHub Actions",
    project: "ENG",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<CardRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("a3_history");
    if (saved) {
      setRecords(JSON.parse(saved));
    } else {
      setRecords(DEMO_RECORDS);
    }
  }, []);

  return (
    <div className="h-full overflow-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-base font-semibold" style={{ color: "#ededed" }}>Card History</h1>
        <p className="text-xs mt-0.5" style={{ color: "#555" }}>Previously generated Jira work items</p>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#555" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "#555" }}>No cards yet</p>
          <p className="text-xs mt-1" style={{ color: "#444" }}>Cards you create in the chat will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => {
            const colors = TYPE_COLORS[r.type] || TYPE_COLORS.Task;
            return (
              <div
                key={r.id}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all"
                style={{ background: "#111111", border: "1px solid #1e1e1e" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e")}
              >
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-md shrink-0"
                  style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
                >
                  {r.type}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: "#ccc" }}>{r.summary}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-md font-mono" style={{ background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }}>
                    {r.project}
                  </span>
                  {r.jiraKey && (
                    <span className="text-xs" style={{ color: "#6366f1" }}>{r.jiraKey}</span>
                  )}
                  <span className="text-xs" style={{ color: "#444" }}>{timeAgo(r.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
