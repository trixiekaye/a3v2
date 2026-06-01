import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const projectKey = request.nextUrl.searchParams.get("project");
  if (!projectKey) {
    // Return all distinct project keys
    const { data } = await db()
      .from("knowledge_files")
      .select("project_key")
      .order("project_key");
    const keys = [...new Set((data ?? []).map((r: { project_key: string }) => r.project_key))];
    return NextResponse.json(keys);
  }

  const { data, error } = await db()
    .from("knowledge_files")
    .select("id, project_key, name, size_bytes, created_at")
    .eq("project_key", projectKey.toUpperCase())
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const { project_key, name, content } = await request.json();
  if (!project_key || !name || !content) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const key = project_key.toUpperCase();
  const size_bytes = new TextEncoder().encode(content).length;
  const supabase = db();

  // Upsert by project_key + name (replace existing file with same name)
  const { data: existing } = await supabase
    .from("knowledge_files")
    .select("id")
    .eq("project_key", key)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("knowledge_files")
      .update({ content, size_bytes })
      .eq("id", existing.id);
    return NextResponse.json({ success: true, replaced: true });
  }

  const { error } = await supabase
    .from("knowledge_files")
    .insert({ project_key: key, name, content, size_bytes });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
