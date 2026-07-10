import { NextResponse } from "next/server";
import { A3_SYSTEM_PROMPT } from "@/lib/a3-prompt";
import { db } from "@/lib/supabase";
import { callTextCascade, callGroq, GROQ_VISION } from "@/lib/ai-cascade";

// ── Helpers ────────────────────────────────────────────────────────
type ContentBlock = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type MessageContent = string | ContentBlock[];

function hasImages(messages: { role: string; content: MessageContent }[]): boolean {
  return messages.some(m => Array.isArray(m.content) && m.content.some(b => b.type === "image_url"));
}

function buildSystem(knowledgeBase?: string): string {
  if (!knowledgeBase) return A3_SYSTEM_PROMPT;
  return `${A3_SYSTEM_PROMPT}\n\n---\n\n## Project Knowledge Base\n\nThe following files are provided as reference. Use them to inform card generation — extract requirements, terminology, constraints, and context.\n\n${knowledgeBase}`;
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
      content    = await callGroq(GROQ_VISION.id, messages, systemContent, 4096);
      modelLabel = GROQ_VISION.label;
    } else {
      ({ content, modelLabel } = await callTextCascade(messages, systemContent, 4096));
    }

    return NextResponse.json({ content, model: modelLabel });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
