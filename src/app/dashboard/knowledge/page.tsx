"use client";

import { useState, useEffect, useRef } from "react";

type KBFile = {
  id: string;
  project_key: string;
  name: string;
  size_bytes: number;
  created_at: string;
};

type ProjectGroup = {
  project_key: string;
  files: KBFile[];
  total_bytes: number;
  last_added: string;
};

const ACCEPTED = ".txt,.md,.json,.csv,.yaml,.yml,.js,.ts,.tsx,.jsx,.py,.xml,.html,.css";
const MAX_BYTES = 150_000;

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupByProject(files: KBFile[]): ProjectGroup[] {
  const map = new Map<string, KBFile[]>();
  for (const f of files) {
    if (!map.has(f.project_key)) map.set(f.project_key, []);
    map.get(f.project_key)!.push(f);
  }
  return Array.from(map.entries()).map(([project_key, files]) => ({
    project_key,
    files,
    total_bytes: files.reduce((s, f) => s + f.size_bytes, 0),
    last_added: files.reduce((latest, f) => f.created_at > latest ? f.created_at : latest, files[0].created_at),
  }));
}

/* ── Shared styles ─────────────────────────────────────────────── */
const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.78)",
  border: "1px solid rgba(201,168,76,0.25)",
  borderRadius: 6, padding: "9px 13px",
  fontSize: 14, color: "var(--ghost-text)",
  outline: "none", fontFamily: "var(--font-body)",
  fontWeight: 500, transition: "border-color 0.15s, box-shadow 0.15s",
};

function focusGold(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "var(--gold-500)";
  (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(201,168,76,0.14)";
}
function blurGold(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "rgba(201,168,76,0.25)";
  (e.target as HTMLElement).style.boxShadow = "none";
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function KnowledgePage() {
  const [allFiles, setAllFiles]       = useState<KBFile[]>([]);
  const [projectKey, setProjectKey]   = useState("");
  const [dragging, setDragging]       = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [notice, setNotice]           = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [addingTo, setAddingTo]       = useState<string | null>(null); // project key for inline add

  const mainFileRef = useRef<HTMLInputElement>(null);
  const rowFileRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  function flash(msg: string, type: "ok" | "err" = "ok") {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 3000);
  }

  async function loadFiles() {
    const r = await fetch("/api/knowledge");
    if (r.ok) setAllFiles(await r.json());
  }

  useEffect(() => { loadFiles(); }, []);

  async function uploadFiles(fileList: FileList | null, targetProject: string) {
    if (!fileList || !targetProject.trim()) { flash("Enter a project key first.", "err"); return; }
    setUploading(true);
    let added = 0;
    for (const file of Array.from(fileList)) {
      const text = await file.text();
      const truncated = text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
      const r = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_key: targetProject.toUpperCase(), name: file.name, content: truncated }),
      });
      if (r.ok) added++;
      if (text.length > MAX_BYTES) flash(`"${file.name}" truncated to 150 KB.`, "ok");
    }
    setUploading(false);
    await loadFiles();
    // Auto-expand the project after upload
    setExpanded(prev => new Set([...prev, targetProject.toUpperCase()]));
    if (added > 0) flash(`${added} file${added > 1 ? "s" : ""} added to ${targetProject.toUpperCase()}.`);
  }

  async function deleteFile(id: string) {
    setDeleting(id);
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    await loadFiles();
    setDeleting(null);
  }

  async function clearProject(projectKey: string) {
    const group = groups.find(g => g.project_key === projectKey);
    if (!group) return;
    await Promise.all(group.files.map(f => fetch(`/api/knowledge/${f.id}`, { method: "DELETE" })));
    await loadFiles();
    flash(`Cleared all files for ${projectKey}.`);
  }

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const groups = groupByProject(allFiles);
  const totalFiles = allFiles.length;
  const totalBytes = allFiles.reduce((s, f) => s + f.size_bytes, 0);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "40px 44px", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ color: "var(--gold-500)", fontSize: 11 }}>◆</span>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: "var(--gold-500)", letterSpacing: "0.14em" }}>Knowledge Base</h1>
            </div>
            <div style={{ height: 1, width: 88, background: "linear-gradient(90deg, var(--gold-500), rgba(201,168,76,0.15), transparent)" }} />
            <p style={{ fontSize: 13.5, color: "var(--ghost-secondary)", marginTop: 10, fontFamily: "var(--font-body)", fontWeight: 500 }}>
              Upload reference files per project. The AI uses them in every chat — with or without Jira connected.
            </p>
          </div>
          {totalFiles > 0 && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, color: "var(--gold-500)" }}>{totalFiles}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ghost-muted)", fontFamily: "var(--font-body)" }}>files · {fmtSize(totalBytes)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div style={{ marginBottom: 20, padding: "10px 16px", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
          background: notice.type === "ok" ? "rgba(201,168,76,0.1)" : "rgba(200,80,80,0.08)",
          border: `1px solid ${notice.type === "ok" ? "rgba(201,168,76,0.3)" : "rgba(200,80,80,0.22)"}`,
          color: notice.type === "ok" ? "var(--gold-700)" : "#b83030",
        }}>
          {notice.type === "ok" ? "◆ " : "✗ "}{notice.msg}
        </div>
      )}

      {/* Upload section */}
      <div style={{
        background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(255,255,255,0.84) 44%)",
        border: "1px solid rgba(201,168,76,0.30)", borderLeft: "3px solid var(--gold-500)",
        borderRadius: 10, padding: "20px 24px", marginBottom: 24,
      }}>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: 10, letterSpacing: "0.22em", color: "var(--gold-700)", textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>
          ◈ Add Files
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 160px" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ghost-secondary)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Project Key</label>
            <input value={projectKey} onChange={e => setProjectKey(e.target.value.toUpperCase())}
              placeholder="e.g. PROJ"
              style={{ ...inp, width: "100%", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.06em" }}
              onFocus={focusGold} onBlur={blurGold} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ghost-secondary)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Files</label>
            <div
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files, projectKey); }}
              onClick={() => mainFileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "var(--gold-500)" : "rgba(201,168,76,0.35)"}`,
                borderRadius: 8, padding: "14px 20px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                cursor: "pointer", background: dragging ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.5)",
                transition: "all 0.2s",
              }}>
              <span style={{ fontSize: 16, color: dragging ? "var(--gold-500)" : "rgba(201,168,76,0.5)" }}>◈</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 500, color: uploading ? "var(--ghost-muted)" : "var(--ghost-secondary)" }}>
                {uploading ? "Uploading…" : "Drop files or click to browse"}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--ghost-muted)", fontFamily: "var(--font-body)" }}>· 150 KB max</span>
            </div>
          </div>
        </div>
        <input ref={mainFileRef} type="file" multiple accept={ACCEPTED} style={{ display: "none" }}
          onChange={e => { uploadFiles(e.target.files, projectKey); (e.target as HTMLInputElement).value = ""; }} />
        <p style={{ fontSize: 12, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", fontWeight: 500, marginTop: 12 }}>
          Supported: .txt · .md · .json · .csv · .yaml · .js · .ts · .py · .xml · .html · .css
        </p>
      </div>

      {/* Table */}
      {groups.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60, gap: 12 }}>
          <span style={{ fontSize: 32, color: "rgba(201,168,76,0.25)" }}>◈</span>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 500, color: "var(--ghost-muted)" }}>No knowledge base yet</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ghost-muted)" }}>Enter a project key above and drop your files to get started</p>
        </div>
      ) : (
        <div style={{
          background: "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(255,255,255,0.84) 44%)",
          border: "1px solid rgba(201,168,76,0.28)", borderRadius: 10, overflow: "hidden",
        }}>

          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 80px 100px 150px 1fr",
            padding: "10px 20px",
            borderBottom: "1px solid rgba(201,168,76,0.2)",
            background: "rgba(201,168,76,0.06)",
          }}>
            {["Project", "Files", "Size", "Last Updated", ""].map(h => (
              <span key={h} style={{ fontFamily: "var(--font-heading)", fontSize: 9, letterSpacing: "0.22em", color: "var(--gold-700)", textTransform: "uppercase", fontWeight: 600 }}>{h}</span>
            ))}
          </div>

          {/* Project rows */}
          {groups.map((g, gi) => {
            const isOpen = expanded.has(g.project_key);
            const isLast = gi === groups.length - 1;

            return (
              <div key={g.project_key} style={{ borderBottom: isLast ? "none" : "1px solid rgba(201,168,76,0.14)" }}>

                {/* Project row */}
                <div
                  style={{
                    display: "grid", gridTemplateColumns: "2fr 80px 100px 150px 1fr",
                    padding: "14px 20px", alignItems: "center",
                    cursor: "pointer", transition: "background 0.15s",
                    background: isOpen ? "rgba(201,168,76,0.05)" : "transparent",
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "rgba(201,168,76,0.03)"; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                  onClick={() => toggleExpand(g.project_key)}>

                  {/* Project key */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: isOpen ? "var(--gold-500)" : "var(--ghost-muted)", transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span>
                    <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "var(--ghost-text)", letterSpacing: "0.04em" }}>{g.project_key}</span>
                  </div>

                  {/* File count */}
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 600, color: "var(--ghost-text)" }}>
                    {g.files.length}
                  </span>

                  {/* Size */}
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--ghost-secondary)" }}>
                    {fmtSize(g.total_bytes)}
                  </span>

                  {/* Last updated */}
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--ghost-muted)" }}>
                    {fmtDate(g.last_added)}
                  </span>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { rowFileRefs.current.get(g.project_key)?.click(); }}
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--gold-700)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.18)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; }}>
                      + Add
                    </button>
                    <button
                      onClick={() => clearProject(g.project_key)}
                      style={{ fontSize: 12, fontWeight: 500, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", transition: "color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#b83030"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--ghost-muted)"}>
                      Clear
                    </button>
                    <input
                      ref={el => { if (el) rowFileRefs.current.set(g.project_key, el); }}
                      type="file" multiple accept={ACCEPTED} style={{ display: "none" }}
                      onChange={e => { uploadFiles(e.target.files, g.project_key); (e.target as HTMLInputElement).value = ""; }}
                    />
                  </div>
                </div>

                {/* Expanded file rows */}
                {isOpen && (
                  <div style={{ background: "rgba(255,255,255,0.5)", borderTop: "1px solid rgba(201,168,76,0.12)" }}>

                    {/* File sub-header */}
                    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 100px 150px 80px", padding: "8px 20px 6px", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                      {["", "File name", "Size", "Added", ""].map((h, i) => (
                        <span key={i} style={{ fontFamily: "var(--font-heading)", fontSize: 8.5, letterSpacing: "0.2em", color: "var(--ghost-muted)", textTransform: "uppercase", fontWeight: 600 }}>{h}</span>
                      ))}
                    </div>

                    {g.files.map((f, fi) => (
                      <div key={f.id} style={{
                        display: "grid", gridTemplateColumns: "32px 1fr 100px 150px 80px",
                        padding: "10px 20px", alignItems: "center",
                        borderBottom: fi < g.files.length - 1 ? "1px solid rgba(201,168,76,0.08)" : "none",
                        transition: "background 0.12s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                        {/* File icon */}
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--gold-700)" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                        </div>

                        {/* File name */}
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 500, color: "var(--ghost-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
                          {f.name}
                        </span>

                        {/* Size */}
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ghost-muted)", fontWeight: 500 }}>
                          {fmtSize(f.size_bytes)}
                        </span>

                        {/* Date */}
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ghost-muted)", fontWeight: 500 }}>
                          {fmtDate(f.created_at)}
                        </span>

                        {/* Remove */}
                        <button onClick={() => deleteFile(f.id)} disabled={deleting === f.id}
                          style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", transition: "color 0.15s", textAlign: "left" }}
                          onMouseEnter={e => e.currentTarget.style.color = "#b83030"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--ghost-muted)"}>
                          {deleting === f.id ? "…" : "Remove"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
