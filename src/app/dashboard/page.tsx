"use client";

import { useState, useRef, useEffect } from "react";

type TextBlock = { type: "text"; text: string };
type ImageBlock = { type: "image_url"; image_url: { url: string } };
type ContentBlock = TextBlock | ImageBlock;

type Message = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
};

type Attachment = {
  id: string;
  name: string;
  kind: "image" | "text";
  data: string;       // base64 data URL for images, raw text for text files
  mimeType: string;
};

const ACCEPTED = ".png,.jpg,.jpeg,.webp,.gif,.txt,.md,.json,.csv,.js,.ts,.py,.xml,.yaml,.yml";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsText(file);
  });
}

function AttachmentChip({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888" }}
    >
      {att.kind === "image" ? (
        <img src={att.data} alt={att.name} className="w-5 h-5 rounded object-cover" />
      ) : (
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      <span className="max-w-[120px] truncate">{att.name}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 rounded hover:text-red-400 transition-colors"
        style={{ color: "#555" }}
      >
        ×
      </button>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const content = message.content;

  const textParts: string[] = [];
  const imageParts: string[] = [];

  if (typeof content === "string") {
    textParts.push(content);
  } else {
    content.forEach((block) => {
      if (block.type === "text") textParts.push(block.text);
      else if (block.type === "image_url") imageParts.push(block.image_url.url);
    });
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={{
          background: isUser ? "rgba(99,102,241,0.2)" : "#1e1e1e",
          color: isUser ? "#818cf8" : "#555",
          border: `1px solid ${isUser ? "rgba(99,102,241,0.3)" : "#2a2a2a"}`,
        }}
      >
        {isUser ? "U" : "A3"}
      </div>
      <div className="max-w-[75%] space-y-2">
        {imageParts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imageParts.map((src, i) => (
              <img
                key={i}
                src={src}
                alt="attachment"
                className="max-w-[200px] max-h-[160px] rounded-xl object-cover"
                style={{ border: "1px solid #2a2a2a" }}
              />
            ))}
          </div>
        )}
        {textParts.join("").trim() && (
          <div
            className="rounded-xl px-4 py-3 text-sm leading-relaxed"
            style={{
              background: isUser ? "rgba(99,102,241,0.12)" : "#111111",
              border: `1px solid ${isUser ? "rgba(99,102,241,0.2)" : "#1e1e1e"}`,
              color: "#ededed",
              whiteSpace: "pre-wrap",
            }}
          >
            {textParts.join("\n")}
          </div>
        )}
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: "A3 online. I will now translate your requirements into Jira work items.\n\nWhat feature, requirement, or problem would you like to turn into a Jira card today?",
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const newAtts: Attachment[] = [];
    for (const file of Array.from(files)) {
      const isImage = IMAGE_TYPES.includes(file.type);
      const data = isImage ? await readFileAsDataURL(file) : await readFileAsText(file);
      newAtts.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        kind: isImage ? "image" : "text",
        data,
        mimeType: file.type,
      });
    }
    setAttachments((prev) => [...prev, ...newAtts]);
  }

  function buildUserContent(): string | ContentBlock[] {
    const text = input.trim();
    if (attachments.length === 0) return text;

    const blocks: ContentBlock[] = [];

    // Images first
    attachments.forEach((att) => {
      if (att.kind === "image") {
        blocks.push({ type: "image_url", image_url: { url: att.data } });
      }
    });

    // Text files as text blocks
    attachments.forEach((att) => {
      if (att.kind === "text") {
        blocks.push({ type: "text", text: `[File: ${att.name}]\n${att.data}` });
      }
    });

    // User message text
    if (text) blocks.push({ type: "text", text });

    return blocks;
  }

  async function sendMessage() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading) return;

    const userContent = buildUserContent();
    const newMessages: Message[] = [...messages, { role: "user", content: userContent }];
    setMessages(newMessages);
    setInput("");
    setAttachments([]);
    setLoading(true);
    setApiKeyMissing(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("GROQ_API_KEY")) {
          setApiKeyMissing(true);
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: "⚠️ GROQ_API_KEY is not configured. Get a free key at console.groq.com and add it to your .env.local file.",
          }]);
        } else {
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: `Error: ${data.error || "Something went wrong."}`,
          }]);
        }
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  const canSend = (input.trim() || attachments.length > 0) && !loading;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <div>
          <h1 className="text-base font-semibold" style={{ color: "#ededed" }}>A3 Chat</h1>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>Translate requirements into Jira cards</p>
        </div>
        {apiKeyMissing && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            API key missing
          </span>
        )}
        {!apiKeyMissing && messages.length > 1 && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
            Active
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "#1e1e1e", color: "#555", border: "1px solid #2a2a2a" }}>
              A3
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full" style={{
                    background: "#555",
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 shrink-0" style={{ borderTop: "1px solid #1e1e1e" }}>
        <div
          className="rounded-xl"
          style={{ background: "#111111", border: "1px solid #2a2a2a" }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-3">
              {attachments.map((att) => (
                <AttachmentChip
                  key={att.id}
                  att={att}
                  onRemove={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                />
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 px-3 py-3">
            {/* Upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all mb-0.5"
              style={{ color: "#555", background: "transparent" }}
              title="Attach file or image"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#1e1e1e";
                (e.currentTarget as HTMLElement).style.color = "#888";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#555";
              }}
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe a feature, bug, or requirement… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
              style={{ color: "#ededed", maxHeight: "160px" }}
            />

            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={!canSend}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 mb-0.5"
              style={{ background: "#6366f1" }}
              onMouseEnter={(e) => canSend && ((e.currentTarget as HTMLElement).style.background = "#818cf8")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#6366f1")}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>

        <p className="text-xs mt-2 text-center" style={{ color: "#444" }}>
          Supports images & text files · A3 enforces the 16-hour gate
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => ((e.target as HTMLInputElement).value = "")}
      />

      <style jsx>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
