import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function GET() {
  const { data } = await db()
    .from("jira_configs")
    .select("base_url, email, updated_at")
    .maybeSingle();

  // Never return the api_token to the client
  return NextResponse.json(data ?? null);
}

export async function POST(request: Request) {
  const { baseUrl, email, apiToken } = await request.json();
  if (!baseUrl || !email || !apiToken) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const supabase = db();
  const { data: existing } = await supabase
    .from("jira_configs")
    .select("id")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("jira_configs")
      .update({ base_url: baseUrl, email, api_token: apiToken, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("jira_configs")
      .insert({ base_url: baseUrl, email, api_token: apiToken });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  await db().from("jira_configs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  return NextResponse.json({ success: true });
}
