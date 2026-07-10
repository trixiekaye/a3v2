import { NextResponse } from "next/server";
import { REQUIREMENTS_SYSTEM_PROMPT } from "@/lib/requirements-prompt";
import { db } from "@/lib/supabase";
import { callTextCascade } from "@/lib/ai-cascade";

// ── Knowledge + SOW + prompt loader ────────────────────────────────
type ProjectContext = { instructions: string; documents: string };

async function loadProjectContext(projectKey: string): Promise<ProjectContext> {
  if (!projectKey.trim()) return { instructions: "", documents: "" };

  const { data } = await db()
    .from("knowledge_files")
    .select("name, content, category")
    .eq("project_key", projectKey.trim().toUpperCase());

  if (!data?.length) return { instructions: "", documents: "" };

  const prompts   = data.filter(f => f.category === "prompt");
  const sow       = data.filter(f => f.category === "sow");
  const knowledge = data.filter(f => (f.category ?? "knowledge") === "knowledge");

  // Prompt files are instructions, not reference material — no code fences
  const instructions = prompts
    .map((f: { name: string; content: string }) => `<!-- ${f.name} -->\n${f.content}`)
    .join("\n\n---\n\n");

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

  return { instructions, documents: sections.join("\n\n---\n\n") };
}

function buildSystem({ instructions, documents }: ProjectContext): string {
  let system = REQUIREMENTS_SYSTEM_PROMPT;
  if (instructions) {
    system += `\n\n---\n\n## Project-Specific Instructions\n\nThe project owner uploaded these instructions. Follow them — where they conflict with the general guidance above, these take precedence.\n\n${instructions}`;
  }
  if (documents) {
    system += `\n\n---\n\n## Provided Project Documents\n\nThe following documents are available. Use them as the primary source for requirements extraction.\n\n${documents}`;
  }
  return system;
}

// ── Route ──────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { messages, projectKey } = await request.json();

    const systemContent = buildSystem(await loadProjectContext(projectKey ?? ""));

    // Larger output budget than the card chat — requirements docs run long
    const { content, modelLabel } = await callTextCascade(messages, systemContent, 8192);

    return NextResponse.json({ content, model: modelLabel });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
