import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";
import { listUsers, deleteUser } from "@/lib/users";

function adminOnly(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;
  return session?.role === "admin" ? session : null;
}

export async function GET(request: NextRequest) {
  if (!adminOnly(request)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return NextResponse.json(await listUsers());
}

export async function DELETE(request: NextRequest) {
  if (!adminOnly(request)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const { username } = await request.json();
  const result = await deleteUser(username);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
