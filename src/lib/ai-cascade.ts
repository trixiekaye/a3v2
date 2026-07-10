import Groq from "groq-sdk";
import { GEMINI_BASE_URL, GEMINI_CASCADE, GROQ_TEXT } from "@/lib/model-catalog";

// Re-export the catalogue so server code can import everything from one place
export { GEMINI_BASE_URL, GEMINI_CASCADE, GROQ_TEXT, GROQ_VISION, DEFAULT_MODEL_LABEL } from "@/lib/model-catalog";

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

/** Sentinel error — not a real failure, just signals quota hit */
class ExhaustedError extends Error {
  constructor(public modelId: string) {
    super(`RESOURCE_EXHAUSTED: ${modelId}`);
  }
}

// ── Gemini (one model attempt) ─────────────────────────────────────
async function tryGemini(
  modelId: string,
  messages: object[],
  systemContent: string,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const res = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelId,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: systemContent }, ...trimToLimit(messages, 40)],
    }),
  });

  const body = await res.text();
  if (shouldFallback(res.status, body)) throw new ExhaustedError(modelId);
  if (!res.ok) throw new Error(`Gemini ${modelId} error ${res.status}: ${body}`);

  return JSON.parse(body).choices[0].message.content as string;
}

// ── Groq (text + vision) ───────────────────────────────────────────
export async function callGroq(
  modelId: string,
  messages: object[],
  systemContent: string,
  maxTokens: number
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
        max_tokens: maxTokens,
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
      if (isContextTooLong(status, body) && limit > 5) continue; // retry with fewer
      throw err;
    }
  }
  throw new Error("Conversation is too long. Please start a new chat.");
}

// ── Cascade ────────────────────────────────────────────────────────
/**
 * Try each Gemini model in order; on quota/availability failure fall
 * through to the next, ending at the Groq text fallback.
 */
export async function callTextCascade(
  messages: object[],
  systemContent: string,
  maxTokens: number = 4096
): Promise<{ content: string; modelLabel: string }> {
  for (const { id, label } of GEMINI_CASCADE) {
    try {
      const content = await tryGemini(id, messages, systemContent, maxTokens);
      return { content, modelLabel: label };
    } catch (err) {
      if (err instanceof ExhaustedError) {
        console.warn(`[cascade] ${err.message} — trying next model`);
        continue;
      }
      throw err;
    }
  }

  console.warn(`[cascade] All Gemini models exhausted — falling back to ${GROQ_TEXT.label}`);
  const content = await callGroq(GROQ_TEXT.id, messages, systemContent, maxTokens);
  return { content, modelLabel: GROQ_TEXT.label };
}
