import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

type Params = { params: Promise<{ projectKey: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();

  const { data, error } = await db()
    .from("requirements_chats")
    .select("messages, updated_at")
    .eq("project_key", key)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    messages: data?.messages ?? [],
    updated_at: data?.updated_at ?? null,
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const { messages } = await request.json();

  const supabase = db();

  // Check if a chat record already exists for this project
  const { data: existing } = await supabase
    .from("requirements_chats")
    .select("id")
    .eq("project_key", key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("requirements_chats")
      .update({ messages, updated_at: new Date().toISOString() })
      .eq("project_key", key);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("requirements_chats")
      .insert({ project_key: key, messages });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();

  const { error } = await db()
    .from("requirements_chats")
    .delete()
    .eq("project_key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
