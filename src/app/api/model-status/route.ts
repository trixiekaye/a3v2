import { NextResponse } from "next/server";
import { GEMINI_BASE_URL, GEMINI_CASCADE, GROQ_TEXT } from "@/lib/ai-cascade";

export const runtime     = "nodejs";
export const maxDuration = 20;

type Status = "ok" | "quota" | "error";

/**
 * Probe a single Gemini model with a 1-token request to check quota.
 * Returns "ok" if the model responds, "quota" if exhausted (429), "error" otherwise.
 * Only called when the user explicitly clicks refresh — never automatically.
 */
async function probeGemini(modelId: string): Promise<Status> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "error";

  try {
    const res = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
      // Short timeout so the status check is snappy
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 429) return "quota";

    const bodyText = await res.text();
    if (
      bodyText.includes("RESOURCE_EXHAUSTED") ||
      bodyText.includes("quota") ||
      bodyText.toUpperCase().includes("RATE_LIMIT")
    ) {
      return "quota";
    }

    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

export async function GET() {
  // Probe every Gemini cascade model in parallel
  const statuses = await Promise.all(GEMINI_CASCADE.map(m => probeGemini(m.id)));

  const models: Record<string, Status> = { groq: "ok" };
  GEMINI_CASCADE.forEach((m, i) => { models[m.id] = statuses[i]; });

  // Determine the best available model (first ok in cascade order, else Groq)
  const firstOk = GEMINI_CASCADE.find((_, i) => statuses[i] === "ok");

  return NextResponse.json({
    models,
    active:      firstOk?.id    ?? "groq",
    activeLabel: firstOk?.label ?? GROQ_TEXT.label,
    fallback:    !firstOk,
  });
}
