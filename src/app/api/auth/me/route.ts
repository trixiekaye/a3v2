import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const session = verifySessionToken(token);
  if (!session)  return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  return NextResponse.json({ username: session.username, role: session.role });
}
