import { NextResponse } from "next/server";
import { REQUIREMENTS_SYSTEM_PROMPT } from "@/lib/requirements-prompt";
import { db } from "@/lib/supabase";
import { callTextCascade } from "@/lib/ai-cascade";

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

// ── Route ──────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { messages, projectKey } = await request.json();

    const projectContext = await loadProjectContext(projectKey ?? "");
    const systemContent  = buildSystem(projectContext);

    // Larger output budget than the card chat — requirements docs run long
    const { content, modelLabel } = await callTextCascade(messages, systemContent, 8192);

    return NextResponse.json({ content, model: modelLabel });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
