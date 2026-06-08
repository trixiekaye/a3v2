import { NextResponse } from "next/server";

export const runtime    = "nodejs";
export const maxDuration = 20;

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

const GEMINI_MODELS = [
  { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro"   },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
] as const;

type ModelId = (typeof GEMINI_MODELS)[number]["id"];
type Status  = "ok" | "quota" | "error";

/**
 * Probe a single Gemini model with a 1-token request to check quota.
 * Returns "ok" if the model responds, "quota" if exhausted (429), "error" otherwise.
 */
async function probeGemini(modelId: ModelId): Promise<Status> {
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
  const apiKey = process.env.GEMINI_API_KEY;

  // Run both probes in parallel
  const [proStatus, flashStatus] = await Promise.all([
    apiKey ? probeGemini("gemini-2.5-pro")   : Promise.resolve<Status>("error"),
    apiKey ? probeGemini("gemini-2.0-flash") : Promise.resolve<Status>("error"),
  ]);

  const models: Record<string, Status> = {
    "gemini-2.5-pro":  proStatus,
    "gemini-2.0-flash": flashStatus,
    "groq":              "ok",
  };

  // Determine the best available model
  let active      = "groq";
  let activeLabel = "Groq · Llama 3.3";
  let fallback    = true;

  if (proStatus === "ok") {
    active      = "gemini-2.5-pro";
    activeLabel = "Gemini 2.5 Pro";
    fallback    = false;
  } else if (flashStatus === "ok") {
    active      = "gemini-2.0-flash";
    activeLabel = "Gemini 2.0 Flash";
    fallback    = false;
  }

  return NextResponse.json({ models, active, activeLabel, fallback });
}
