import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { A3_SYSTEM_PROMPT } from "@/lib/a3-prompt";
import { db } from "@/lib/supabase";

// Text messages → Gemini 2.5 Pro (OpenAI-compatible endpoint)
const GEMINI_MODEL      = "gemini-2.5-pro";
const GEMINI_BASE_URL   = "https://generativelanguage.googleapis.com/v1beta/openai";

// Vision/image messages → Groq Llama 4 Scout
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

type ContentBlock = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type MessageContent = string | ContentBlock[];

function hasImages(messages: { role: string; content: MessageContent }[]): boolean {
  return messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((b) => b.type === "image_url")
  );
}

async function callGemini(messages: object[], knowledgeBase?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const systemContent = knowledgeBase
    ? `${A3_SYSTEM_PROMPT}\n\n---\n\n## Project Knowledge Base\n\nThe following files have been provided as reference. Use them to inform card generation — extract requirements, terminology, constraints, and context from them.\n\n${knowledgeBase}`
    : A3_SYSTEM_PROMPT;

  const res = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}

async function callGroqVision(messages: object[], knowledgeBase?: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const groq = new Groq({ apiKey });
  const systemContent = knowledgeBase
    ? `${A3_SYSTEM_PROMPT}\n\n---\n\n## Project Knowledge Base\n\nThe following files have been provided as reference. Use them to inform card generation.\n\n${knowledgeBase}`
    : A3_SYSTEM_PROMPT;
  const completion = await groq.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemContent },
      ...messages,
    ] as Parameters<typeof groq.chat.completions.create>[0]["messages"],
  });

  return completion.choices[0].message.content as string;
}

async function loadKnowledgeBase(projectKey?: string): Promise<string> {
  if (!projectKey?.trim()) return "";
  const { data } = await db()
    .from("knowledge_files")
    .select("name, content")
    .eq("project_key", projectKey.trim().toUpperCase());
  if (!data?.length) return "";
  return data.map((f: { name: string; content: string }) =>
    `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``
  ).join("\n\n---\n\n");
}

export async function POST(request: Request) {
  try {
    const { messages, projectKey } = await request.json();
    const knowledgeBase = await loadKnowledgeBase(projectKey);
    const content = hasImages(messages)
      ? await callGroqVision(messages, knowledgeBase)
      : await callGemini(messages, knowledgeBase);

    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
