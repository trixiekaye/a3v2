import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Supabase keepalive — hit by Vercel Cron (see vercel.json) so the free-tier
 * project registers activity and never auto-pauses (pause threshold: 7 days idle).
 * Performs one trivial read; returns no data beyond a health flag.
 */
export async function GET(request: NextRequest) {
  // If CRON_SECRET is configured, only accept requests carrying it
  // (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically).
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await db()
    .from("projects")
    .select("project_key", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
