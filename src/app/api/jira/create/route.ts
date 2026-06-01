import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

/** Strip A3 boilerplate that should not appear in the Jira description */
function cleanDescription(raw: string): string {
  let text = raw;

  // Cut at the Rationale block (handles any amount of whitespace before ---)
  text = text.replace(/\n*-{3,}\s*\n+\**\s*Rationale\s*\**[\s\S]*/i, "");

  // Cut at "Please review this draft" (may appear on its own line)
  text = text.replace(/\n*Please review this draft[\s\S]*/i, "");

  // Cut at "Ready to create this in Jira?"
  text = text.replace(/\n*Ready to create this in Jira\?[\s\S]*/i, "");

  // Remove markdown code fence markers (keep content inside)
  text = text.replace(/^```[a-zA-Z0-9]*\s*$/gm, "");

  // Collapse 3+ blank lines into 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/** Convert a markdown string into an array of ADF block nodes */
function markdownToADFNodes(markdown: string): object[] {
  const nodes: object[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H2 heading
    if (/^##\s+/.test(line)) {
      nodes.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: line.replace(/^##\s+/, "").replace(/\*\*/g, "") }],
      });
      i++; continue;
    }

    // H1 heading
    if (/^#\s+/.test(line)) {
      nodes.push({
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: line.replace(/^#\s+/, "").replace(/\*\*/g, "") }],
      });
      i++; continue;
    }

    // Horizontal rule → skip
    if (/^---+$/.test(line.trim())) { i++; continue; }

    // Checkbox item (- [ ] or - [x])
    if (/^-\s+\[[ xX]\]/.test(line)) {
      nodes.push({
        type: "paragraph",
        content: [{ type: "text", text: line.replace(/^-\s+\[[ xX]\]\s*/, "☐ ").replace(/\*\*/g, "") }],
      });
      i++; continue;
    }

    // Unordered list block
    if (/^[-*]\s/.test(line)) {
      const items: object[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push({
          type: "listItem",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: lines[i].replace(/^[-*]\s/, "").replace(/\*\*/g, "") }],
          }],
        });
        i++;
      }
      nodes.push({ type: "bulletList", content: items });
      continue;
    }

    // Ordered list block
    if (/^\d+\.\s/.test(line)) {
      const items: object[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push({
          type: "listItem",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: lines[i].replace(/^\d+\.\s/, "").replace(/\*\*/g, "") }],
          }],
        });
        i++;
      }
      nodes.push({ type: "orderedList", content: items });
      continue;
    }

    // Non-empty paragraph
    if (line.trim()) {
      nodes.push({
        type: "paragraph",
        content: [{ type: "text", text: line.replace(/\*\*/g, "").replace(/\*/g, "") }],
      });
    }

    i++;
  }

  return nodes.length > 0
    ? nodes
    : [{ type: "paragraph", content: [{ type: "text", text: markdown }] }];
}

/** Wrap ADF content nodes in a purple "note" info panel */
function wrapInNotePanel(nodes: object[]) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "panel",
        attrs: { panelType: "note" },
        content: nodes,
      },
    ],
  };
}

export async function POST(request: Request) {
  try {
    const { projectKey, issueType, summary, description } = await request.json();

    if (!projectKey || !issueType || !summary) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Read Jira credentials from database — never exposed to the client
    const { data: config } = await db()
      .from("jira_configs")
      .select("base_url, email, api_token")
      .maybeSingle();

    if (!config) {
      return NextResponse.json(
        { error: "Jira not connected. Go to Jira Connect and save your credentials first." },
        { status: 400 }
      );
    }

    const cleaned   = cleanDescription(description || summary);
    const adfNodes  = markdownToADFNodes(cleaned);
    const adfDoc    = wrapInNotePanel(adfNodes);

    const cleanUrl  = config.base_url.replace(/\/+$/, "");
    const auth      = Buffer.from(`${config.email}:${config.api_token}`).toString("base64");

    const body = {
      fields: {
        project:     { key: projectKey.trim().toUpperCase() },
        summary:     summary.trim(),
        description: adfDoc,
        issuetype:   { name: issueType },
      },
    };

    const res = await fetch(`${cleanUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization:  `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept:         "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg =
        data.errorMessages?.[0] ||
        Object.values(data.errors || {}).join(", ") ||
        `Jira returned ${res.status}`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    return NextResponse.json({
      key: data.key,
      id:  data.id,
      url: `${cleanUrl}/browse/${data.key}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Server error — check your Jira credentials." },
      { status: 500 }
    );
  }
}
