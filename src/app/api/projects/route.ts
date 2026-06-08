import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

/** GET /api/projects — returns all projects with display names */
export async function GET() {
  const { data, error } = await db()
    .from("projects")
    .select("project_key, display_name, updated_at")
    .order("project_key", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/projects — upsert display name for a project key */
export async function POST(request: NextRequest) {
  const { project_key, display_name } = await request.json();

  if (!project_key?.trim()) {
    return NextResponse.json({ error: "project_key is required." }, { status: 400 });
  }

  const key  = project_key.trim().toUpperCase();
  const name = (display_name ?? "").trim();

  const supabase = db();

  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("project_key", key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("projects")
      .update({ display_name: name, updated_at: new Date().toISOString() })
      .eq("project_key", key);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("projects")
      .insert({ project_key: key, display_name: name });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
