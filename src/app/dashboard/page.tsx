"use client";

import { useState, useRef, useEffect } from "react";

type TextBlock  = { type: "text"; text: string };
type ImageBlock = { type: "image_url"; image_url: { url: string } };
type ContentBlock = TextBlock | ImageBlock;
type Message    = { role: "user" | "assistant"; content: string | ContentBlock[] };
type Attachment = { id: string; name: string; kind: "image" | "text"; data: string };
type JiraResult = { key: string; url: string } | null;

const ACCEPTED    = ".png,.jpg,.jpeg,.webp,.gif,.txt,.md,.json,.csv,.js,.ts,.py,.xml,.yaml,.yml";
const IMAGE_TYPES = ["image/png","image/jpeg","image/webp","image/gif"];
const ISSUE_TYPES = ["Story","Task","Bug","Epic","Sub-task"];

const QUICK_ACTIONS = [
  { label: "Story",  tag: "[Story] ",  badge: "◈" },
  { label: "Task",   tag: "[Task] ",   badge: "☐" },
  { label: "Bug",    tag: "[Bug] ",    badge: "!" },
  { label: "Epic",   tag: "[Epic] ",   badge: "◆" },
];

function readAs(file: File, mode: "dataURL" | "text"): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    mode === "dataURL" ? r.readAsDataURL(file) : r.readAsText(file);
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Detect whether an AI message contains a structured card, and extract type + summary */
function detectCard(text: string): { isCard: boolean; type: string; summary: string } {
  const cardHeaders = /##\s+(Acceptance Criteria|Functional Requirements|Steps to Reproduce|Goals|Implementation Notes|Definition of Done)/i;
  if (!cardHeaders.test(text)) return { isCard: false, type: "Story", summary: "" };

  let type = "Story";
  if (/##\s+Steps to Reproduce/i.test(text)) type = "Bug";
  else if (/##\s+Goals/i.test(text) && /##\s+Scope/i.test(text)) type = "Epic";
  else if (/##\s+Implementation Notes/i.test(text) && !/##\s+Functional Requirements/i.test(text)) type = "Task";

  // Try to find an explicit Summary: line
  const summaryLine = text.match(/\*?\*?Summary\*?\*?[:\s]+(.+?)(?:\n|$)/i);
  let summary = summaryLine ? summaryLine[1].replace(/\*\*/g, "").trim() : "";

  // Otherwise, grab the first non-header, non-bullet, non-empty line
  if (!summary) {
    const lines = text.split("\n").filter(l => l.trim() && !/^[#\-*>]/.test(l.trim()) && !/^---/.test(l.trim()));
    summary = lines[0]?.replace(/\*\*/g, "").trim().slice(0, 120) || "";
  }

  return { isCard: true, type, summary };
}

function messageText(msg: Message): string {
  if (typeof msg.content === "string") return msg.content;
  return msg.content.filter((b): b is TextBlock => b.type === "text").map(b => b.text).join("\n");
}

/** Strip A3 boilerplate client-side before copying */
function cleanForCopy(text: string): string {
  return text
    .replace(/please\s+review\s+this\s+draft\.?\s*ready\s+to\s+create\s+this\s+in\s+jira\?\s*\(yes\s*\/\s*revise\)/gi, "")
    .replace(/ready\s+to\s+create\s+this\s+in\s+jira\?\s*\(yes\s*\/\s*revise\)/gi, "")
    .replace(/\n?-{2,}\n?\*{0,2}Rationale\*{0,2}[\s\S]*/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ─── Jira Push Panel ───────────────────────────────────────────── */
function JiraCreatePanel({ messageContent }: { messageContent: string }) {
  const [open, setOpen]             = useState(false);
  const [projectKey, setProjectKey] = useState("");
  const [issueType, setIssueType]   = useState("Story");
  const [summary, setSummary]       = useState("");
  const [busy, setBusy]             = useState(false);
  const [result, setResult]         = useState<JiraResult>(null);
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState(false);
  const [jiraConnected, setJiraConnected] = useState<boolean | null>(null); // null = loading

  const detected = detectCard(messageContent);

  useEffect(() => {
    fetch("/api/config/jira")
      .then(r => r.json())
      .then(d => setJiraConnected(!!d))
      .catch(() => setJiraConnected(false));
  }, []);

  if (!detected.isCard) return null;

  function handleCopy() {
    navigator.clipboard.writeText(cleanForCopy(messageContent)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpen() {
    if (!open) {
      setIssueType(detected.type);
      setSummary(detected.summary);
    }
    setOpen(o => !o);
    setResult(null);
    setError("");
  }

  async function handleCreate() {
    if (!projectKey.trim() || !summary.trim()) {
      setError("Project key and summary are required.");
      return;
    }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/jira/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectKey, issueType, summary, description: messageContent }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create issue."); return; }
      setResult(data);
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: issueType, summary, project_key: projectKey.toUpperCase(), jira_key: data.key }),
      }).catch(() => {});
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const inputBase: React.CSSProperties = {
    background: "rgba(255,255,255,0.75)", border: "1px solid rgba(201,168,76,0.25)",
    borderRadius: 5, padding: "7px 10px", fontSize: 13, fontWeight: 500,
    color: "var(--ghost-text)", outline: "none", fontFamily: "var(--font-body)",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ marginTop: 10, marginLeft: 44 }}>

      {/* ── Action row ─────────────────────────────────────────── */}
      {!result && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>

          {/* Copy button — always visible */}
          <button onClick={handleCopy}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 14px", borderRadius: 20,
              background: copied ? "rgba(201,168,76,0.14)" : "transparent",
              border: `1px solid ${copied ? "rgba(201,168,76,0.5)" : "var(--ghost-border-strong)"}`,
              color: copied ? "var(--gold-700)" : "var(--ghost-secondary)",
              fontSize: 12, fontWeight: 600,
              fontFamily: "var(--font-heading)", letterSpacing: "0.08em",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)"; e.currentTarget.style.color = "var(--gold-700)"; } }}
            onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor = "var(--ghost-border-strong)"; e.currentTarget.style.color = "var(--ghost-secondary)"; } }}>
            {copied
              ? <><span style={{ fontSize: 10 }}>✓</span> COPIED</>
              : <><svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> COPY CARD</>
            }
          </button>

          {/* Push to Jira — only if connected */}
          {jiraConnected && (
            <button onClick={handleOpen}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 14px", borderRadius: 20,
                background: open ? "rgba(201,168,76,0.12)" : "transparent",
                border: "1px solid rgba(201,168,76,0.4)",
                color: "var(--gold-700)", fontSize: 12, fontWeight: 600,
                fontFamily: "var(--font-heading)", letterSpacing: "0.1em",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!open) { e.currentTarget.style.background = "rgba(201,168,76,0.09)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.6)"; } }}
              onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)"; } }}>
              <span style={{ fontSize: 10 }}>◆</span>
              {open ? "CANCEL" : "PUSH TO JIRA"}
            </button>
          )}

          {/* Not connected nudge */}
          {jiraConnected === false && (
            <a href="/dashboard/connect"
              style={{ fontSize: 12, fontWeight: 500, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--gold-700)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--ghost-muted)")}>
              Connect Jira to push ↗
            </a>
          )}
        </div>
      )}

      {/* Success state */}
      {result && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 20, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)" }}>
          <span style={{ color: "var(--gold-500)", fontSize: 11 }}>◆</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold-700)", fontFamily: "var(--font-body)" }}>Created</span>
          <a href={result.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, fontWeight: 700, color: "var(--gold-500)", fontFamily: "monospace", textDecoration: "none", letterSpacing: "0.04em" }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
            {result.key} ↗
          </a>
          <button onClick={handleCopy} title="Copy card"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ghost-muted)", fontSize: 11, fontFamily: "var(--font-body)", transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--gold-700)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--ghost-muted)")}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      )}

      {/* Expanded Jira form */}
      {open && !result && (
        <div style={{
          marginTop: 10, padding: "16px 18px",
          background: "linear-gradient(135deg, rgba(201,168,76,0.07) 0%, rgba(255,255,255,0.85) 44%)",
          border: "1px solid rgba(201,168,76,0.3)", borderLeft: "3px solid var(--gold-500)",
          borderRadius: 8, display: "flex", flexDirection: "column", gap: 12,
          maxWidth: 480,
        }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 9.5, letterSpacing: "0.22em", color: "var(--gold-700)", textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>
            ◈ Create in Jira
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: "0 0 120px" }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ghost-secondary)", marginBottom: 5, fontFamily: "var(--font-body)" }}>Project Key</label>
              <input
                value={projectKey} onChange={e => setProjectKey(e.target.value.toUpperCase())}
                placeholder="PROJ"
                style={{ ...inputBase, width: "100%", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.06em" }}
                onFocus={e => (e.target.style.borderColor = "var(--gold-500)")}
                onBlur={e => (e.target.style.borderColor = "rgba(201,168,76,0.25)")}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ghost-secondary)", marginBottom: 5, fontFamily: "var(--font-body)" }}>Issue Type</label>
              <select value={issueType} onChange={e => setIssueType(e.target.value)}
                style={{ ...inputBase, width: "100%", cursor: "pointer" }}>
                {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ghost-secondary)", marginBottom: 5, fontFamily: "var(--font-body)" }}>Summary</label>
            <input
              value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="Issue summary…"
              style={{ ...inputBase, width: "100%" }}
              onFocus={e => (e.target.style.borderColor = "var(--gold-500)")}
              onBlur={e => (e.target.style.borderColor = "rgba(201,168,76,0.25)")}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "#b83030", background: "rgba(200,80,80,0.08)", border: "1px solid rgba(200,80,80,0.2)", borderRadius: 5, padding: "7px 11px", fontFamily: "var(--font-body)" }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={busy}
              style={{
                padding: "8px 22px", background: busy ? "var(--gold-700)" : "var(--gold-500)",
                color: "var(--navy-900)", border: "none", borderRadius: 6,
                fontSize: 12, fontWeight: 700, fontFamily: "var(--font-heading)",
                letterSpacing: "0.12em", cursor: busy ? "not-allowed" : "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (!busy) e.currentTarget.style.background = "var(--gold-400)"; }}
              onMouseLeave={e => { if (!busy) e.currentTarget.style.background = "var(--gold-500)"; }}>
              {busy ? "CREATING…" : "CREATE ISSUE"}
            </button>
            <button onClick={() => setOpen(false)}
              style={{ padding: "8px 16px", background: "transparent", color: "var(--ghost-muted)", border: "1px solid var(--ghost-border-strong)", borderRadius: 6, fontSize: 12.5, fontWeight: 500, fontFamily: "var(--font-body)", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Attachment chip ───────────────────────────────────────────── */
function AttachmentChip({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", background: "rgba(22,37,80,0.06)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 4, fontSize: 11.5, color: "var(--ghost-secondary)", fontFamily: "var(--font-body)" }}>
      {att.kind === "image"
        ? <img src={att.data} alt={att.name} style={{ width: 14, height: 14, borderRadius: 2, objectFit: "cover" }} />
        : <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      }
      <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
      <button onClick={onRemove} style={{ color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", lineHeight: 1, paddingLeft: 2, fontSize: 13 }}
        onMouseEnter={e => (e.currentTarget.style.color = "#a03030")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--ghost-muted)")}>×</button>
    </div>
  );
}

/* ─── Message bubble ────────────────────────────────────────────── */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const texts: string[] = [];
  const images: string[] = [];

  if (typeof message.content === "string") texts.push(message.content);
  else message.content.forEach(b => {
    if (b.type === "text") texts.push(b.text);
    else if (b.type === "image_url") images.push(b.image_url.url);
  });

  const textContent = texts.join("\n");

  return (
    <div style={{ display: "flex", gap: 14, flexDirection: isUser ? "row-reverse" : "row" }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0, marginTop: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isUser ? "rgba(58,84,153,0.1)" : "rgba(201,168,76,0.15)",
        border: isUser ? "1px solid rgba(58,84,153,0.25)" : "1px solid rgba(201,168,76,0.45)",
        fontFamily: "var(--font-heading)",
        fontSize: isUser ? 9 : 10,
        color: isUser ? "var(--navy-600)" : "var(--gold-700)",
        letterSpacing: "0.06em",
      }}>
        {isUser ? "TK" : "A3"}
      </div>

      <div style={{ maxWidth: "74%", display: "flex", flexDirection: "column", gap: 8, alignItems: isUser ? "flex-end" : "flex-start" }}>
        {images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {images.map((src, i) => (
              <img key={i} src={src} alt="attachment" style={{ maxWidth: 200, maxHeight: 160, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(201,168,76,0.25)" }} />
            ))}
          </div>
        )}
        {textContent.trim() && (
          <div style={{
            fontSize: 14.5, lineHeight: 1.75, fontWeight: 450,
            color: isUser ? "var(--navy-700,var(--navy-600))" : "var(--ghost-text)",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            fontFamily: "var(--font-body)",
          }}>
            {textContent}
          </div>
        )}
        {/* Jira push panel only on assistant messages */}
        {!isUser && <JiraCreatePanel messageContent={textContent} />}
      </div>
    </div>
  );
}

/* ─── Input box ─────────────────────────────────────────────────── */
function InputBox({ input, setInput, attachments, setAttachments, onSend, loading, fileInputRef }: {
  input: string; setInput: (v: string) => void;
  attachments: Attachment[]; setAttachments: (fn: (p: Attachment[]) => Attachment[]) => void;
  onSend: () => void; loading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  const canSend = !!(input.trim() || attachments.length > 0) && !loading;

  return (
    <div
      style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.07) 0%, rgba(255,255,255,0.85) 44%)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 10, overflow: "hidden", backdropFilter: "blur(12px)", boxShadow: "0 2px 8px rgba(201,168,76,0.08), 0 4px 20px rgba(22,37,80,0.05)" }}
      onDrop={e => {
        e.preventDefault();
        Promise.all(Array.from(e.dataTransfer.files).map(async f => {
          const isImg = IMAGE_TYPES.includes(f.type);
          return { id: `${Date.now()}-${Math.random()}`, name: f.name, kind: isImg ? "image" as const : "text" as const, data: await readAs(f, isImg ? "dataURL" : "text") };
        })).then(next => setAttachments(prev => [...prev, ...next]));
      }}
      onDragOver={e => e.preventDefault()}
    >
      {attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "12px 14px 4px" }}>
          {attachments.map(att => (
            <AttachmentChip key={att.id} att={att} onRemove={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} />
          ))}
        </div>
      )}

      <div style={{ padding: "14px 14px 6px" }}>
        <textarea
          ref={taRef}
          value={input}
          onChange={e => { setInput(e.target.value); resize(); }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Describe a feature, bug, or requirement…"
          rows={1}
          style={{
            width: "100%", resize: "none", background: "transparent", border: "none", outline: "none",
            fontSize: 15, fontWeight: 500, color: "var(--ghost-text)", lineHeight: 1.65, maxHeight: 160,
            fontFamily: "var(--font-body)", caretColor: "var(--gold-500)",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", padding: "6px 10px 10px", gap: 6 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          style={{ width: 30, height: 30, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ghost-muted)", transition: "all 0.15s" }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(22,37,80,0.06)"; el.style.color = "var(--ghost-secondary)"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "var(--ghost-muted)"; }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
        </button>

        <span style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}>
          {attachments.some(a => a.kind === "image") ? "A3 V2 · Groq · Vision" : "A3 V2 · Gemini 2.5 Pro"}
        </span>

        <button
          onClick={onSend} disabled={!canSend}
          style={{
            width: 30, height: 30, borderRadius: 6, border: "none",
            cursor: canSend ? "pointer" : "not-allowed",
            background: canSend ? "var(--gold-500)" : "rgba(22,37,80,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", opacity: canSend ? 1 : 0.4,
          }}
          onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLElement).style.background = "var(--gold-400)"; }}
          onMouseLeave={e => { if (canSend) (e.currentTarget as HTMLElement).style.background = "var(--gold-500)"; }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={canSend ? "var(--navy-900)" : "var(--ghost-muted)"} strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeProject, setActiveProject] = useState("");
  const [kbFileCount, setKbFileCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasStarted = messages.length > 0;

  // Refresh KB file count when project changes
  useEffect(() => {
    if (!activeProject.trim()) { setKbFileCount(0); return; }
    fetch(`/api/knowledge?project=${activeProject.trim().toUpperCase()}`)
      .then(r => r.json())
      .then(d => setKbFileCount(Array.isArray(d) ? d.length : 0))
      .catch(() => setKbFileCount(0));
  }, [activeProject]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  function buildContent(): string | ContentBlock[] {
    const text = input.trim();
    if (attachments.length === 0) return text;
    const blocks: ContentBlock[] = [];
    attachments.forEach(a => { if (a.kind === "image") blocks.push({ type: "image_url", image_url: { url: a.data } }); });
    attachments.forEach(a => { if (a.kind === "text") blocks.push({ type: "text", text: `[File: ${a.name}]\n${a.data}` }); });
    if (text) blocks.push({ type: "text", text });
    return blocks;
  }

  async function sendMessage() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading) return;
    const content = buildContent();
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages); setInput(""); setAttachments([]); setLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: newMessages, projectKey: activeProject.trim() || undefined }) });
      const data = await res.json();
      if (!res.ok) { setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error || "Something went wrong."}` }]); return; }
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]); }
    finally { setLoading(false); }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const next = await Promise.all(Array.from(files).map(async f => {
      const isImg = IMAGE_TYPES.includes(f.type);
      return { id: `${Date.now()}-${Math.random()}`, name: f.name, kind: isImg ? "image" as const : "text" as const, data: await readAs(f, isImg ? "dataURL" : "text") };
    }));
    setAttachments(prev => [...prev, ...next]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--ghost-bg)" }}>

      {/* Messages */}
      {hasStarted && (
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 0" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 28px", display: "flex", flexDirection: "column", gap: 28 }}>
            {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
            {loading && (
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.45)", fontFamily: "var(--font-heading)", fontSize: 10, color: "var(--gold-700)", letterSpacing: "0.06em" }}>A3</div>
                <div style={{ display: "flex", gap: 5, alignItems: "center", paddingTop: 8 }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ghost-muted)", display: "inline-block", animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Home / greeting */}
      {!hasStarted && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px 56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ height: 1, width: 56, background: "linear-gradient(90deg, transparent, var(--gold-400))" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.5em", fontFamily: "var(--font-heading)", color: "var(--gold-500)", opacity: 0.85 }}>◆ · ◆</span>
            <div style={{ height: 1, width: 56, background: "linear-gradient(90deg, var(--gold-400), transparent)" }} />
          </div>

          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.2rem, 3.8vw, 3rem)", fontWeight: 400, fontStyle: "italic", color: "var(--navy-800)", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: 10, textAlign: "center" }}>
            {greeting()}, Trixie Kaye
          </h1>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 10, letterSpacing: "0.3em", color: "var(--gold-700)", marginBottom: 44, textTransform: "uppercase", fontWeight: 600 }}>
            What shall we build today?
          </p>

          <div style={{ width: "100%", maxWidth: 640 }}>
            {/* Project context pill */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 18 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ghost-muted)", fontFamily: "var(--font-body)" }}>Knowledge context:</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  value={activeProject}
                  onChange={e => setActiveProject(e.target.value.toUpperCase())}
                  placeholder="PROJ"
                  style={{
                    fontFamily: "monospace", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em",
                    padding: "4px 10px", paddingRight: kbFileCount > 0 ? "56px" : "10px",
                    borderRadius: 20, border: "1px solid rgba(201,168,76,0.35)",
                    background: activeProject ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.6)",
                    color: activeProject ? "var(--gold-700)" : "var(--ghost-muted)",
                    outline: "none", transition: "all 0.15s", width: 90,
                  }}
                />
                {kbFileCount > 0 && (
                  <span style={{
                    position: "absolute", right: 8,
                    fontSize: 10.5, fontWeight: 700, fontFamily: "var(--font-body)",
                    color: "var(--gold-700)", background: "rgba(201,168,76,0.2)",
                    border: "1px solid rgba(201,168,76,0.4)", borderRadius: 10,
                    padding: "1px 6px", pointerEvents: "none",
                  }}>
                    {kbFileCount}
                  </span>
                )}
              </div>
              {kbFileCount > 0 && (
                <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--gold-700)", fontFamily: "var(--font-body)" }}>
                  ◆ {kbFileCount} file{kbFileCount !== 1 ? "s" : ""} loaded
                </span>
              )}
            </div>

            <InputBox input={input} setInput={setInput} attachments={attachments} setAttachments={setAttachments} onSend={sendMessage} loading={loading} fileInputRef={fileInputRef} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
              {QUICK_ACTIONS.map(({ label, tag, badge }) => (
                <button key={label} onClick={() => setInput(tag)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 18px", borderRadius: 20, background: "rgba(255,255,255,0.65)", border: "1px solid rgba(201,168,76,0.35)", color: "var(--ghost-secondary)", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-body)", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(201,168,76,0.6)"; el.style.color = "var(--gold-700)"; el.style.background = "rgba(201,168,76,0.1)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(201,168,76,0.35)"; el.style.color = "var(--ghost-secondary)"; el.style.background = "rgba(255,255,255,0.65)"; }}>
                  <span style={{ color: "var(--gold-500)", fontSize: 11, fontWeight: 700 }}>{badge}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat input bar */}
      {hasStarted && (
        <div style={{ padding: "12px 28px 24px", flexShrink: 0 }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <InputBox input={input} setInput={setInput} attachments={attachments} setAttachments={setAttachments} onSend={sendMessage} loading={loading} fileInputRef={fileInputRef} />
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple accept={ACCEPTED} style={{ display: "none" }}
        onChange={e => { handleFiles(e.target.files); (e.target as HTMLInputElement).value = ""; }} />

      <style jsx>{`
        @keyframes dot { 0%,80%,100%{opacity:0.2;transform:scale(0.7)} 40%{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}
