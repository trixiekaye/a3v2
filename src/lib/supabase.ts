import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;

/** Server-side only — uses service role key, bypasses RLS. Never expose to browser. */
export function db() {
  return createClient(URL, SECRET, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type DbUser = {
  id: string;
  username: string;
  password_hash: string;
  salt: string;
  role: "admin" | "user";
  created_at: string;
};

export type DbKnowledgeFile = {
  id: string;
  project_key: string;
  name: string;
  content: string;
  size_bytes: number;
  created_at: string;
};

export type DbJiraConfig = {
  base_url: string;
  email: string;
  api_token: string;
  updated_at: string;
};

export type DbCardHistory = {
  id: string;
  type: string;
  summary: string;
  project_key: string;
  jira_key: string | null;
  created_at: string;
};
