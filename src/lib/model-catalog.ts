// Client-safe model catalogue — no server-only imports.
// Single source of truth for model IDs and display labels.
// gemini-2.5-pro is paid-only and the 2.5 Flash models were retired from
// the chat endpoint (verified 404 as of Jul 2026) — the cascade runs on
// the Gemini 3.x Flash generation with Groq as final fallback.

export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

export const GEMINI_CASCADE = [
  { id: "gemini-3.5-flash",      label: "Gemini 3.5 Flash"      },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
] as const;

export const GROQ_TEXT   = { id: "openai/gpt-oss-120b",                       label: "Groq · GPT-OSS 120B" } as const;
export const GROQ_VISION = { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Groq · Vision"       } as const;

export const DEFAULT_MODEL_LABEL: string = GEMINI_CASCADE[0].label;

/** Map a model id to its display label (falls back to the id itself) */
export function labelFor(modelId: string): string {
  const found = [...GEMINI_CASCADE, GROQ_TEXT, GROQ_VISION].find(m => m.id === modelId);
  return found?.label ?? modelId;
}
