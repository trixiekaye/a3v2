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
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ background: "#2a2a2a", border: "1px solid #383838", color: "#999" }}>
      {att.kind === "image"
        ? <img src={att.data} alt={att.name} className="w-4 h-4 rounded object-cover" />
        : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      }
      <span className="max-w-[110px] truncate">{att.name}</span>
      <button onClick={onRemove} style={{ color: "#555" }} onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>×</button>
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
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5"
        style={{ background: isUser ? "#2d2d2d" : "transparent", color: isUser ? "#e2e2e2" : "#d97757", border: isUser ? "1px solid #383838" : "none", fontSize: isUser ? "11px" : "16px" }}>
        {isUser ? "U" : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <div className="max-w-[78%] space-y-2">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((src, i) => (
              <img key={i} src={src} alt="attachment" className="max-w-[200px] max-h-[160px] rounded-xl object-cover" style={{ border: "1px solid #333" }} />
            ))}
          </div>
        )}
        {texts.join("").trim() && (
          <div className="text-sm leading-relaxed" style={{ color: isUser ? "#ccc" : "#e2e2e2", whiteSpace: "pre-wrap" }}>
            {texts.join("\n")}
          </div>
        )}
      </div>
    </div>
  );
}

function InputBox({
  input, setInput, attachments, setAttachments,
  onSend, loading, fileInputRef,
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

  const canSend = (input.trim() || attachments.length > 0) && !loading;

  return (
    <div
      className="rounded-2xl transition-all"
      style={{ background: "#252525", border: "1px solid #333" }}
      onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      onDragOver={e => e.preventDefault()}
    >
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {attachments.map(att => (
            <AttachmentChip key={att.id} att={att} onRemove={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} />
          ))}
        </div>
      )}
      <div className="px-4 pt-3 pb-2">
        <textarea
          ref={taRef}
          value={input}
          onChange={e => { setInput(e.target.value); resize(); }}
          onKeyDown={handleKeyDown}
          placeholder="Describe a feature, bug, or requirement…"
          rows={1}
          className="w-full resize-none bg-transparent text-sm outline-none leading-relaxed"
          style={{ color: "#e2e2e2", maxHeight: "160px", caretColor: "#d97757" }}
        />
      </div>
      <div className="flex items-center gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{ color: "#666", background: "transparent" }}
          title="Attach file or image"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#333"; (e.currentTarget as HTMLElement).style.color = "#aaa"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#666"; }}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs" style={{ color: "#555" }}>A3 V2 · Groq · llama-3.3</span>
        </div>

        <button
          onClick={onSend}
          disabled={!canSend}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-25"
          style={{ background: canSend ? "#d97757" : "#333", color: "#fff" }}
          onMouseEnter={e => canSend && ((e.currentTarget as HTMLElement).style.background = "#e8845f")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = canSend ? "#d97757" : "#333")}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
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
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
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
    setApiKeyMissing(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("GROQ_API_KEY")) setApiKeyMissing(true);
        setMessages(prev => [...prev, { role: "assistant", content: data.error?.includes("GROQ_API_KEY") ? "⚠️ GROQ_API_KEY not configured. Add it to .env.local." : `Error: ${data.error || "Something went wrong."}` }]);
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
    <div className="flex flex-col h-full">
      {/* Chat history */}
      {hasStarted && (
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-7 max-w-3xl mx-auto w-full">
          {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 flex items-center justify-center shrink-0" style={{ color: "#d97757" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                  <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="flex gap-1 items-center pt-1.5">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#555", animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Home / greeting */}
      {!hasStarted && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          <div className="flex items-center gap-4 mb-10">
            <span style={{ color: "#d97757" }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="1" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "2.6rem", fontWeight: 300, color: "#e2e2e2", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {greeting()}, Admin
            </h1>
          </div>

          {/* Input */}
          <div className="w-full max-w-2xl">
            <InputBox
              input={input} setInput={setInput}
              attachments={attachments} setAttachments={setAttachments}
              onSend={sendMessage} loading={loading}
              fileInputRef={fileInputRef}
            />

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => setInput(a.tag)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm transition-all"
                  style={{ background: "transparent", border: "1px solid #333", color: "#888" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#555"; (e.currentTarget as HTMLElement).style.color = "#ccc"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#333"; (e.currentTarget as HTMLElement).style.color = "#888"; }}
                >
                  <span style={{ color: "#d97757", fontSize: "12px" }}>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input bar (while chatting) */}
      {hasStarted && (
        <div className="px-6 py-4 shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            {apiKeyMissing && (
              <p className="text-xs mb-2 text-center" style={{ color: "#ef4444" }}>GROQ_API_KEY not configured</p>
            )}
            <InputBox
              input={input} setInput={setInput}
              attachments={attachments} setAttachments={setAttachments}
              onSend={sendMessage} loading={loading}
              fileInputRef={fileInputRef}
            />
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={e => {
          const files = e.target.files;
          if (!files) return;
          const next: Attachment[] = [];
          const promises = Array.from(files).map(async f => {
            const isImg = IMAGE_TYPES.includes(f.type);
            next.push({ id: `${Date.now()}-${Math.random()}`, name: f.name, kind: isImg ? "image" : "text", data: await readAs(f, isImg ? "dataURL" : "text") });
          });
          Promise.all(promises).then(() => setAttachments(prev => [...prev, ...next]));
        }}
        onClick={e => ((e.target as HTMLInputElement).value = "")}
      />

      <style jsx>{`
        @keyframes dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
