"use client";

import { useState, useEffect } from "react";

type UserEntry = { username: string; role: "admin" | "user"; createdAt: string };

/* ── Shared style tokens ─────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(255,255,255,0.84) 44%)",
  border: "1px solid rgba(201,168,76,0.30)",
  borderLeft: "3px solid var(--gold-500)",
  borderRadius: 10,
  padding: "24px 28px",
};
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: 10,
  letterSpacing: "0.22em",
  color: "var(--gold-700)",
  textTransform: "uppercase" as const,
  fontWeight: 600,
  marginBottom: 20,
};
const label: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-body)",
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--ghost-secondary)",
  marginBottom: 7,
};
const inp: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.78)",
  border: "1px solid rgba(201,168,76,0.25)",
  borderRadius: 6,
  padding: "10px 13px",
  fontSize: 14,
  color: "var(--ghost-text)",
  outline: "none",
  fontFamily: "var(--font-body)",
  fontWeight: 500,
  transition: "border-color 0.15s, box-shadow 0.15s",
};
const goldBtn: React.CSSProperties = {
  padding: "9px 26px",
  background: "var(--gold-500)",
  color: "var(--navy-900)",
  border: "none",
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: "var(--font-heading)",
  letterSpacing: "0.12em",
  cursor: "pointer",
  transition: "background 0.15s",
};
const divider: React.CSSProperties = {
  borderBottom: "1px solid rgba(201,168,76,0.14)",
};

function focusGold(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "var(--gold-500)";
  (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(201,168,76,0.14)";
}
function blurGold(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = "rgba(201,168,76,0.25)";
  (e.target as HTMLElement).style.boxShadow = "none";
}
function hoverGold(e: React.MouseEvent<HTMLButtonElement>) {
  (e.currentTarget as HTMLElement).style.background = "var(--gold-400)";
}
function unhoverGold(e: React.MouseEvent<HTMLButtonElement>) {
  (e.currentTarget as HTMLElement).style.background = "var(--gold-500)";
}

/* ── Alert banners ───────────────────────────────────────────────── */
function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 500, color: "#b83030", background: "rgba(200,80,80,0.08)", border: "1px solid rgba(200,80,80,0.22)", borderRadius: 6, padding: "9px 13px", fontFamily: "var(--font-body)" }}>
      {msg}
    </div>
  );
}
function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--gold-700)", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.28)", borderRadius: 6, padding: "9px 13px", fontFamily: "var(--font-body)" }}>
      {msg}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);

  // Password
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "success" | "error">("idle");
  const [pwError, setPwError]   = useState("");

  // User management
  const [users, setUsers]             = useState<UserEntry[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole]         = useState<"user" | "admin">("user");
  const [regStatus, setRegStatus]     = useState<"idle" | "success" | "error">("idle");
  const [regError, setRegError]       = useState("");
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.username) setCurrentUser(d); });
  }, []);

  useEffect(() => { if (currentUser?.role === "admin") fetchUsers(); }, [currentUser]);

  async function fetchUsers() {
    const r = await fetch("/api/auth/users");
    if (r.ok) setUsers(await r.json());
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault(); setPwStatus("idle"); setPwError("");
    if (next.length < 6) { setPwStatus("error"); setPwError("New password must be at least 6 characters."); return; }
    if (next !== confirm) { setPwStatus("error"); setPwError("Passwords do not match."); return; }
    setPwStatus("success"); setCurrent(""); setNext(""); setConfirm("");
    setTimeout(() => setPwStatus("idle"), 3000);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setRegStatus("idle"); setRegError("");
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
    });
    const d = await r.json();
    if (!r.ok) { setRegStatus("error"); setRegError(d.error || "Registration failed."); return; }
    setRegStatus("success");
    setNewUsername(""); setNewPassword(""); setNewRole("user");
    fetchUsers();
    setTimeout(() => setRegStatus("idle"), 3000);
  }

  async function handleDelete(username: string) {
    setDeletingUser(username);
    const r = await fetch("/api/auth/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (r.ok) fetchUsers();
    setDeletingUser(null);
  }

  const isAdmin = currentUser?.role === "admin";
  const initials = currentUser?.username?.slice(0, 2).toUpperCase() ?? "··";

  const aboutRows = [
    ["Version",         "A3 V2"],
    ["Protocol",        "Agile Artifact Architect"],
    ["16-hour gate",    "Enabled"],
    ["Jira integration","Atlassian API"],
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "40px 44px", maxWidth: 1120 }}>

      {/* ── Page header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ color: "var(--gold-500)", fontSize: 11 }}>◆</span>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: "var(--gold-500)", letterSpacing: "0.14em" }}>Settings</h1>
        </div>
        <div style={{ height: 1, width: 88, background: "linear-gradient(90deg, var(--gold-500), rgba(201,168,76,0.15), transparent)" }} />
        <p style={{ fontSize: 13.5, color: "var(--ghost-secondary)", marginTop: 10, fontFamily: "var(--font-body)", fontWeight: 500 }}>
          Manage your account and preferences
        </p>
      </div>

      {/* ── Two-column grid ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* LEFT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Profile card */}
          <div style={card}>
            <p style={eyebrow}>◈ Profile</p>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {/* Avatar */}
              <div style={{
                width: 58, height: 58, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, rgba(201,168,76,0.22) 0%, rgba(201,168,76,0.06) 100%)",
                border: "2px solid rgba(201,168,76,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--gold-500)",
                fontWeight: 700, letterSpacing: "0.08em",
                boxShadow: "0 2px 10px rgba(201,168,76,0.12)",
              }}>
                {initials}
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 700, color: "var(--ghost-text)", letterSpacing: "-0.01em" }}>
                  {currentUser?.username ?? "—"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                  <span style={{
                    fontFamily: "var(--font-heading)", fontSize: 9, letterSpacing: "0.2em",
                    color: "var(--gold-700)", textTransform: "uppercase", fontWeight: 700,
                    background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)",
                    padding: "3px 10px", borderRadius: 20,
                  }}>
                    {currentUser?.role ?? "—"}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf7d", display: "inline-block" }} />
                    Active session
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Change password */}
          <div style={card}>
            <p style={eyebrow}>◈ Change Password</p>
            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { lbl: "Current password",     val: current, set: setCurrent, ph: "••••••••" },
                { lbl: "New password",         val: next,    set: setNext,    ph: "Min. 6 characters" },
                { lbl: "Confirm new password", val: confirm, set: setConfirm, ph: "••••••••" },
              ].map(({ lbl, val, set, ph }) => (
                <div key={lbl}>
                  <label style={label}>{lbl}</label>
                  <input type="password" value={val} onChange={e => set(e.target.value)}
                    placeholder={ph} required style={inp} onFocus={focusGold} onBlur={blurGold} />
                </div>
              ))}
              {pwStatus === "error"   && <ErrorBanner msg={pwError} />}
              {pwStatus === "success" && <SuccessBanner msg="✓ Password updated successfully." />}
              <div style={{ paddingTop: 2 }}>
                <button type="submit" style={goldBtn} onMouseEnter={hoverGold} onMouseLeave={unhoverGold}>
                  UPDATE
                </button>
              </div>
            </form>
          </div>

          {/* About — non-admin only (left column bottom) */}
          {!isAdmin && (
            <div style={card}>
              <p style={eyebrow}>◈ About</p>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {aboutRows.map(([l, v], i) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", ...(i < aboutRows.length - 1 ? divider : {}) }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 500, color: "var(--ghost-secondary)" }}>{l}</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 600, color: "var(--gold-700)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {isAdmin ? (
            <>
              {/* Register user */}
              <div style={card}>
                <p style={eyebrow}>◈ Register User</p>
                <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={label}>Username</label>
                      <input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                        placeholder="e.g. jane" required style={inp} onFocus={focusGold} onBlur={blurGold} />
                    </div>
                    <div style={{ flex: "0 0 116px" }}>
                      <label style={label}>Role</label>
                      <select value={newRole} onChange={e => setNewRole(e.target.value as "user" | "admin")}
                        style={{ ...inp, cursor: "pointer" }} onFocus={focusGold} onBlur={blurGold}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={label}>Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters" required style={inp} onFocus={focusGold} onBlur={blurGold} />
                  </div>
                  {regStatus === "error"   && <ErrorBanner msg={regError} />}
                  {regStatus === "success" && <SuccessBanner msg="✓ User registered successfully." />}
                  <div style={{ paddingTop: 2 }}>
                    <button type="submit" style={goldBtn} onMouseEnter={hoverGold} onMouseLeave={unhoverGold}>
                      REGISTER
                    </button>
                  </div>
                </form>
              </div>

              {/* Active users */}
              <div style={{ ...card, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <p style={{ ...eyebrow, marginBottom: 0 }}>◈ Active Users</p>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--ghost-muted)" }}>
                    {users.length} {users.length === 1 ? "account" : "accounts"}
                  </span>
                </div>

                {users.length === 0 ? (
                  <p style={{ fontSize: 13.5, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", fontWeight: 500 }}>No users found.</p>
                ) : (
                  <div>
                    {users.map((u, i) => (
                      <div key={u.username} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 0",
                        ...(i < users.length - 1 ? divider : {}),
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                            background: "linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.04))",
                            border: "1.5px solid rgba(201,168,76,0.38)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "var(--font-heading)", fontSize: 11, color: "var(--gold-700)", fontWeight: 700,
                          }}>
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--ghost-text)", lineHeight: 1 }}>{u.username}</p>
                            <span style={{
                              display: "inline-block", marginTop: 5,
                              fontFamily: "var(--font-heading)", fontSize: 8, letterSpacing: "0.18em",
                              color: u.role === "admin" ? "var(--gold-700)" : "var(--ghost-secondary)",
                              textTransform: "uppercase", fontWeight: 700,
                              background: u.role === "admin" ? "rgba(201,168,76,0.12)" : "rgba(58,84,153,0.08)",
                              border: `1px solid ${u.role === "admin" ? "rgba(201,168,76,0.3)" : "rgba(58,84,153,0.2)"}`,
                              padding: "2px 8px", borderRadius: 20,
                            }}>
                              {u.role}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <span style={{ fontSize: 12, color: "var(--ghost-muted)", fontFamily: "var(--font-body)", fontWeight: 500 }}>
                            {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          {u.username !== "admin" && (
                            <button
                              onClick={() => handleDelete(u.username)}
                              disabled={deletingUser === u.username}
                              style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ghost-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", transition: "color 0.15s", padding: "0" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#b83030")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--ghost-muted)")}>
                              {deletingUser === u.username ? "Removing…" : "Remove"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Non-admin right column: empty or future widgets */
            <div />
          )}
        </div>

        {/* ── About — full width, admin only ────────────────────────── */}
        {isAdmin && (
          <div style={{ gridColumn: "1 / -1", ...card, padding: "22px 28px" }}>
            <p style={eyebrow}>◈ About</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
              {aboutRows.map(([l, v], i) => (
                <div key={l} style={{
                  padding: "14px 20px 14px 0",
                  borderRight: i < aboutRows.length - 1 ? "1px solid rgba(201,168,76,0.14)" : "none",
                  paddingLeft: i > 0 ? 20 : 0,
                }}>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "var(--ghost-muted)", marginBottom: 6 }}>{l}</p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700, color: "var(--gold-700)" }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
