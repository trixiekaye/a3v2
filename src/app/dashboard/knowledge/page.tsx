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

/* ── File filtering ─────────────────────────────────────────────── */
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
  // No extension but common text filenames
  if (!ext) return ["Dockerfile","Makefile","Procfile","Rakefile",".gitignore",".env.example"].includes(file.name);
  return TEXT_EXTENSIONS.has(ext);
}

function shouldSkip(relativePath: string): boolean {
  const segments = relativePath.split("/");
  // Skip hidden dirs/files inside folder (but allow root selection)
  if (segments.some(s => SKIP_DIRS.has(s))) return true;
  const filename = segments[segments.length - 1];
  if (SKIP_FILES.has(filename)) return true;
  return false;
}

function fmtSize(bytes: number) {
  if (bytes < 1024)            return `${bytes} B`;
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
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
    project_key, files,
    total_bytes: files.reduce((s, f) => s + f.size_bytes, 0),
    last_added:  files.reduce((l, f) => f.created_at > l ? f.created_at : l, files[0].created_at),
  }));
}

/* ── Shared styles ─────────────────────────────────────────────── */
const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.78)", border: "1px solid rgba(201,168,76,0.25)",
  borderRadius: 6, padding: "9px 13px", fontSize: 14, color: "var(--ghost-text)",
  outline: "none", fontFamily: "var(--font-body)", fontWeight: 500,
  transition: "border-color 0.15s, box-shadow 0.15s",
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
  const [allFiles, setAllFiles]     = useState<KBFile[]>([]);
  const [projectKey, setProjectKey] = useState("");
  const [dragging, setDragging]     = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice]         = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [deleting, setDeleting]     = useState<string | null>(null);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const rowFileRefs    = useRef<Map<string, HTMLInputElement>>(new Map());
  const rowFolderRefs  = useRef<Map<string, HTMLInputElement>>(new Map());

  // Set webkitdirectory on folder inputs (not a standard HTML attribute)
  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
  }, []);
  useEffect(() => {
    rowFolderRefs.current.forEach(el => el?.setAttribute("webkitdirectory", ""));
  });

  function flash(msg: string, type: "ok" | "err" = "ok") {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4000);
  }

  async function loadFiles() {
    const r = await fetch("/api/knowledge");
    if (r.ok) setAllFiles(await r.json());
  }

  useEffect(() => { loadFiles(); }, []);

  async function uploadFiles(fileList: FileList | null, targetProject: string, isFolder = false) {
    if (!fileList || !targetProject.trim()) {
      flash("Enter a project key first.", "err");
      return;
    }

    // Build list of uploadable files
    const candidates: { file: File; storedName: string }[] = [];
    let skippedBinary = 0;
    let skippedDir    = 0;

    for (const file of Array.from(fileList)) {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

      if (isFolder && shouldSkip(relativePath)) { skippedDir++;    continue; }
      if (!isTextFile(file))                     { skippedBinary++; continue; }

      // Strip root folder segment for folder uploads (keep sub-path)
      const segments   = relativePath.split("/");
      const storedName = isFolder && segments.length > 1
        ? segments.slice(1).join("/")  // remove root folder name
        : file.name;

      candidates.push({ file, storedName });
    }

    if (candidates.length === 0) {
      flash(`No supported text files found.${skippedBinary ? ` ${skippedBinary} binary file(s) skipped.` : ""}`, "err");
      return;
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: candidates.length });
    let added = 0; let truncated = 0;

    for (let i = 0; i < candidates.length; i++) {
      const { file, storedName } = candidates[i];
      setUploadProgress({ done: i, total: candidates.length });

      const text      = await file.text();
      const wasCut    = text.length > MAX_BYTES;
      const content   = wasCut ? text.slice(0, MAX_BYTES) : text;
      if (wasCut) truncated++;

      await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_key: targetProject.toUpperCase(), name: storedName, content }),
      });
      added++;
    }

    setUploading(false);
    setUploadProgress(null);
    await loadFiles();
    setExpanded(prev => new Set([...prev, targetProject.toUpperCase()]));

    const parts = [`${added} file${added !== 1 ? "s" : ""} added to ${targetProject.toUpperCase()}`];
    if (skippedBinary) parts.push(`${skippedBinary} binary skipped`);
    if (skippedDir)    parts.push(`${skippedDir} system/build skipped`);
    if (truncated)     parts.push(`${truncated} truncated to 150 KB`);
    flash(parts.join(" · "));
  }

  async function deleteFile(id: string) {
    setDeleting(id);
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    await loadFiles();
    setDeleting(null);
  }

  async function clearProject(key: string) {
    const group = groups.find(g => g.project_key === key);
    if (!group) return;
    await Promise.all(group.files.map(f => fetch(`/api/knowledge/${f.id}`, { method: "DELETE" })));
    await loadFiles();
    flash(`Cleared all files for ${key}.`);
  }

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const groups     = groupByProject(allFiles);
  const totalFiles = allFiles.length;
  const totalBytes = allFiles.reduce((s, f) => s + f.size_bytes, 0);

  /* ── Render ──────────────────────────────────────────────────── */
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
              Upload files or entire folders per project. The AI references them in every chat.
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
          ◈ Add Knowledge
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Project key */}
          <div style={{ flex: "0 0 160px" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ghost-secondary)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Project Key</label>
            <input value={projectKey} onChange={e => setProjectKey(e.target.value.toUpperCase())}
              placeholder="e.g. PROJ"
              style={{ ...inp, width: "100%", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.06em" }}
              onFocus={focusGold} onBlur={blurGold} />
          </div>

          {/* Drop zone */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ghost-secondary)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Files or Folder</label>
            <div
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files, projectKey); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "var(--gold-500)" : "rgba(201,168,76,0.35)"}`,
                borderRadius: 8, padding: "14px 20px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                cursor: "pointer", background: dragging ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.5)",
                transition: "all 0.2s",
              }}>
              <span style={{ fontSize: 16, color: dragging ? "var(--gold-500)" : "rgba(201,168,76,0.5)" }}>◈</span>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 500, color: uploading ? "var(--ghost-muted)" : "var(--ghost-secondary)" }}>
                  {uploading
                    ? uploadProgress
                      ? `Uploading ${uploadProgress.done + 1} / ${uploadProgress.total}…`
                      : "Uploading…"
                    : "Drop files here or click to browse"}
                </p>
                <p style={{ fontSize: 11.5, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", marginTop: 2 }}>Drag a folder here, or use the button below · 150 KB/file</p>
              </div>
            </div>
          </div>

          {/* Folder button */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 0 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ghost-secondary)", marginBottom: 6, fontFamily: "var(--font-body)", visibility: "hidden" }}>_</label>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: 8, cursor: uploading ? "not-allowed" : "pointer",
                background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.35)",
                color: "var(--gold-700)", fontSize: 13.5, fontWeight: 600,
                fontFamily: "var(--font-body)", transition: "all 0.15s", whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = "rgba(201,168,76,0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
              </svg>
              Upload Folder
            </button>
          </div>
        </div>

        {/* Info strip */}
        <div style={{ marginTop: 14, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <p style={{ fontSize: 12, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", fontWeight: 500 }}>
            <strong style={{ color: "var(--ghost-secondary)" }}>Files:</strong> .txt · .md · .json · .yaml · .ts · .py · .html · .css · .sql · and more
          </p>
          <p style={{ fontSize: 12, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", fontWeight: 500 }}>
            <strong style={{ color: "var(--ghost-secondary)" }}>Folder:</strong> auto-skips node_modules, .git, dist, build, binary files
          </p>
        </div>

        {/* Hidden inputs */}
        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
          onChange={e => { uploadFiles(e.target.files, projectKey); (e.target as HTMLInputElement).value = ""; }} />
        <input ref={folderInputRef} type="file" multiple style={{ display: "none" }}
          onChange={e => { uploadFiles(e.target.files, projectKey, true); (e.target as HTMLInputElement).value = ""; }} />
      </div>

      {/* Table */}
      {groups.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60, gap: 12 }}>
          <span style={{ fontSize: 32, color: "rgba(201,168,76,0.25)" }}>◈</span>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 500, color: "var(--ghost-muted)" }}>No knowledge base yet</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ghost-muted)" }}>Enter a project key and drop files or a folder to get started</p>
        </div>
      ) : (
        <div style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(255,255,255,0.84) 44%)", border: "1px solid rgba(201,168,76,0.28)", borderRadius: 10, overflow: "hidden" }}>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px 150px 1fr", padding: "10px 20px", borderBottom: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.06)" }}>
            {["Project", "Files", "Size", "Last Updated", ""].map(h => (
              <span key={h} style={{ fontFamily: "var(--font-heading)", fontSize: 9, letterSpacing: "0.22em", color: "var(--gold-700)", textTransform: "uppercase", fontWeight: 600 }}>{h}</span>
            ))}
          </div>

          {groups.map((g, gi) => {
            const isOpen = expanded.has(g.project_key);
            const isLast = gi === groups.length - 1;

            return (
              <div key={g.project_key} style={{ borderBottom: isLast ? "none" : "1px solid rgba(201,168,76,0.14)" }}>

                {/* Project row */}
                <div
                  style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px 150px 1fr", padding: "14px 20px", alignItems: "center", cursor: "pointer", transition: "background 0.15s", background: isOpen ? "rgba(201,168,76,0.05)" : "transparent" }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "rgba(201,168,76,0.03)"; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                  onClick={() => toggleExpand(g.project_key)}>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: isOpen ? "var(--gold-500)" : "var(--ghost-muted)", transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span>
                    <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "var(--ghost-text)", letterSpacing: "0.04em" }}>{g.project_key}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 600, color: "var(--ghost-text)" }}>{g.files.length}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--ghost-secondary)" }}>{fmtSize(g.total_bytes)}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--ghost-muted)" }}>{fmtDate(g.last_added)}</span>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
                    {/* Add files to this project */}
                    <button
                      onClick={() => rowFileRefs.current.get(g.project_key)?.click()}
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--gold-700)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}>
                      + Files
                    </button>
                    {/* Add folder to this project */}
                    <button
                      onClick={() => {
                        const el = rowFolderRefs.current.get(g.project_key);
                        if (el) { el.setAttribute("webkitdirectory", ""); el.click(); }
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--gold-700)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.18)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}>
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
                      + Folder
                    </button>
                    <button
                      onClick={() => clearProject(g.project_key)}
                      style={{ fontSize: 12, fontWeight: 500, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", transition: "color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#b83030"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--ghost-muted)"}>
                      Clear
                    </button>

                    <input ref={el => { if (el) rowFileRefs.current.set(g.project_key, el); }} type="file" multiple style={{ display: "none" }}
                      onChange={e => { uploadFiles(e.target.files, g.project_key); (e.target as HTMLInputElement).value = ""; }} />
                    <input ref={el => { if (el) { rowFolderRefs.current.set(g.project_key, el); el.setAttribute("webkitdirectory", ""); } }} type="file" multiple style={{ display: "none" }}
                      onChange={e => { uploadFiles(e.target.files, g.project_key, true); (e.target as HTMLInputElement).value = ""; }} />
                  </div>
                </div>

                {/* Expanded file list */}
                {isOpen && (
                  <div style={{ background: "rgba(255,255,255,0.5)", borderTop: "1px solid rgba(201,168,76,0.12)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 100px 150px 80px", padding: "8px 20px 6px", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                      {["", "File path", "Size", "Added", ""].map((h, i) => (
                        <span key={i} style={{ fontFamily: "var(--font-heading)", fontSize: 8.5, letterSpacing: "0.2em", color: "var(--ghost-muted)", textTransform: "uppercase", fontWeight: 600 }}>{h}</span>
                      ))}
                    </div>
                    {g.files.map((f, fi) => (
                      <div key={f.id}
                        style={{ display: "grid", gridTemplateColumns: "32px 1fr 100px 150px 80px", padding: "10px 20px", alignItems: "center", borderBottom: fi < g.files.length - 1 ? "1px solid rgba(201,168,76,0.08)" : "none", transition: "background 0.12s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--gold-700)" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                        </div>
                        {/* Show folder path if name contains / */}
                        <div style={{ overflow: "hidden", paddingRight: 12 }}>
                          {f.name.includes("/") ? (
                            <div>
                              <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ghost-muted)", fontWeight: 500 }}>
                                {f.name.substring(0, f.name.lastIndexOf("/") + 1)}
                              </span>
                              <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 600, color: "var(--ghost-text)" }}>
                                {f.name.substring(f.name.lastIndexOf("/") + 1)}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 600, color: "var(--ghost-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{f.name}</span>
                          )}
                        </div>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ghost-muted)", fontWeight: 500 }}>{fmtSize(f.size_bytes)}</span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ghost-muted)", fontWeight: 500 }}>{fmtDate(f.created_at)}</span>
                        <button onClick={() => deleteFile(f.id)} disabled={deleting === f.id}
                          style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", transition: "color 0.15s" }}
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
