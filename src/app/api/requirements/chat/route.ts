import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { REQUIREMENTS_SYSTEM_PROMPT } from "@/lib/requirements-prompt";
import { db } from "@/lib/supabase";

// ── Model catalogue (same cascade as main chat) ────────────────────
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

const GEMINI_CASCADE = [
  { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro"  },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

const GROQ_TEXT = { id: "llama-3.3-70b-versatile", label: "Groq · Llama 3.3" };

// ── Helpers ────────────────────────────────────────────────────────
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

function trimToLimit(messages: object[], limit: number): object[] {
  return messages.length > limit ? messages.slice(-limit) : messages;
}

/** Sentinel — signals quota hit, not a real failure */
class ExhaustedError extends Error {
  constructor(public modelId: string) {
    super(`RESOURCE_EXHAUSTED: ${modelId}`);
  }
}

// ── Knowledge + SOW loader ─────────────────────────────────────────
async function loadProjectContext(projectKey: string): Promise<string> {
  if (!projectKey.trim()) return "";

  const { data } = await db()
    .from("knowledge_files")
    .select("name, content, category")
    .eq("project_key", projectKey.trim().toUpperCase());

  if (!data?.length) return "";

  const knowledge = data.filter(f => (f.category ?? "knowledge") === "knowledge");
  const sow       = data.filter(f => f.category === "sow");

  const sections: string[] = [];

  if (sow.length > 0) {
    sections.push("## State of Work Documents\n\n" +
      sow.map((f: { name: string; content: string }) =>
        `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``
      ).join("\n\n---\n\n")
    );
  }

  if (knowledge.length > 0) {
    sections.push("## Project Knowledge Base\n\n" +
      knowledge.map((f: { name: string; content: string }) =>
        `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``
      ).join("\n\n---\n\n")
    );
  }

  return sections.join("\n\n---\n\n");
}

function buildSystem(projectContext: string): string {
  if (!projectContext) return REQUIREMENTS_SYSTEM_PROMPT;
  return `${REQUIREMENTS_SYSTEM_PROMPT}\n\n---\n\n## Provided Project Documents\n\nThe following documents are available. Use them as the primary source for requirements extraction.\n\n${projectContext}`;
}

// ── Gemini ─────────────────────────────────────────────────────────
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
      max_tokens: 8192,
      messages: [{ role: "system", content: systemContent }, ...trimToLimit(messages, 40)],
    }),
  });

  const body = await res.text();
  if (shouldFallback(res.status, body)) throw new ExhaustedError(modelId);
  if (!res.ok) throw new Error(`Gemini ${modelId} error ${res.status}: ${body}`);

  return JSON.parse(body).choices[0].message.content as string;
}

// ── Groq ───────────────────────────────────────────────────────────
async function callGroq(
  messages: object[],
  systemContent: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const groq = new Groq({ apiKey });

  for (const limit of [messages.length, 20, 10, 5]) {
    const trimmed = trimToLimit(messages, limit);
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_TEXT.id,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemContent },
          ...trimmed,
        ] as Parameters<typeof groq.chat.completions.create>[0]["messages"],
      });
      return completion.choices[0].message.content as string;
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; error?: { message?: string } };
      const status = e?.status ?? 0;
      const body   = e?.error?.message ?? e?.message ?? "";
      if (isContextTooLong(status, body) && limit > 5) continue;
      throw err;
    }
  }
  throw new Error("Conversation is too long. Please start a new chat.");
}

// ── Cascade ────────────────────────────────────────────────────────
async function callCascade(
  messages: object[],
  systemContent: string
): Promise<{ content: string; modelLabel: string }> {
  for (const { id, label } of GEMINI_CASCADE) {
    try {
      const content = await tryGemini(id, messages, systemContent);
      return { content, modelLabel: label };
    } catch (err) {
      if (err instanceof ExhaustedError) {
        console.warn(`[req-chat] ${err.message} — trying next model`);
        continue;
      }
      throw err;
    }
  }

  console.warn("[req-chat] All Gemini models exhausted — falling back to Groq Llama 3.3");
  const content = await callGroq(messages, systemContent);
  return { content, modelLabel: GROQ_TEXT.label };
}

// ── Route ──────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { messages, projectKey } = await request.json();

    const projectContext = await loadProjectContext(projectKey ?? "");
    const systemContent  = buildSystem(projectContext);

    const { content, modelLabel } = await callCascade(messages, systemContent);

    return NextResponse.json({ content, model: modelLabel });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
