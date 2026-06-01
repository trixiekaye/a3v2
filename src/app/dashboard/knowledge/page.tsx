"use client";

import { useState, useEffect, useRef } from "react";

export type KBFile = {
  id: string;
  name: string;
  content: string;
  sizeBytes: number;
  addedAt: string;
};

const ACCEPTED = ".txt,.md,.json,.csv,.yaml,.yml,.js,.ts,.tsx,.jsx,.py,.xml,.html,.css,.env.example";
const MAX_FILE_BYTES = 150_000; // 150 KB per file

function storageKey(projectKey: string) {
  return `a3_kb_${projectKey.trim().toUpperCase()}`;
}

function loadFiles(projectKey: string): KBFile[] {
  if (!projectKey.trim()) return [];
  try {
    const raw = localStorage.getItem(storageKey(projectKey));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveFiles(projectKey: string, files: KBFile[]) {
  localStorage.setItem(storageKey(projectKey), JSON.stringify(files));
}

function allProjects(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("a3_kb_")) keys.push(k.replace("a3_kb_", ""));
  }
  return keys.sort();
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function totalContext(files: KBFile[]) {
  return files.reduce((s, f) => s + f.sizeBytes, 0);
}

const card: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(255,255,255,0.84) 44%)",
  border: "1px solid rgba(201,168,76,0.30)",
  borderLeft: "3px solid var(--gold-500)",
  borderRadius: 10,
  padding: "24px 28px",
};
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: 10,
  letterSpacing: "0.22em",
  color: "var(--gold-700)",
  textTransform: "uppercase" as const,
  fontWeight: 600,
  marginBottom: 20,
};
const inp: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.78)",
  border: "1px solid rgba(201,168,76,0.25)",
  borderRadius: 6,
  padding: "10px 13px",
  fontSize: 14,
  color: "var(--ghost-text)",
  outline: "none",
  fontFamily: "var(--font-body)",
  fontWeight: 500,
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export default function KnowledgePage() {
  const [projectKey, setProjectKey]   = useState("");
  const [files, setFiles]             = useState<KBFile[]>([]);
  const [projects, setProjects]       = useState<string[]>([]);
  const [dragging, setDragging]       = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [notice, setNotice]           = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved project keys on mount
  useEffect(() => { setProjects(allProjects()); }, []);

  // Reload files when project changes
  useEffect(() => {
    setFiles(loadFiles(projectKey));
  }, [projectKey]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || !projectKey.trim()) {
      flash("Enter a project key first.");
      return;
    }
    setUploading(true);
    const current = loadFiles(projectKey);
    const next = [...current];

    for (const file of Array.from(fileList)) {
      const text = await file.text();
      const truncated = text.length > MAX_FILE_BYTES ? text.slice(0, MAX_FILE_BYTES) : text;
      const wasTruncated = text.length > MAX_FILE_BYTES;

      // Replace if same name already exists
      const existingIdx = next.findIndex(f => f.name === file.name);
      const entry: KBFile = {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        content: truncated,
        sizeBytes: new TextEncoder().encode(truncated).length,
        addedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) next[existingIdx] = entry;
      else next.push(entry);

      if (wasTruncated) flash(`"${file.name}" was truncated to 150 KB.`);
    }

    saveFiles(projectKey, next);
    setFiles(next);
    setProjects(allProjects());
    setUploading(false);
    if (!notice) flash(`${fileList.length} file${fileList.length > 1 ? "s" : ""} added to ${projectKey.toUpperCase()}.`);
  }

  function removeFile(id: string) {
    const next = files.filter(f => f.id !== id);
    saveFiles(projectKey, next);
    setFiles(next);
    if (next.length === 0) setProjects(allProjects());
  }

  function clearProject() {
    localStorage.removeItem(storageKey(projectKey));
    setFiles([]);
    setProjects(allProjects());
    flash(`Cleared all files for ${projectKey.toUpperCase()}.`);
  }

  const contextKB = (totalContext(files) / 1024).toFixed(1);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "40px 44px", maxWidth: 1120 }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ color: "var(--gold-500)", fontSize: 11 }}>◆</span>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: "var(--gold-500)", letterSpacing: "0.14em" }}>Knowledge Base</h1>
        </div>
        <div style={{ height: 1, width: 88, background: "linear-gradient(90deg, var(--gold-500), rgba(201,168,76,0.15), transparent)" }} />
        <p style={{ fontSize: 13.5, color: "var(--ghost-secondary)", marginTop: 10, fontFamily: "var(--font-body)", fontWeight: 500 }}>
          Upload reference files per Jira project. The AI will use them as context when generating cards.
        </p>
      </div>

      {/* Notice banner */}
      {notice && (
        <div style={{ marginBottom: 20, padding: "10px 16px", borderRadius: 8, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", fontSize: 13, fontWeight: 500, color: "var(--gold-700)", fontFamily: "var(--font-body)" }}>
          ◆ {notice}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* LEFT — Upload panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Project selector */}
          <div style={card}>
            <p style={eyebrow}>◈ Project</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ghost-secondary)", marginBottom: 7, fontFamily: "var(--font-body)" }}>
                Project Key
              </label>
              <input
                value={projectKey}
                onChange={e => setProjectKey(e.target.value.toUpperCase())}
                placeholder="e.g. PROJ, ENG, CMS"
                style={{ ...inp, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.06em" }}
                onFocus={e => { e.target.style.borderColor = "var(--gold-500)"; (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(201,168,76,0.14)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.25)"; (e.target as HTMLElement).style.boxShadow = "none"; }}
              />
            </div>

            {/* Existing projects quick-select */}
            {projects.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", marginBottom: 8 }}>Existing projects</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {projects.map(p => (
                    <button key={p} onClick={() => setProjectKey(p)}
                      style={{
                        padding: "4px 12px", borderRadius: 20, cursor: "pointer",
                        fontFamily: "monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                        background: projectKey === p ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.65)",
                        border: `1px solid ${projectKey === p ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.25)"}`,
                        color: projectKey === p ? "var(--gold-700)" : "var(--ghost-secondary)",
                        transition: "all 0.15s",
                      }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div style={card}>
            <p style={eyebrow}>◈ Upload Files</p>
            <div
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "var(--gold-500)" : "rgba(201,168,76,0.35)"}`,
                borderRadius: 8,
                padding: "32px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                cursor: "pointer",
                background: dragging ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.4)",
                transition: "all 0.2s",
              }}>
              <span style={{ fontSize: 28, color: dragging ? "var(--gold-500)" : "rgba(201,168,76,0.4)" }}>◈</span>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: uploading ? "var(--ghost-muted)" : "var(--ghost-text)" }}>
                  {uploading ? "Uploading…" : "Drop files here or click to browse"}
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ghost-muted)", marginTop: 4, fontWeight: 500 }}>
                  .txt · .md · .json · .csv · .yaml · .js · .ts · .py · .xml · .html
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--ghost-muted)", marginTop: 4 }}>
                  Max 150 KB per file
                </p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" multiple accept={ACCEPTED} style={{ display: "none" }}
              onChange={e => { handleFiles(e.target.files); (e.target as HTMLInputElement).value = ""; }} />
          </div>

          {/* Accepted formats info */}
          <div style={{ padding: "14px 18px", borderRadius: 8, background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.22)", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "var(--gold-500)", flexShrink: 0, fontSize: 13, marginTop: 1 }}>◆</span>
            <p style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ghost-secondary)", lineHeight: 1.6, fontFamily: "var(--font-body)" }}>
              Files are stored locally in your browser and injected into the AI context per message. Useful for PRDs, API specs, design docs, existing stories, or any reference material.
            </p>
          </div>
        </div>

        {/* RIGHT — File list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ ...card, minHeight: 200 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <p style={{ ...eyebrow, marginBottom: 4 }}>
                  ◈ {projectKey ? `${projectKey} Files` : "Files"}
                </p>
                {files.length > 0 && (
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ghost-muted)", fontFamily: "var(--font-body)" }}>
                    {files.length} file{files.length !== 1 ? "s" : ""} · {contextKB} KB context
                  </p>
                )}
              </div>
              {files.length > 0 && (
                <button onClick={clearProject}
                  style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#b83030")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--ghost-muted)")}>
                  Clear all
                </button>
              )}
            </div>

            {!projectKey.trim() ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, gap: 10 }}>
                <span style={{ fontSize: 24, color: "rgba(201,168,76,0.3)" }}>◈</span>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 500, color: "var(--ghost-muted)" }}>Enter a project key to view files</p>
              </div>
            ) : files.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, gap: 10 }}>
                <span style={{ fontSize: 24, color: "rgba(201,168,76,0.3)" }}>◈</span>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 500, color: "var(--ghost-muted)" }}>No files for {projectKey}</p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ghost-muted)", fontWeight: 400 }}>Upload files on the left to get started</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {files.map((f, i) => (
                  <div key={f.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
                    borderBottom: i < files.length - 1 ? "1px solid rgba(201,168,76,0.14)" : "none",
                  }}>
                    {/* File icon */}
                    <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.04))", border: "1px solid rgba(201,168,76,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gold-700)" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>

                    {/* File info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 600, color: "var(--ghost-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ghost-muted)", fontWeight: 500, marginTop: 2 }}>
                        {fmtSize(f.sizeBytes)} · {new Date(f.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeFile(f.id)}
                      style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", transition: "color 0.15s", flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#b83030")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--ghost-muted)")}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Context size meter */}
          {files.length > 0 && (
            <div style={{ padding: "16px 20px", borderRadius: 10, background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(255,255,255,0.84) 44%)", border: "1px solid rgba(201,168,76,0.28)", borderLeft: "3px solid var(--gold-500)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 9.5, letterSpacing: "0.2em", color: "var(--gold-700)", textTransform: "uppercase", fontWeight: 600 }}>Context size</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, color: "var(--gold-700)" }}>{contextKB} KB</span>
              </div>
              {/* Bar */}
              <div style={{ height: 5, borderRadius: 3, background: "rgba(201,168,76,0.15)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, var(--gold-500), var(--gold-400))", width: `${Math.min(100, (totalContext(files) / 150000) * 100)}%`, transition: "width 0.3s" }} />
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--ghost-muted)", marginTop: 7, fontWeight: 500 }}>
                Injected into every chat message for this project. Gemini 2.5 Pro supports up to 2M tokens.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
