"use client";

import { useState, useRef, useEffect } from "react";

type TextBlock = { type: "text"; text: string };
type ImageBlock = { type: "image_url"; image_url: { url: string } };
type ContentBlock = TextBlock | ImageBlock;
type Message = { role: "user" | "assistant"; content: string | ContentBlock[] };
type Attachment = { id: string; name: string; kind: "image" | "text"; data: string };

const ACCEPTED = ".png,.jpg,.jpeg,.webp,.gif,.txt,.md,.json,.csv,.js,.ts,.py,.xml,.yaml,.yml";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const QUICK_ACTIONS = [
  { label: "New Story",  tag: "[Story] ",  icon: "◈" },
  { label: "New Task",   tag: "[Task] ",   icon: "☐" },
  { label: "Report Bug", tag: "[Bug] ",    icon: "⚠" },
  { label: "New Epic",   tag: "[Epic] ",   icon: "◆" },
];

const Asterisk = ({ size = 20, color = "#d97757" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function readAs(file: File, mode: "dataURL" | "text"): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    mode === "dataURL" ? r.readAsDataURL(file) : r.readAsText(file);
  });
}

function AttachmentChip({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "#2a2a2a", border: "1px solid #333", borderRadius: 8, fontSize: 12, color: "#888" }}>
      {att.kind === "image"
        ? <img src={att.data} alt={att.name} style={{ width: 16, height: 16, borderRadius: 3, objectFit: "cover" }} />
        : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      }
      <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
      <button onClick={onRemove} style={{ color: "#555", lineHeight: 1, background: "none", border: "none", cursor: "pointer", paddingLeft: 2 }}
        onMouseEnter={e => (e.currentTarget.style.color = "#e05555")}
        onMouseLeave={e => (e.currentTarget.style.color = "#555")}>×</button>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const content = message.content;
  const texts: string[] = [];
  const images: string[] = [];

  if (typeof content === "string") {
    texts.push(content);
  } else {
    content.forEach(b => {
      if (b.type === "text") texts.push(b.text);
      else if (b.type === "image_url") images.push(b.image_url.url);
    });
  }

  return (
    <div style={{ display: "flex", gap: 12, flexDirection: isUser ? "row-reverse" : "row" }}>
      {/* Avatar */}
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
        background: isUser ? "#252525" : "transparent",
        border: isUser ? "1px solid #303030" : "none",
      }}>
        {isUser
          ? <span style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>U</span>
          : <Asterisk size={18} />
        }
      </div>

      {/* Content */}
      <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", gap: 8, alignItems: isUser ? "flex-end" : "flex-start" }}>
        {images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {images.map((src, i) => (
              <img key={i} src={src} alt="attachment" style={{ maxWidth: 200, maxHeight: 160, borderRadius: 10, objectFit: "cover", border: "1px solid #2d2d2d" }} />
            ))}
          </div>
        )}
        {texts.join("").trim() && (
          <div style={{
            fontSize: 14,
            lineHeight: 1.65,
            color: isUser ? "#ccc" : "#e4e4e4",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {texts.join("\n")}
          </div>
        )}
      </div>
    </div>
  );
}

function InputArea({
  input, setInput, attachments, setAttachments, onSend, loading, fileInputRef,
}: {
  input: string; setInput: (v: string) => void;
  attachments: Attachment[]; setAttachments: (fn: (p: Attachment[]) => Attachment[]) => void;
  onSend: () => void; loading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      const isImg = IMAGE_TYPES.includes(f.type);
      next.push({ id: `${Date.now()}-${Math.random()}`, name: f.name, kind: isImg ? "image" : "text", data: await readAs(f, isImg ? "dataURL" : "text") });
    }
    setAttachments(prev => [...prev, ...next]);
  }

  function resize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  }

  const canSend = !!(input.trim() || attachments.length > 0) && !loading;

  return (
    <div
      style={{ background: "#212121", border: "1px solid #2d2d2d", borderRadius: 14, overflow: "hidden" }}
      onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      onDragOver={e => e.preventDefault()}
    >
      {/* Attachments */}
      {attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "12px 14px 4px" }}>
          {attachments.map(att => (
            <AttachmentChip key={att.id} att={att} onRemove={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} />
          ))}
        </div>
      )}

      {/* Textarea */}
      <div style={{ padding: "12px 14px 4px" }}>
        <textarea
          ref={taRef}
          value={input}
          onChange={e => { setInput(e.target.value); resize(); }}
          onKeyDown={handleKeyDown}
          placeholder="Describe a feature, bug, or requirement…"
          rows={1}
          style={{
            width: "100%",
            resize: "none",
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 14,
            color: "#e4e4e4",
            lineHeight: 1.6,
            maxHeight: 160,
            caretColor: "#d97757",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", padding: "6px 10px 10px", gap: 6 }}>
        {/* Attach */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file or image"
          style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", transition: "all 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#2a2a2a"; (e.currentTarget as HTMLElement).style.color = "#999"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#555"; }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
        </button>

        {/* Model label */}
        <span style={{ flex: 1, textAlign: "center", fontSize: 12, color: "#444" }}>
          A3 V2 · Groq
        </span>

        {/* Send */}
        <button
          onClick={onSend}
          disabled={!canSend}
          style={{
            width: 30, height: 30, borderRadius: 8, border: "none", cursor: canSend ? "pointer" : "not-allowed",
            background: canSend ? "#d97757" : "#2a2a2a",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", opacity: canSend ? 1 : 0.4,
          }}
          onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLElement).style.background = "#e8845f"; }}
          onMouseLeave={e => { if (canSend) (e.currentTarget as HTMLElement).style.background = "#d97757"; }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasStarted = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
    const userContent = buildContent();
    const newMessages: Message[] = [...messages, { role: "user", content: userContent }];
    setMessages(newMessages);
    setInput("");
    setAttachments([]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: data.error?.includes("GROQ_API_KEY") ? "⚠️ GROQ_API_KEY not configured." : `Error: ${data.error || "Something went wrong."}` }]);
        return;
      }
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#181818" }}>

      {/* ── Chat history ── */}
      {hasStarted && (
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 0" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>
            {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
            {loading && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Asterisk size={18} />
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center", paddingTop: 6 }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#444", display: "inline-block",
                      animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* ── Home / greeting ── */}
      {!hasStarted && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 48px" }}>
          {/* Greeting */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
            <Asterisk size={36} />
            <h1 style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "2.25rem",
              fontWeight: 300,
              color: "#e4e4e4",
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}>
              {greeting()}, Admin
            </h1>
          </div>

          {/* Input */}
          <div style={{ width: "100%", maxWidth: 640 }}>
            <InputArea input={input} setInput={setInput} attachments={attachments} setAttachments={setAttachments} onSend={sendMessage} loading={loading} fileInputRef={fileInputRef} />

            {/* Quick actions */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => setInput(a.tag)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", borderRadius: 20,
                    background: "transparent", border: "1px solid #2d2d2d",
                    color: "#777", fontSize: 13, cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#444"; (e.currentTarget as HTMLElement).style.color = "#ccc"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#2d2d2d"; (e.currentTarget as HTMLElement).style.color = "#777"; }}
                >
                  <span style={{ color: "#d97757", fontSize: 11 }}>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Chat input bar ── */}
      {hasStarted && (
        <div style={{ padding: "12px 24px 20px", flexShrink: 0 }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <InputArea input={input} setInput={setInput} attachments={attachments} setAttachments={setAttachments} onSend={sendMessage} loading={loading} fileInputRef={fileInputRef} />
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple accept={ACCEPTED} style={{ display: "none" }}
        onChange={e => {
          const files = e.target.files;
          if (!files) return;
          Promise.all(Array.from(files).map(async f => {
            const isImg = IMAGE_TYPES.includes(f.type);
            return { id: `${Date.now()}-${Math.random()}`, name: f.name, kind: isImg ? "image" as const : "text" as const, data: await readAs(f, isImg ? "dataURL" : "text") };
          })).then(next => setAttachments(prev => [...prev, ...next]));
        }}
        onClick={e => ((e.target as HTMLInputElement).value = "")}
      />

      <style jsx>{`
        @keyframes dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
