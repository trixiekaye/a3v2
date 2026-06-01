import crypto from "crypto";

export const AUTH_COOKIE = "a3_session";

const SECRET = process.env.SESSION_SECRET ?? "a3v2-internal-secret-change-me";

// ── Token format: base64url(payload) + "." + base64url(hmac) ──────

export function createSessionToken(username: string, role: string): string {
  const payload = Buffer.from(JSON.stringify({ username, role, iat: Date.now() })).toString(
    "base64url"
  );
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Full verification — use in API routes (Node.js runtime only). */
export function verifySessionToken(token: string): { username: string; role: string } | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot < 1) return null;
    const payload = token.slice(0, dot);
    const sig     = token.slice(dot + 1);
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

/** Lightweight parse for the Edge middleware — only checks structure, no HMAC verify. */
export function parseSessionPayload(token: string): { username: string; role: string } | null {
  try {
    const payload = token.split(".")[0];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}
