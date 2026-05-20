"use client";

import { useState, useRef, useEffect } from "react";

type TextBlock  = { type: "text"; text: string };
type ImageBlock = { type: "image_url"; image_url: { url: string } };
type ContentBlock = TextBlock | ImageBlock;
type Message    = { role: "user" | "assistant"; content: string | ContentBlock[] };
type Attachment = { id: string; name: string; kind: "image" | "text"; data: string };

const ACCEPTED    = ".png,.jpg,.jpeg,.webp,.gif,.txt,.md,.json,.csv,.js,.ts,.py,.xml,.yaml,.yml";
const IMAGE_TYPES = ["image/png","image/jpeg","image/webp","image/gif"];

const QUICK_ACTIONS = [
  { label: "Story",     tag: "[Story] ",  badge: "◈" },
  { label: "Task",      tag: "[Task] ",   badge: "☐" },
  { label: "Bug",       tag: "[Bug] ",    badge: "!" },
  { label: "Epic",      tag: "[Epic] ",   badge: "◆" },
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

/* ── Attachment chip ── */
function AttachmentChip({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", background: "rgba(58,84,153,0.2)", border: "1px solid rgba(58,84,153,0.35)", borderRadius: 4, fontSize: 11.5, color: "var(--navy-200)", fontFamily: "var(--font-body)" }}>
      {att.kind === "image"
        ? <img src={att.data} alt={att.name} style={{ width: 14, height: 14, borderRadius: 2, objectFit: "cover" }} />
        : <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      }
      <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
      <button onClick={onRemove} style={{ color: "var(--navy-400)", background: "none", border: "none", cursor: "pointer", lineHeight: 1, paddingLeft: 2, fontSize: 13 }}
        onMouseEnter={e => (e.currentTarget.style.color = "#e07070")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--navy-400)")}>×</button>
    </div>
  );
}

/* ── Message bubble ── */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const content = message.content;
  const texts: string[] = [];
  const images: string[] = [];

  if (typeof content === "string") texts.push(content);
  else content.forEach(b => {
    if (b.type === "text") texts.push(b.text);
    else if (b.type === "image_url") images.push(b.image_url.url);
  });

  return (
    <div style={{ display: "flex", gap: 14, flexDirection: isUser ? "row-reverse" : "row" }}>
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0, marginTop: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isUser ? "rgba(58,84,153,0.2)" : "rgba(201,168,76,0.12)",
        border: isUser ? "1px solid rgba(58,84,153,0.35)" : "1px solid rgba(201,168,76,0.25)",
        fontFamily: "var(--font-heading)",
        fontSize: isUser ? 9 : 10,
        color: isUser ? "var(--navy-200)" : "var(--gold-400)",
        letterSpacing: "0.06em",
      }}>
        {isUser ? "TK" : "A3"}
      </div>

      {/* Content */}
      <div style={{ maxWidth: "74%", display: "flex", flexDirection: "column", gap: 8, alignItems: isUser ? "flex-end" : "flex-start" }}>
        {images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {images.map((src, i) => (
              <img key={i} src={src} alt="attachment" style={{ maxWidth: 200, maxHeight: 160, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(58,84,153,0.3)" }} />
            ))}
          </div>
        )}
        {texts.join("").trim() && (
          <div style={{
            fontSize: 13.5,
            lineHeight: 1.7,
            color: isUser ? "var(--navy-200)" : "var(--navy-50)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "var(--font-body)",
          }}>
            {texts.join("\n")}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Input box ── */
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
      style={{ background: "rgba(22,37,80,0.55)", border: "1px solid rgba(58,84,153,0.35)", borderRadius: 10, overflow: "hidden", backdropFilter: "blur(8px)" }}
      onDrop={e => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        Promise.all(Array.from(files).map(async f => {
          const isImg = IMAGE_TYPES.includes(f.type);
          return { id: `${Date.now()}-${Math.random()}`, name: f.name, kind: isImg ? "image" as const : "text" as const, data: await readAs(f, isImg ? "dataURL" : "text") };
        })).then(next => setAttachments(prev => [...prev, ...next]));
      }}
      onDragOver={e => e.preventDefault()}
      onFocus={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)")}
      onBlur={e => (e.currentTarget.style.borderColor = "rgba(58,84,153,0.35)")}
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
            fontSize: 14, color: "var(--navy-50)", lineHeight: 1.65, maxHeight: 160,
            fontFamily: "var(--font-body)", caretColor: "var(--gold-400)",
          }}
        />
      </div>

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "6px 10px 10px", gap: 6 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          style={{ width: 30, height: 30, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--navy-400)", transition: "all 0.15s" }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(58,84,153,0.2)"; el.style.color = "var(--navy-200)"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "var(--navy-400)"; }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
          </svg>
        </button>

        <span style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--navy-600)", fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}>
          A3 V2 · Groq · llama-3.3
        </span>

        <button
          onClick={onSend} disabled={!canSend}
          style={{
            width: 30, height: 30, borderRadius: 6, border: "none",
            cursor: canSend ? "pointer" : "not-allowed",
            background: canSend ? "var(--gold-500)" : "rgba(58,84,153,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", opacity: canSend ? 1 : 0.35,
          }}
          onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLElement).style.background = "var(--gold-400)"; }}
          onMouseLeave={e => { if (canSend) (e.currentTarget as HTMLElement).style.background = "var(--gold-500)"; }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={canSend ? "var(--navy-900)" : "var(--navy-400)"} strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Main page ── */
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
    const content = buildContent();
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput(""); setAttachments([]); setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--navy-800)", backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(58,84,153,0.12) 0%, transparent 55%)" }}>

      {/* ── Chat messages ── */}
      {hasStarted && (
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 0" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 28px", display: "flex", flexDirection: "column", gap: 28 }}>
            {messages.map((m, i) => <MessageBubble key={i} message={m} />)}

            {/* Loading dots */}
            {loading && (
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)", fontFamily: "var(--font-heading)", fontSize: 10, color: "var(--gold-400)", letterSpacing: "0.06em" }}>A3</div>
                <div style={{ display: "flex", gap: 5, alignItems: "center", paddingTop: 8 }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--navy-400)", display: "inline-block", animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* ── Home / greeting ── */}
      {!hasStarted && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px 56px" }}>

          {/* Decorative top rule */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, color: "var(--gold-700)" }}>
            <div style={{ height: 1, width: 40, background: "linear-gradient(90deg, transparent, var(--gold-700))" }} />
            <span style={{ fontSize: 10, letterSpacing: "0.4em", fontFamily: "var(--font-heading)" }}>◆</span>
            <div style={{ height: 1, width: 40, background: "linear-gradient(90deg, var(--gold-700), transparent)" }} />
          </div>

          {/* Greeting */}
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
            fontWeight: 300,
            fontStyle: "italic",
            color: "var(--navy-50)",
            letterSpacing: "-0.01em",
            lineHeight: 1,
            marginBottom: 8,
            textAlign: "center",
          }}>
            {greeting()}, Trixie Kaye
          </h1>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 9.5, letterSpacing: "0.28em", color: "var(--navy-400)", marginBottom: 40, textTransform: "uppercase" }}>
            What shall we build today?
          </p>

          {/* Input */}
          <div style={{ width: "100%", maxWidth: 640 }}>
            <InputBox input={input} setInput={setInput} attachments={attachments} setAttachments={setAttachments} onSend={sendMessage} loading={loading} fileInputRef={fileInputRef} />

            {/* Quick actions */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
              {QUICK_ACTIONS.map(({ label, tag, badge }) => (
                <button
                  key={label}
                  onClick={() => setInput(tag)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "6px 16px", borderRadius: 20,
                    background: "transparent",
                    border: "1px solid rgba(58,84,153,0.35)",
                    color: "var(--navy-400)", fontSize: 12.5,
                    fontFamily: "var(--font-body)", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(201,168,76,0.4)"; el.style.color = "var(--gold-300)"; el.style.background = "rgba(201,168,76,0.06)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(58,84,153,0.35)"; el.style.color = "var(--navy-400)"; el.style.background = "transparent"; }}
                >
                  <span style={{ color: "var(--gold-500)", fontSize: 10 }}>{badge}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Chat input bar ── */}
      {hasStarted && (
        <div style={{ padding: "12px 28px 24px", flexShrink: 0 }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <InputBox input={input} setInput={setInput} attachments={attachments} setAttachments={setAttachments} onSend={sendMessage} loading={loading} fileInputRef={fileInputRef} />
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple accept={ACCEPTED} style={{ display: "none" }}
        onChange={e => { handleFiles(e.target.files); (e.target as HTMLInputElement).value = ""; }} />

      <style jsx>{`
        @keyframes dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.7); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
