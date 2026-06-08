"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useModelStatus } from "@/context/ModelStatusContext";

// ── Types ──────────────────────────────────────────────────────────
type KBFile = {
  id: string;
  project_key: string;
  name: string;
  size_bytes: number;
  created_at: string;
  category: "knowledge" | "sow";
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  ts: number;
};

type PdfFallback = { name: string } | null;

// ── File filtering (same as knowledge page) ────────────────────────
const TEXT_EXTENSIONS = new Set([
  "txt","md","markdown","rst",
  "json","jsonc","yaml","yml","toml","ini","cfg","conf","env","example",
  "js","mjs","cjs","jsx","ts","tsx","vue","svelte",
  "py","rb","go","rs","java","cs","cpp","c","h","hpp","php","swift","kt","scala","r","lua","pl",
  "html","htm","css","scss","sass","less",
  "xml","csv","tsv","sql","graphql","gql","proto","sh","bash","zsh","ps1","fish",
  "dockerfile","gitignore","dockerignore","editorconfig","eslintrc","prettierrc","stylelintrc","babelrc",
]);
const SKIP_DIRS  = new Set(["node_modules",".git",".next","dist","build","__pycache__",".cache","coverage","vendor",".svn"]);
const SKIP_FILES = new Set([".DS_Store","Thumbs.db","package-lock.json","yarn.lock","pnpm-lock.yaml","composer.lock","Gemfile.lock",".env"]);
const MAX_BYTES  = 150_000;

function isTextFile(file: File): boolean {
  const parts = file.name.split(".");
  const ext   = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  if (!ext) return ["Dockerfile","Makefile","Procfile","Rakefile"].includes(file.name);
  return TEXT_EXTENSIONS.has(ext);
}

function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf");
}

function shouldSkip(relativePath: string): boolean {
  const segments = relativePath.split("/");
  if (segments.some(s => SKIP_DIRS.has(s))) return true;
  const filename = segments[segments.length - 1];
  return SKIP_FILES.has(filename);
}

// ── Utils ──────────────────────────────────────────────────────────
function fmtSize(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function genId() {
  return Math.random().toString(36).slice(2);
}

/** Detect structured requirements headers */
function hasRequirementsContent(text: string): boolean {
  return (
    text.includes("## Functional Requirements") ||
    text.includes("## Non-Functional Requirements") ||
    text.includes("## Use Case") ||
    text.includes("## Acceptance Criteria") ||
    text.includes("### FR-") ||
    text.includes("### NFR-") ||
    text.includes("### AC-") ||
    text.includes("### UC-")
  );
}

// ── Quick actions ──────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    label: "Generate FRs",
    icon: "◈",
    prompt: "Based on the provided State of Work and project knowledge, generate a complete set of Functional Requirements (FRs). Number them FR-001 onward. Include description, priority, and source reference for each.",
  },
  {
    label: "Generate NFRs",
    icon: "◇",
    prompt: "Based on the provided State of Work and project knowledge, generate Non-Functional Requirements (NFRs) covering performance, security, scalability, availability, usability, and maintainability. Number them NFR-001 onward.",
  },
  {
    label: "Generate Use Cases",
    icon: "◉",
    prompt: "Based on the provided documents, generate Use Cases (UC-001 onward) with actors, preconditions, postconditions, main flow steps, alternate flows, and exceptions.",
  },
  {
    label: "Generate Acceptance Criteria",
    icon: "✦",
    prompt: "Based on the provided State of Work and knowledge, generate Acceptance Criteria (AC-001 onward) in Given-When-Then format for all identifiable features and user scenarios.",
  },
];

// ── Shared input styles ────────────────────────────────────────────
const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.78)",
  border: "1px solid rgba(201,168,76,0.25)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13.5,
  color: "var(--ghost-text)",
  outline: "none",
  fontFamily: "var(--font-body)",
  fontWeight: 500,
};

// ── Main page ──────────────────────────────────────────────────────
export default function ProjectCollectionPage() {
  const params     = useParams();
  const router     = useRouter();
  const projectKey = (params.projectKey as string).toUpperCase();
  const { reportModel } = useModelStatus();

  // ── Display name ───────────────────────────────────────────────
  const [displayName,    setDisplayName]    = useState("");
  const [editingName,    setEditingName]    = useState(false);
  const [nameInput,      setNameInput]      = useState("");
  const [savingName,     setSavingName]     = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Files ──────────────────────────────────────────────────────
  const [knowledgeFiles, setKnowledgeFiles] = useState<KBFile[]>([]);
  const [sowFiles,       setSowFiles]       = useState<KBFile[]>([]);
  const [fileNotice, setFileNotice]         = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [uploading,  setUploading]          = useState(false);
  const [sowUploading, setSowUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [deleting,   setDeleting]           = useState<string | null>(null);
  const [pdfFallback, setPdfFallback]       = useState<PdfFallback>(null);
  const [pasteText,  setPasteText]          = useState("");
  const [pasteName,  setPasteName]          = useState("");

  // ── Chat ───────────────────────────────────────────────────────
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [activeModel, setActiveModel] = useState("Gemini 2.5 Pro");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [copying,     setCopying]     = useState<string | null>(null);

  // ── Jira ───────────────────────────────────────────────────────
  const [jiraConnected,  setJiraConnected]  = useState<boolean | null>(null);
  const [pushPanel,      setPushPanel]      = useState<string | null>(null); // message id
  const [pushSummary,    setPushSummary]    = useState("");
  const [pushIssueType,  setPushIssueType]  = useState("Story");
  const [pushing,        setPushing]        = useState(false);
  const [pushResult,     setPushResult]     = useState<{ key: string; url: string } | null>(null);

  // ── Refs ───────────────────────────────────────────────────────
  const kbFileRef     = useRef<HTMLInputElement>(null);
  const kbFolderRef   = useRef<HTMLInputElement>(null);
  const sowFileRef    = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  // ── Folder input setup ─────────────────────────────────────────
  useEffect(() => {
    kbFolderRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  // ── Scroll to bottom ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Load on mount ──────────────────────────────────────────────
  useEffect(() => {
    loadFiles();
    loadChatHistory();
    checkJira();
    loadDisplayName();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  // ── Textarea auto-resize ───────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

  // ── Data loaders ───────────────────────────────────────────────
  async function loadDisplayName() {
    const r = await fetch("/api/projects");
    if (r.ok) {
      const data: { project_key: string; display_name: string }[] = await r.json();
      const match = data.find(p => p.project_key === projectKey);
      if (match) setDisplayName(match.display_name ?? "");
    }
  }

  async function saveDisplayName(val: string) {
    setSavingName(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_key: projectKey, display_name: val.trim() }),
    });
    setDisplayName(val.trim());
    setSavingName(false);
    setEditingName(false);
  }

  async function loadFiles() {
    const r = await fetch(`/api/knowledge?project=${projectKey}`);
    if (r.ok) {
      const files: KBFile[] = await r.json();
      setKnowledgeFiles(files.filter(f => (f.category ?? "knowledge") === "knowledge"));
      setSowFiles(files.filter(f => f.category === "sow"));
    }
  }

  async function loadChatHistory() {
    setHistoryLoading(true);
    try {
      const r = await fetch(`/api/requirements/history/${projectKey}`);
      if (r.ok) {
        const { messages: saved } = await r.json();
        setMessages(
          (saved ?? []).map((m: Omit<ChatMessage, "id">) => ({ ...m, id: genId() }))
        );
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  async function checkJira() {
    const r = await fetch("/api/config/jira");
    setJiraConnected(r.ok);
  }

  async function saveChatHistory(msgs: ChatMessage[]) {
    await fetch(`/api/requirements/history/${projectKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs.map(({ id: _id, ...m }) => m) }),
    });
  }

  // ── Notices ────────────────────────────────────────────────────
  function flashFile(msg: string, type: "ok" | "err" = "ok") {
    setFileNotice({ msg, type });
    setTimeout(() => setFileNotice(null), 4000);
  }

  // ── File store helper ──────────────────────────────────────────
  async function storeFile(name: string, content: string, category: "knowledge" | "sow") {
    await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_key: projectKey, name, content, category }),
    });
  }

  // ── Knowledge file upload ──────────────────────────────────────
  async function uploadKnowledge(fileList: FileList | null, isFolder = false) {
    if (!fileList) return;

    const candidates: { file: File; storedName: string }[] = [];
    let skippedBinary = 0;
    let skippedDir    = 0;

    for (const file of Array.from(fileList)) {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      if (isFolder && shouldSkip(relativePath)) { skippedDir++;    continue; }
      if (!isTextFile(file))                     { skippedBinary++; continue; }

      const segments   = relativePath.split("/");
      const storedName = isFolder && segments.length > 1
        ? segments.slice(1).join("/")
        : file.name;

      candidates.push({ file, storedName });
    }

    if (candidates.length === 0) {
      flashFile(`No supported text files found.${skippedBinary ? ` ${skippedBinary} binary file(s) skipped.` : ""}`, "err");
      return;
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: candidates.length });
    let added = 0; let truncated = 0;

    for (let i = 0; i < candidates.length; i++) {
      const { file, storedName } = candidates[i];
      setUploadProgress({ done: i, total: candidates.length });
      const text    = await file.text();
      const wasCut  = text.length > MAX_BYTES;
      await storeFile(storedName, wasCut ? text.slice(0, MAX_BYTES) : text, "knowledge");
      if (wasCut) truncated++;
      added++;
    }

    setUploading(false);
    setUploadProgress(null);
    await loadFiles();

    const parts = [`${added} file${added !== 1 ? "s" : ""} added`];
    if (skippedBinary) parts.push(`${skippedBinary} binary skipped`);
    if (skippedDir)    parts.push(`${skippedDir} system skipped`);
    if (truncated)     parts.push(`${truncated} truncated to 150 KB`);
    flashFile(parts.join(" · "));
  }

  // ── SOW upload ─────────────────────────────────────────────────
  async function uploadSow(fileList: FileList | null) {
    if (!fileList) return;

    setSowUploading(true);
    let added = 0;
    let pdfFailed = 0;
    let firstFailedName = "";

    for (const file of Array.from(fileList)) {
      if (isPdfFile(file)) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const r = await fetch("/api/knowledge/parse-pdf", { method: "POST", body: fd });
          if (r.ok) {
            const { text } = await r.json();
            const trimmed = text.slice(0, MAX_BYTES * 2); // SOW can be larger
            await storeFile(file.name, trimmed, "sow");
            added++;
          } else {
            pdfFailed++;
            if (!firstFailedName) firstFailedName = file.name;
          }
        } catch {
          pdfFailed++;
          if (!firstFailedName) firstFailedName = file.name;
        }
      } else if (isTextFile(file)) {
        const text = await file.text();
        await storeFile(file.name, text.slice(0, MAX_BYTES * 2), "sow");
        added++;
      }
    }

    setSowUploading(false);
    await loadFiles();

    if (added > 0) {
      flashFile(`${added} SOW document${added !== 1 ? "s" : ""} uploaded.`);
    }
    if (pdfFailed > 0) {
      setPasteName(firstFailedName);
      setPasteText("");
      setPdfFallback({ name: firstFailedName });
    }
  }

  async function submitPastedSow() {
    if (!pasteText.trim() || !pasteName.trim()) return;
    await storeFile(pasteName.trim(), pasteText.trim(), "sow");
    await loadFiles();
    setPdfFallback(null);
    setPasteText("");
    setPasteName("");
    flashFile(`"${pasteName.trim()}" added from pasted text.`);
  }

  // ── Delete file ────────────────────────────────────────────────
  async function deleteFile(id: string) {
    setDeleting(id);
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    await loadFiles();
    setDeleting(null);
  }

  // ── Chat send ──────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { id: genId(), role: "user", content: text.trim(), ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const r = await fetch("/api/requirements/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
          projectKey,
        }),
      });

      const data = await r.json();

      if (data.error) {
        const errMsg: ChatMessage = { id: genId(), role: "assistant", content: `⚠️ ${data.error}`, ts: Date.now() };
        const final = [...newMessages, errMsg];
        setMessages(final);
        await saveChatHistory(final);
      } else {
        const assistantMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: data.content,
          model: data.model,
          ts: Date.now(),
        };
        setActiveModel(data.model ?? "Gemini 2.5 Pro");
        reportModel(data.model ?? "Gemini 2.5 Pro");
        const final = [...newMessages, assistantMsg];
        setMessages(final);
        await saveChatHistory(final);
      }
    } catch {
      const errMsg: ChatMessage = { id: genId(), role: "assistant", content: "⚠️ Network error. Please try again.", ts: Date.now() };
      const final = [...newMessages, errMsg];
      setMessages(final);
      await saveChatHistory(final);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, projectKey]);

  async function clearChat() {
    setMessages([]);
    await fetch(`/api/requirements/history/${projectKey}`, { method: "DELETE" });
  }

  // ── Copy ───────────────────────────────────────────────────────
  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content.trim());
    setCopying(id);
    setTimeout(() => setCopying(null), 1800);
  }

  // ── Push to Jira ───────────────────────────────────────────────
  async function pushToJira(msg: ChatMessage) {
    if (!pushSummary.trim()) return;
    setPushing(true);
    try {
      const r = await fetch("/api/jira/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectKey,
          issueType: pushIssueType,
          summary: pushSummary.trim(),
          description: msg.content,
        }),
      });
      const data = await r.json();
      if (data.error) {
        flashFile(data.error, "err");
      } else {
        setPushResult({ key: data.key, url: data.url });
        setPushPanel(null);
      }
    } finally {
      setPushing(false);
    }
  }

  // ── Render helpers ─────────────────────────────────────────────
  function FileListItem({ f }: { f: KBFile }) {
    const isDeleting = deleting === f.id;
    return (
      <div
        style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(201,168,76,0.07)", transition: "background 0.12s" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.04)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <svg style={{ flexShrink: 0, marginTop: 2 }} width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--gold-700)" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          {f.name.includes("/") ? (
            <div>
              <span style={{ fontSize: 10.5, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", fontWeight: 500 }}>
                {f.name.substring(0, f.name.lastIndexOf("/") + 1)}
              </span>
              <br />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ghost-text)", fontFamily: "var(--font-body)" }}>
                {f.name.substring(f.name.lastIndexOf("/") + 1)}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ghost-text)", fontFamily: "var(--font-body)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
          )}
          <span style={{ fontSize: 11, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", fontWeight: 400 }}>{fmtSize(f.size_bytes)} · {fmtDate(f.created_at)}</span>
        </div>
        <button onClick={() => deleteFile(f.id)} disabled={isDeleting}
          style={{ flexShrink: 0, fontSize: 11, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", padding: "0 2px", transition: "color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#b83030"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--ghost-muted)"}>
          {isDeleting ? "…" : "✕"}
        </button>
      </div>
    );
  }

  const totalFiles = knowledgeFiles.length + sowFiles.length;

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "var(--font-body)" }}>

      {/* ── LEFT PANEL ──────────────────────────────────────────── */}
      <div style={{
        width: 340,
        flexShrink: 0,
        borderRight: "1px solid rgba(201,168,76,0.2)",
        background: "linear-gradient(180deg, rgba(201,168,76,0.04) 0%, rgba(255,255,255,0.6) 100%)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Back nav */}
        <div style={{ padding: "20px 20px 0" }}>
          <button
            onClick={() => router.push("/dashboard/knowledge")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--gold-700)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--ghost-muted)"}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Knowledge Base
          </button>
        </div>

        {/* Project header */}
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ color: "var(--gold-500)", fontSize: 9 }}>◆</span>
            <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--gold-700)", letterSpacing: "0.1em", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 4, padding: "1px 7px" }}>{projectKey}</span>
          </div>

          {/* Display name — inline edit */}
          {editingName ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") saveDisplayName(nameInput);
                  if (e.key === "Escape") { setEditingName(false); setNameInput(displayName); }
                }}
                onBlur={() => saveDisplayName(nameInput)}
                placeholder="Project display name…"
                style={{
                  flex: 1, fontSize: 15, fontWeight: 700,
                  fontFamily: "var(--font-heading)", color: "var(--navy-800)",
                  background: "rgba(255,255,255,0.9)",
                  border: "1.5px solid var(--gold-500)",
                  borderRadius: 6, padding: "4px 10px",
                  outline: "none",
                  boxShadow: "0 0 0 3px rgba(201,168,76,0.14)",
                  letterSpacing: "0.06em",
                }}
                autoFocus
              />
              <button onClick={() => saveDisplayName(nameInput)} disabled={savingName}
                style={{ fontSize: 12, color: "var(--gold-700)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                {savingName ? "…" : "✓"}
              </button>
            </div>
          ) : (
            <div
              style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, cursor: "text", minHeight: 28 }}
              onClick={() => { setEditingName(true); setNameInput(displayName); setTimeout(() => nameInputRef.current?.focus(), 50); }}
            >
              {displayName ? (
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--navy-800)", letterSpacing: "0.08em", lineHeight: 1.2 }}>
                  {displayName}
                </span>
              ) : (
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--ghost-muted)", fontStyle: "italic" }}>
                  Add display name…
                </span>
              )}
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--ghost-muted)" strokeWidth={2} style={{ opacity: 0.5, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </div>
          )}

          <div style={{ height: 1, width: 60, background: "linear-gradient(90deg, var(--gold-500), transparent)", marginBottom: 8 }} />
          <p style={{ fontSize: 12, color: "var(--ghost-muted)", fontWeight: 500 }}>
            {knowledgeFiles.length} knowledge · {sowFiles.length} SOW · {fmtSize(
              [...knowledgeFiles, ...sowFiles].reduce((s, f) => s + f.size_bytes, 0)
            )}
          </p>
        </div>

        {/* File notice */}
        {fileNotice && (
          <div style={{ margin: "12px 16px 0", padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: fileNotice.type === "ok" ? "rgba(201,168,76,0.1)" : "rgba(200,80,80,0.08)",
            border: `1px solid ${fileNotice.type === "ok" ? "rgba(201,168,76,0.3)" : "rgba(200,80,80,0.22)"}`,
            color: fileNotice.type === "ok" ? "var(--gold-700)" : "#b83030",
          }}>
            {fileNotice.type === "ok" ? "◆ " : "✗ "}{fileNotice.msg}
          </div>
        )}

        {/* ── KNOWLEDGE FILES section ──────────────────────────── */}
        <div style={{ margin: "20px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 9, letterSpacing: "0.22em", color: "var(--gold-700)", textTransform: "uppercase", fontWeight: 600 }}>
              ◈ Knowledge Files
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => kbFileRef.current?.click()}
                disabled={uploading}
                style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gold-700)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 5, padding: "3px 9px", cursor: uploading ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", transition: "all 0.15s" }}
                onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = "rgba(201,168,76,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; }}>
                + Files
              </button>
              <button
                onClick={() => { kbFolderRef.current?.setAttribute("webkitdirectory", ""); kbFolderRef.current?.click(); }}
                disabled={uploading}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: "var(--gold-700)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 5, padding: "3px 9px", cursor: uploading ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", transition: "all 0.15s" }}
                onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = "rgba(201,168,76,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; }}>
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
                + Folder
              </button>
            </div>
          </div>

          {/* Upload progress */}
          {uploading && uploadProgress && (
            <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--gold-700)", fontWeight: 500 }}>
              Uploading {uploadProgress.done + 1} / {uploadProgress.total}…
            </div>
          )}

          {/* KB file list */}
          {knowledgeFiles.length === 0 ? (
            <p style={{ padding: "14px 16px", fontSize: 12.5, color: "var(--ghost-muted)", fontWeight: 500 }}>
              No knowledge files yet. Upload code, docs, or specs.
            </p>
          ) : (
            <div>
              {knowledgeFiles.map(f => <FileListItem key={f.id} f={f} />)}
            </div>
          )}

          {/* Hidden inputs */}
          <input ref={kbFileRef} type="file" multiple style={{ display: "none" }}
            onChange={e => { uploadKnowledge(e.target.files); (e.target as HTMLInputElement).value = ""; }} />
          <input ref={kbFolderRef} type="file" multiple style={{ display: "none" }}
            onChange={e => { uploadKnowledge(e.target.files, true); (e.target as HTMLInputElement).value = ""; }} />
        </div>

        {/* ── SOW DOCUMENTS section ────────────────────────────── */}
        <div style={{ margin: "24px 0 0", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px", borderBottom: "1px solid rgba(201,168,76,0.15)", borderTop: "1px solid rgba(201,168,76,0.15)", paddingTop: 10 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 9, letterSpacing: "0.22em", color: "var(--gold-700)", textTransform: "uppercase", fontWeight: 600 }}>
              ◈ State of Work
            </span>
            <button
              onClick={() => sowFileRef.current?.click()}
              disabled={sowUploading}
              style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gold-700)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 5, padding: "3px 9px", cursor: sowUploading ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", transition: "all 0.15s" }}
              onMouseEnter={e => { if (!sowUploading) e.currentTarget.style.background = "rgba(201,168,76,0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; }}>
              {sowUploading ? "Uploading…" : "+ SOW Document"}
            </button>
          </div>

          <p style={{ padding: "6px 16px 10px", fontSize: 11, color: "var(--ghost-muted)", fontWeight: 500 }}>
            Accepts PDF, .txt, .md · AI reads SOW as primary requirements source
          </p>

          {/* SOW file list */}
          {sowFiles.length === 0 ? (
            <p style={{ padding: "0 16px 14px", fontSize: 12.5, color: "var(--ghost-muted)", fontWeight: 500 }}>
              No SOW documents yet. Upload a Statement of Work or requirements brief.
            </p>
          ) : (
            <div>
              {sowFiles.map(f => <FileListItem key={f.id} f={f} />)}
            </div>
          )}

          {/* Hidden SOW input */}
          <input ref={sowFileRef} type="file" multiple accept=".pdf,.txt,.md,.markdown,.rst,.docx" style={{ display: "none" }}
            onChange={e => { uploadSow(e.target.files); (e.target as HTMLInputElement).value = ""; }} />
        </div>

        {/* PDF fallback paste */}
        {pdfFallback && (
          <div style={{
            margin: "0 12px 16px",
            background: "rgba(201,168,76,0.06)",
            border: "1px solid rgba(201,168,76,0.28)",
            borderRadius: 8,
            padding: "14px",
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gold-700)", marginBottom: 6 }}>
              ⚠️ Could not extract text from PDF
            </p>
            <p style={{ fontSize: 11.5, color: "var(--ghost-muted)", fontWeight: 500, marginBottom: 10 }}>
              Paste the text content manually:
            </p>
            <input
              value={pasteName}
              onChange={e => setPasteName(e.target.value)}
              placeholder="Document name"
              style={{ ...inp, width: "100%", fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}
            />
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste document text here…"
              rows={5}
              style={{ ...inp, width: "100%", fontSize: 12, resize: "vertical", marginBottom: 10, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={submitPastedSow} disabled={!pasteText.trim() || !pasteName.trim()}
                style={{ flex: 1, padding: "7px", borderRadius: 6, border: "none", background: "var(--gold-500)", color: "var(--navy-900)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                Save
              </button>
              <button onClick={() => setPdfFallback(null)}
                style={{ padding: "7px 12px", borderRadius: 6, border: "1px solid rgba(201,168,76,0.3)", background: "none", color: "var(--ghost-muted)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                Skip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL — Chat ───────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Chat header */}
        <div style={{
          padding: "14px 28px",
          borderBottom: "1px solid rgba(201,168,76,0.18)",
          background: "linear-gradient(135deg, rgba(201,168,76,0.07) 0%, rgba(255,255,255,0.7) 100%)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--gold-500)", fontSize: 10 }}>◆</span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--gold-600)", letterSpacing: "0.1em" }}>Requirements Chat</span>
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--ghost-muted)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 4, padding: "1px 7px", letterSpacing: "0.04em" }}>{projectKey}</span>
              {displayName && (
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ghost-muted)", fontFamily: "var(--font-body)" }}>· {displayName}</span>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ghost-muted)", fontWeight: 500, marginTop: 2 }}>
              {activeModel} · {totalFiles} document{totalFiles !== 1 ? "s" : ""} loaded
            </p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat}
              style={{ fontSize: 12, fontWeight: 500, color: "var(--ghost-muted)", background: "none", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#b83030"; e.currentTarget.style.borderColor = "rgba(200,80,80,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--ghost-muted)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)"; }}>
              Clear Chat
            </button>
          )}
        </div>

        {/* Quick action chips */}
        <div style={{
          padding: "12px 24px",
          borderBottom: "1px solid rgba(201,168,76,0.12)",
          background: "rgba(255,255,255,0.4)",
          flexShrink: 0,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}>
          {QUICK_ACTIONS.map(qa => (
            <button
              key={qa.label}
              onClick={() => sendMessage(qa.prompt)}
              disabled={loading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 20,
                background: "rgba(201,168,76,0.08)",
                border: "1px solid rgba(201,168,76,0.3)",
                color: "var(--gold-700)",
                fontSize: 12.5, fontWeight: 600,
                fontFamily: "var(--font-body)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(201,168,76,0.16)"; e.currentTarget.style.borderColor = "var(--gold-500)"; } }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.08)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"; }}
            >
              <span style={{ fontSize: 10 }}>{qa.icon}</span>
              {qa.label}
            </button>
          ))}
        </div>

        {/* Push result banner */}
        {pushResult && (
          <div style={{ padding: "10px 24px", background: "rgba(201,168,76,0.1)", borderBottom: "1px solid rgba(201,168,76,0.25)", flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--gold-700)" }}>
              ◆ Created <strong>{pushResult.key}</strong> in Jira
            </span>
            <a href={pushResult.url} target="_blank" rel="noreferrer"
              style={{ fontSize: 12.5, color: "var(--gold-600)", fontWeight: 500, fontFamily: "var(--font-body)" }}>
              View in Jira →
            </a>
            <button onClick={() => setPushResult(null)}
              style={{ marginLeft: "auto", fontSize: 11, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

          {historyLoading && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
              <span style={{ fontSize: 13, color: "var(--ghost-muted)", fontWeight: 500 }}>Loading conversation…</span>
            </div>
          )}

          {!historyLoading && messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12 }}>
              <span style={{ fontSize: 32, color: "rgba(201,168,76,0.2)" }}>◈</span>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ghost-secondary)" }}>
                {totalFiles === 0
                  ? "Upload a SOW or knowledge files to get started"
                  : "Use a quick action above or ask a question"}
              </p>
              <p style={{ fontSize: 13, color: "var(--ghost-muted)", fontWeight: 500, textAlign: "center", maxWidth: 400 }}>
                {totalFiles > 0
                  ? `${totalFiles} document${totalFiles !== 1 ? "s" : ""} ready · Ask me to generate requirements, use cases, or acceptance criteria`
                  : "Upload files in the left panel — the AI will reference them to generate accurate requirements"}
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              {/* Bubble */}
              <div style={{
                maxWidth: "84%",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, var(--navy-800, #0d2240), var(--navy-700, #163050))"
                  : "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(245,240,234,0.8))",
                border: msg.role === "user"
                  ? "1px solid rgba(201,168,76,0.3)"
                  : "1px solid rgba(201,168,76,0.2)",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "12px 16px",
                color: msg.role === "user" ? "rgba(245,240,234,0.95)" : "var(--ghost-text)",
              }}>
                {/* Content */}
                <pre style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 13.5,
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                  lineHeight: 1.65,
                  margin: 0,
                  color: "inherit",
                }}>
                  {msg.content}
                </pre>
              </div>

              {/* Assistant actions */}
              {msg.role === "assistant" && !msg.content.startsWith("⚠️") && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  {/* Model label */}
                  {msg.model && (
                    <span style={{ fontSize: 10.5, color: "var(--ghost-muted)", fontWeight: 500, fontFamily: "var(--font-body)" }}>
                      {msg.model}
                    </span>
                  )}

                  {/* Copy */}
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: copying === msg.id ? "var(--gold-700)" : "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", padding: "3px 8px", borderRadius: 5, transition: "all 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    {copying === msg.id ? (
                      <><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Copied</>
                    ) : (
                      <><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
                    )}
                  </button>

                  {/* Push to Jira — only when requirements content detected */}
                  {hasRequirementsContent(msg.content) && (
                    jiraConnected === true ? (
                      <button
                        onClick={() => {
                          setPushPanel(pushPanel === msg.id ? null : msg.id);
                          setPushSummary(`${projectKey} Requirements`);
                          setPushResult(null);
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", padding: "3px 8px", borderRadius: 5, transition: "all 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        Push to Jira
                      </button>
                    ) : jiraConnected === false ? (
                      <span style={{ fontSize: 11, color: "var(--ghost-muted)", fontWeight: 500, fontFamily: "var(--font-body)" }}>
                        · <a href="/dashboard/connect" style={{ color: "var(--gold-600)", textDecoration: "none" }}>Connect Jira</a> to push
                      </span>
                    ) : null
                  )}
                </div>
              )}

              {/* Jira push panel */}
              {pushPanel === msg.id && (
                <div style={{
                  maxWidth: "84%",
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(201,168,76,0.3)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginTop: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}>
                  <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gold-700)", fontFamily: "var(--font-body)" }}>
                    Push to Jira · {projectKey}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={pushSummary}
                      onChange={e => setPushSummary(e.target.value)}
                      placeholder="Card summary / title"
                      style={{ ...inp, flex: 1, fontSize: 12.5 }}
                      onFocus={e => { e.target.style.borderColor = "var(--gold-500)"; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.14)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.25)"; e.target.style.boxShadow = "none"; }}
                    />
                    <select
                      value={pushIssueType}
                      onChange={e => setPushIssueType(e.target.value)}
                      style={{ ...inp, fontSize: 12.5, cursor: "pointer" }}>
                      <option>Epic</option>
                      <option>Story</option>
                      <option>Task</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => pushToJira(msg)}
                      disabled={pushing || !pushSummary.trim()}
                      style={{ flex: 1, padding: "8px", borderRadius: 7, border: "none", background: pushing ? "rgba(201,168,76,0.3)" : "var(--gold-500)", color: pushing ? "var(--gold-700)" : "var(--navy-900)", fontSize: 12.5, fontWeight: 700, cursor: pushing ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", transition: "all 0.15s" }}>
                      {pushing ? "Creating…" : "Create in Jira"}
                    </button>
                    <button onClick={() => setPushPanel(null)}
                      style={{ padding: "8px 14px", borderRadius: 7, border: "1px solid rgba(201,168,76,0.25)", background: "none", color: "var(--ghost-muted)", fontSize: 12.5, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(245,240,234,0.8))", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "16px 16px 16px 4px", padding: "12px 18px" }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--gold-500)",
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: "12px 24px 16px",
          borderTop: "1px solid rgba(201,168,76,0.18)",
          background: "rgba(255,255,255,0.6)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            background: "rgba(255,255,255,0.85)",
            border: "1.5px solid rgba(201,168,76,0.3)",
            borderRadius: 12,
            padding: "8px 12px 8px 16px",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = "var(--gold-500)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)"; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={totalFiles === 0
                ? "Upload a SOW or knowledge files first…"
                : "Ask about the project, or describe what requirements you need…"}
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 13.5,
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                color: "var(--ghost-text)",
                lineHeight: 1.55,
                minHeight: 22,
                maxHeight: 140,
                overflow: "auto",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                flexShrink: 0,
                width: 34, height: 34,
                borderRadius: 8,
                border: "none",
                background: loading || !input.trim() ? "rgba(201,168,76,0.2)" : "var(--gold-500)",
                color: loading || !input.trim() ? "var(--gold-700)" : "var(--navy-900)",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7"/>
              </svg>
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--ghost-muted)", fontWeight: 500, marginTop: 6, textAlign: "center", fontFamily: "var(--font-body)" }}>
            Enter to send · Shift+Enter for new line · {activeModel}
          </p>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
