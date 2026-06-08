import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const projectKey = request.nextUrl.searchParams.get("project");

  if (!projectKey) {
    // Return all files with metadata (no content) — used by the table view
    const { data, error } = await db()
      .from("knowledge_files")
      .select("id, project_key, name, size_bytes, created_at, category")
      .order("project_key", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(
      (data ?? []).map(f => ({ ...f, category: f.category ?? "knowledge" }))
    );
  }

  // Return files for a specific project (chat and collection page use this)
  const { data, error } = await db()
    .from("knowledge_files")
    .select("id, project_key, name, size_bytes, created_at, category")
    .eq("project_key", projectKey.toUpperCase())
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    (data ?? []).map(f => ({ ...f, category: f.category ?? "knowledge" }))
  );
}

export async function POST(request: NextRequest) {
  const { project_key, name, content, category = "knowledge" } = await request.json();
  if (!project_key || !name || !content) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const key = project_key.toUpperCase();
  const cat = category === "sow" ? "sow" : "knowledge";
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
      .update({ content, size_bytes, category: cat })
      .eq("id", existing.id);
    return NextResponse.json({ success: true, replaced: true });
  }

  const { error } = await supabase
    .from("knowledge_files")
    .insert({ project_key: key, name, content, size_bytes, category: cat });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
