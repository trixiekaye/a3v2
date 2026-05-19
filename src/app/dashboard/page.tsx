"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
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
      <div
        className="max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed"
        style={{
          background: isUser ? "rgba(99,102,241,0.12)" : "#111111",
          border: `1px solid ${isUser ? "rgba(99,102,241,0.2)" : "#1e1e1e"}`,
          color: "#ededed",
          whiteSpace: "pre-wrap",
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "A3 online. I will now translate your requirements into Jira work items.\n\nWhat feature, requirement, or problem would you like to turn into a Jira card today?",
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
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
        if (data.error?.includes("GROQ_API_KEY")) {
          setApiKeyMissing(true);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "⚠️ GROQ_API_KEY is not configured. Get a free key at console.groq.com and add it to your .env.local file.",
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${data.error || "Something went wrong."}` },
          ]);
        }
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
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

  function handleInput() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

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
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "#1e1e1e", color: "#555", border: "1px solid #2a2a2a" }}
            >
              A3
            </div>
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: "#111111", border: "1px solid #1e1e1e" }}
            >
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#555",
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
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
          className="flex items-end gap-3 rounded-xl px-4 py-3"
          style={{ background: "#111111", border: "1px solid #2a2a2a" }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); handleInput(); }}
            onKeyDown={handleKeyDown}
            placeholder="Describe a feature, bug, or requirement… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
            style={{ color: "#ededed", maxHeight: "160px" }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: "#6366f1" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#818cf8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#6366f1")}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "#444" }}>
          A3 follows the Agile Artifact Architect protocol — 16-hour gate enforced
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
