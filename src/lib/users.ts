import crypto from "crypto";
import { db, DbUser } from "./supabase";

export type UserRole = "admin" | "user";

function hash(password: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

/** Ensure an admin account exists — called on first login attempt. */
export async function seedAdmin(): Promise<void> {
  const supabase = db();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("username", "admin")
    .maybeSingle();

  if (!data) {
    const salt = crypto.randomBytes(16).toString("hex");
    const adminPass = process.env.ADMIN_PASSWORD ?? "password";
    await supabase.from("users").insert({
      username: "admin",
      password_hash: hash(adminPass, salt),
      salt,
      role: "admin",
    });
  }
}

export async function validateUser(
  username: string,
  password: string
): Promise<DbUser | null> {
  await seedAdmin();
  const supabase = db();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!data) return null;
  if (hash(password, data.salt) !== data.password_hash) return null;
  return data as DbUser;
}

export async function registerUser(
  username: string,
  password: string,
  role: UserRole = "user"
): Promise<{ success: boolean; error?: string }> {
  if (username.length < 3) return { success: false, error: "Username must be at least 3 characters." };
  if (password.length < 6) return { success: false, error: "Password must be at least 6 characters." };

  const supabase = db();
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (existing) return { success: false, error: "Username already exists." };

  const salt = crypto.randomBytes(16).toString("hex");
  const { error } = await supabase.from("users").insert({
    username: username.toLowerCase(),
    password_hash: hash(password, salt),
    salt,
    role,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteUser(
  username: string
): Promise<{ success: boolean; error?: string }> {
  if (username === "admin") return { success: false, error: "Cannot delete the admin account." };

  const supabase = db();
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("username", username.toLowerCase());

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function listUsers(): Promise<
  Pick<DbUser, "username" | "role" | "created_at">[]
> {
  await seedAdmin();
  const supabase = db();
  const { data } = await supabase
    .from("users")
    .select("username, role, created_at")
    .order("created_at", { ascending: true });

  return (data ?? []) as Pick<DbUser, "username" | "role" | "created_at">[];
}
