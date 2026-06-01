import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { A3_SYSTEM_PROMPT } from "@/lib/a3-prompt";
import { db } from "@/lib/supabase";

// ── Model catalogue ────────────────────────────────────────────────
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

/** Text cascade: tried in order until one succeeds */
const GEMINI_CASCADE = [
  { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro"  },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

/** Final text fallback when all Gemini models are exhausted */
const GROQ_TEXT   = { id: "llama-3.3-70b-versatile",                   label: "Groq · Llama 3.3"  };
/** Vision model (Groq) */
const GROQ_VISION = { id: "meta-llama/llama-4-scout-17b-16e-instruct",  label: "Groq · Vision"     };

// ── Helpers ────────────────────────────────────────────────────────
type ContentBlock = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type MessageContent = string | ContentBlock[];

function hasImages(messages: { role: string; content: MessageContent }[]): boolean {
  return messages.some(m => Array.isArray(m.content) && m.content.some(b => b.type === "image_url"));
}

function shouldFallback(status: number, body: string): boolean {
  return (
    status === 429 ||
    status === 404 ||
    body.includes("RESOURCE_EXHAUSTED") ||
    body.includes("NOT_FOUND") ||
    body.includes("quota") ||
    body.toUpperCase().includes("RATE_LIMIT")
  );
}

function isContextTooLong(status: number, body: string): boolean {
  return (
    status === 400 &&
    (body.includes("reduce the length") ||
     body.includes("context_length") ||
     body.includes("maximum context") ||
     body.includes("too long"))
  );
}

/** Keep only the most recent messages to fit within context limits */
function trimToLimit(messages: object[], limit: number): object[] {
  return messages.length > limit ? messages.slice(-limit) : messages;
}

function buildSystem(knowledgeBase?: string): string {
  if (!knowledgeBase) return A3_SYSTEM_PROMPT;
  return `${A3_SYSTEM_PROMPT}\n\n---\n\n## Project Knowledge Base\n\nThe following files are provided as reference. Use them to inform card generation — extract requirements, terminology, constraints, and context.\n\n${knowledgeBase}`;
}

// ── Gemini (one model attempt) ─────────────────────────────────────
async function tryGemini(
  modelId: string,
  messages: object[],
  systemContent: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const res = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 4096,
      messages: [{ role: "system", content: systemContent }, ...trimToLimit(messages, 40)],
    }),
  });

  const body = await res.text();
  if (shouldFallback(res.status, body)) throw new ExhaustedError(modelId);
  if (!res.ok) throw new Error(`Gemini ${modelId} error ${res.status}: ${body}`);

  return JSON.parse(body).choices[0].message.content as string;
}

// ── Groq (text + vision) ───────────────────────────────────────────
async function callGroq(
  modelId: string,
  messages: object[],
  systemContent: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const groq = new Groq({ apiKey });

  // Retry with progressively fewer messages if context window is exceeded
  for (const limit of [messages.length, 20, 10, 5]) {
    const trimmed = trimToLimit(messages, limit);
    try {
      const completion = await groq.chat.completions.create({
        model: modelId,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemContent },
          ...trimmed,
        ] as Parameters<typeof groq.chat.completions.create>[0]["messages"],
      });
      return completion.choices[0].message.content as string;
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; error?: { message?: string } };
      const status  = e?.status ?? 0;
      const body    = e?.error?.message ?? e?.message ?? "";
      if (isContextTooLong(status, body) && limit > 5) continue; // retry with fewer
      throw err;
    }
  }
  throw new Error("Conversation is too long. Please start a new chat.");
}

/** Sentinel error — not a real failure, just signals quota hit */
class ExhaustedError extends Error {
  constructor(public modelId: string) { super(`RESOURCE_EXHAUSTED: ${modelId}`); }
}

// ── Cascade ────────────────────────────────────────────────────────
async function callTextCascade(
  messages: object[],
  systemContent: string
): Promise<{ content: string; modelLabel: string }> {
  // Try each Gemini model in order
  for (const { id, label } of GEMINI_CASCADE) {
    try {
      const content = await tryGemini(id, messages, systemContent);
      return { content, modelLabel: label };
    } catch (err) {
      if (err instanceof ExhaustedError) {
        console.warn(`[a3] ${err.message} — trying next model`);
        continue; // try next
      }
      throw err; // real error, stop
    }
  }

  // All Gemini models exhausted → fall back to Groq text
  console.warn("[a3] All Gemini models exhausted — falling back to Groq Llama 3.3");
  const content = await callGroq(GROQ_TEXT.id, messages, systemContent);
  return { content, modelLabel: GROQ_TEXT.label };
}

// ── Knowledge Base ─────────────────────────────────────────────────
async function loadKnowledgeBase(projectKey?: string): Promise<string> {
  if (!projectKey?.trim()) return "";
  const { data } = await db()
    .from("knowledge_files")
    .select("name, content")
    .eq("project_key", projectKey.trim().toUpperCase());
  if (!data?.length) return "";
  return data
    .map((f: { name: string; content: string }) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n---\n\n");
}

// ── Route ──────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { messages, projectKey } = await request.json();
    const knowledgeBase  = await loadKnowledgeBase(projectKey);
    const systemContent  = buildSystem(knowledgeBase || undefined);

    let content: string;
    let modelLabel: string;

    if (hasImages(messages)) {
      content    = await callGroq(GROQ_VISION.id, messages, systemContent);
      modelLabel = GROQ_VISION.label;
    } else {
      ({ content, modelLabel } = await callTextCascade(messages, systemContent));
    }

    return NextResponse.json({ content, model: modelLabel });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
