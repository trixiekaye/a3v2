import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await db()
    .from("card_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { type, summary, project_key, jira_key } = await request.json();
  if (!type || !summary || !project_key) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const { error } = await db()
    .from("card_history")
    .insert({ type, summary, project_key, jira_key: jira_key ?? null });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
