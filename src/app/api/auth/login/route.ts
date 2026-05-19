import { NextResponse } from "next/server";
import { isValidCredentials, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!isValidCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}
