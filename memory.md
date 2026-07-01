# A3 V2 — Project Memory

> Self-contained context document for any AI assistant picking up this project cold.
> Reflects the current state of the codebase and the decisions behind it.

---

## Project Overview

**A3 V2 (Agile Artifact Architect)** is a private, single-user web application that acts as an AI-powered assistant for Agile product development. It has two distinct operational modes:

1. **Card Creator** — The main chat at `/dashboard`. The user describes features, bugs, or requirements in natural language; the AI drafts Jira-ready cards (Stories, Tasks, Bugs, Epics) using strict templates, then pushes them directly to Jira via the Atlassian REST API.
2. **Requirements Analyst** — A per-project workspace at `/dashboard/knowledge/[projectKey]`. The user uploads a State of Work (SOW) document and supporting knowledge files; the AI generates structured Functional Requirements, Non-Functional Requirements, Use Cases, and Acceptance Criteria from those documents, all numbered and formatted to a professional standard.

The app is built and used solely by **Trixie Kaye** (handle: TK, role: Admin). There is no multi-tenancy, public registration, or external user base. It is deployed to Vercel and backed by Supabase.

**Tech stack:**
- Next.js 16.2.6 (App Router, TypeScript, React 19, Turbopack)
- Supabase (PostgreSQL + `@supabase/supabase-js` v2) — all DB access is server-side via service role key
- AI: Google Gemini via the OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/`) + Groq SDK as fallback
- `pdf-parse` v2 for server-side PDF text extraction
- `groq-sdk` v1 for Groq API calls
- Styling: pure inline React styles + CSS variables (no Tailwind utility classes used in components, though Tailwind is installed)
- Fonts: Cormorant Garamond (display), Cinzel (headings), Jost (body) loaded via Next.js font system

---

## Current State

### Architecture

```
src/
  app/
    layout.tsx               # Root layout — loads fonts, applies global CSS
    page.tsx                 # Redirect → /dashboard
    login/page.tsx           # Login form
    globals.css              # TKP design system CSS variables + reset
    dashboard/
      layout.tsx             # Wraps all dashboard pages with <Sidebar> + <ModelStatusProvider>
      page.tsx               # Card Creator — main AI chat with Jira push
      history/page.tsx       # Card creation history from Supabase
      knowledge/
        page.tsx             # Knowledge Base overview table (all projects)
        [projectKey]/
          page.tsx           # Project collection — file manager + Requirements chat
      connect/page.tsx       # Jira credentials form
      settings/page.tsx      # User/app settings
    api/
      auth/                  # login, logout, me, register, users
      chat/route.ts          # Card Creator AI endpoint (uses A3_SYSTEM_PROMPT)
      jira/create/route.ts   # Jira issue creation — converts markdown to ADF
      config/jira/route.ts   # Read/write Jira credentials from Supabase
      history/route.ts       # Card history CRUD
      knowledge/
        route.ts             # knowledge_files CRUD (GET/POST)
        [id]/route.ts        # Single file DELETE
        parse-pdf/route.ts   # Server-side PDF text extraction
      model-status/route.ts  # Probes Gemini models for quota status
      projects/route.ts      # projects table — display name CRUD
      requirements/
        chat/route.ts        # Requirements Analyst AI endpoint (uses REQUIREMENTS_SYSTEM_PROMPT)
        history/[projectKey]/route.ts  # requirements_chats CRUD (GET/PUT/DELETE)
  components/
    Sidebar.tsx              # Navigation + Mode indicator + AI Engine status panel
  context/
    ModelStatusContext.tsx   # React context — tracks active AI model across pages
  lib/
    a3-prompt.ts             # System prompt for Card Creator mode
    requirements-prompt.ts   # System prompt for Requirements Analyst mode
    auth.ts                  # HMAC session token creation/verification
    supabase.ts              # Supabase client + DB types
    users.ts                 # User lookup helpers
```

### What's built and working

- **Card Creator chat** — full conversation with AI, file/image attachments, quick-action chips (Story/Task/Bug/Epic), Copy Card button, Push to Jira panel (inline form that creates the Jira issue via API)
- **Knowledge Base table** — groups knowledge files by project key; clicking a row opens the project collection page; inline display name editing per row
- **Project Collection page** — left panel (Knowledge Files + SOW Documents sections with upload/delete), right panel (Requirements chat with 4 quick-action chips: Generate FRs/NFRs/Use Cases/Acceptance Criteria); Copy + Push to Jira buttons on AI responses containing requirements content
- **SOW upload** — accepts PDF (server-side text extraction) and text files; if PDF text extraction fails, a paste fallback modal appears
- **Display names** — projects have a human-readable display name (e.g., "Payments API") separate from the project key (e.g., "PR49"); stored in `projects` table; editable inline in the KB table and shown in the project collection header
- **Chat history persistence** — requirements chat history is saved to Supabase `requirements_chats` table per project and reloaded on return visits
- **Jira integration** — card description is converted from markdown to Atlassian Document Format (ADF) and wrapped in a "note" panel; credentials stored server-side in Supabase
- **Mode indicator** — sidebar shows "Card Creator" (gold ◈) when at `/dashboard` or "Requirements Analyst" (blue ◉) when at `/dashboard/knowledge/[key]`; updates automatically on navigation
- **AI Engine status panel** — sidebar shows current active model (green = Gemini, amber + FALLBACK badge = Groq), per-model quota dots, ↻ refresh button with last-checked timestamp
- **Authentication** — custom cookie-based session with HMAC-signed tokens; login/logout/me endpoints; middleware protects all `/dashboard/*` routes

### What's incomplete or not yet built

- **Settings page** — the route exists but content is minimal/placeholder
- **History page** — shows card history from Supabase; basic table, no search/filter
- **Multi-user** — auth system supports multiple users (users table, roles) but the UI is single-user; no user management UI exists

---

## Key Decisions

### AI model cascade
Both Gemini models are tried in order (gemini-2.5-pro → gemini-2.0-flash). On any 429, 404, RESOURCE_EXHAUSTED, or quota signal, the route immediately falls through to the next. After both Gemini models fail, Groq `llama-3.3-70b-versatile` is the final fallback. This is implemented in both `/api/chat/route.ts` (Card Creator) and `/api/requirements/chat/route.ts` (Requirements Analyst) using an identical cascade pattern.

**Vision messages** (images attached by the user) bypass the cascade entirely and go directly to Groq `meta-llama/llama-4-scout-17b-16e-instruct` because Gemini's vision support via the OpenAI-compatible endpoint is unreliable.

### Gemini via OpenAI-compatible endpoint
Gemini is called at `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` using the standard OpenAI request shape. This avoids importing the Google Generative AI SDK and allows the same cascade logic to apply to both providers.

### No auto-probe for model status
The `/api/model-status` endpoint probes Gemini with a 1-token request to check quota. This endpoint is **only called when the user explicitly clicks ↻** in the sidebar — never on page load. The reason: `gemini-2.5-pro` free tier has ~25 requests/day. Auto-probing on every new browser session was silently consuming those requests before any chat happened, causing persistent "quota exhausted" state that appeared to never reset. The check result is cached in `sessionStorage` for 24 hours.

### knowledge_files category column
A single `knowledge_files` table stores both regular knowledge files and SOW (State of Work) documents, distinguished by a `category` column (`"knowledge"` | `"sow"`, default `"knowledge"`). SOW files are surfaced first in the requirements chat context. This was chosen over a separate table to keep queries simple and the file deletion/listing logic unified.

### projects table for display names
Project display names are stored in a separate `projects` table (`project_key`, `display_name`) rather than added to `knowledge_files`. This decouples project metadata from file records — a project exists as a named entity even if it has no files.

### PDF parsing
PDF text extraction uses `require("pdf-parse")` (CommonJS dynamic require) inside the Node.js-runtime API route. The import must use `require("pdf-parse")` — not `require("pdf-parse/lib/pdf-parse.js")` — to avoid a Vercel build warning about unresolved modules. If extraction returns empty text (scanned/image PDF), the API returns HTTP 422 and the UI shows a paste fallback modal.

### Jira description format
Card descriptions are converted from markdown to Atlassian Document Format (ADF) server-side and wrapped in a "note" (purple info panel). The markdown-to-ADF converter handles h1/h2, bullet lists, ordered lists, checkbox items, and paragraphs. Bold markers (`**`) are stripped. The A3 boilerplate footer (Rationale section, "Ready to create in Jira?" prompts) is stripped before conversion.

### Authentication
Custom HMAC-signed session tokens (not JWT, not NextAuth). Tokens are stored as an HTTP-only cookie (`a3_session`). The Edge middleware uses a lightweight payload parse (no HMAC verify) for speed; full HMAC verification happens in Node.js API routes. The `SESSION_SECRET` env var must be set in production.

### Inline styles, no Tailwind utilities
All component styling uses React inline styles with CSS variables from the TKP design system. Tailwind is installed but not used in component files. This keeps the design system self-contained and portable.

### Next.js 16 async params
Dynamic route params in Next.js 16 App Router are Promises. Server components use `await params.projectKey`; client components use `useParams()` from `next/navigation`. Type signature: `type Params = { params: Promise<{ projectKey: string }> }`.

### Vercel deployment — GitHub auto-deploy is broken
The Vercel project was originally created via CLI without connecting to the GitHub repository. GitHub pushes do **not** trigger deployments. Every production deploy must be done manually with `npx vercel --prod --yes` from the project directory. Long-term fix: go to Vercel Dashboard → Project Settings → Git → Connect `trixiekaye/a3v2` → Production Branch: `main`.

---

## Environment & Setup

### Local development
```bash
cd "/Users/trixie/Desktop/CLAUDE/A3 V2/a3v2"
npm run dev   # starts on http://localhost:3000
```
Note: the directory name contains a space ("A3 V2"). Any tool that runs `npm` via `process.cwd()` may fail with `EPERM: uv_cwd` — use absolute paths or `npx next dev` with an explicit `--cwd` argument.

### Production deployment
```bash
cd "/Users/trixie/Desktop/CLAUDE/A3 V2/a3v2"
npx vercel --prod --yes
```
Production URL: `https://a3v2.vercel.app`

### Required environment variables
These must be set in `.env.local` (local) and Vercel project settings (production). **Never hardcode or log these.**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (safe to expose) |
| `SUPABASE_SECRET_KEY` | Supabase service role key — server-side only, bypasses RLS |
| `GEMINI_API_KEY` | Google AI Studio API key for Gemini |
| `GROQ_API_KEY` | Groq API key for Llama fallback |
| `SESSION_SECRET` | Secret for HMAC session token signing |

### External services
- **Supabase** — PostgreSQL database for all persistence
- **Google AI Studio** — Gemini models via OpenAI-compatible endpoint (free tier: ~25 RPD for gemini-2.5-pro)
- **Groq** — Llama 3.3 70B text + Llama 4 Scout vision (fallback and vision-only)
- **Atlassian Jira** — configured per-user via the Connect page; credentials stored in `jira_configs` table

### Supabase tables
| Table | Columns | Purpose |
|---|---|---|
| `users` | id, username, password_hash, salt, role, created_at | Authentication |
| `knowledge_files` | id, project_key, name, content, size_bytes, created_at, category | All uploaded files |
| `jira_configs` | base_url, email, api_token, updated_at | Jira credentials (single row) |
| `card_history` | id, type, summary, project_key, jira_key, created_at | Created card log |
| `projects` | id, project_key, display_name, updated_at | Project display names |
| `requirements_chats` | id, project_key, messages (JSONB), updated_at | Requirements chat history per project |

### Git / branch strategy
- `feature/*` → `develop` → `main`
- GitHub repo: `trixiekaye/a3v2`
- Vercel deploys from `main` via CLI, not GitHub webhooks

---

## Open Items

1. **Gemini quota is currently exhausted** — both `gemini-2.5-pro` and `gemini-2.0-flash` return 429 (quota resets daily at midnight Pacific; free tier is ~25 RPD for Pro). The app falls back to Groq Llama 3.3 for all text generation until quota resets. Use the ↻ refresh button in the sidebar to check current status after midnight.

2. **Vercel GitHub auto-deploy not connected** — every deploy requires manual `npx vercel --prod --yes`. Fix: Vercel Dashboard → Project Settings → Git → Connect GitHub repo.

3. **Settings page is a placeholder** — the route `/dashboard/settings` exists but has no real functionality implemented.

4. **No search or filter on History page** — card history is a flat table with no search, filter by type, or pagination.

5. **Jira description conversion is markdown-only** — the ADF converter handles common markdown but not tables, code blocks, or nested lists. Complex AI-generated content with those patterns may lose formatting in Jira.

---

## Notes for Continuation

**Design language**: The UI is called the "TKP Design System." It uses Navy (`--navy-*`), Gold (`--gold-*`), and Cream (`--ghost-bg: #f5f0ea`) as the three palette families. All type is set in Cormorant Garamond (display/italic headers), Cinzel (uppercase labels, section headers), or Jost (body text). Decorative glyphs used throughout: ◆ ◈ ◉ ✦ ◇. Never introduce Tailwind utility classes into component files — always use inline styles with CSS variables.

**Project key convention**: Project keys are always uppercase (e.g., "PR49", "APICORE"). The `knowledge_files` and `requirements_chats` tables store them uppercase. Always `.toUpperCase()` before any DB query.

**Chat message format differences**:
- Card Creator messages (`/dashboard/page.tsx`): `{ role, content }` where content is `string | ContentBlock[]` (supports images)
- Requirements chat messages (`knowledge/[projectKey]/page.tsx`): `{ id, role, content, model?, ts }` — local type with an ID and timestamp for rendering and persistence

**"Push to Jira" button behavior**:
- In Card Creator: appears on any AI message; shows the full Jira project key + issue type form
- In Requirements Analyst: appears only when the AI response contains structured requirements headers (`FR-`, `NFR-`, `AC-`, `UC-` or section headers like `## Functional Requirements`); the function detecting this is `hasRequirementsContent()` in the project collection page

**Terminology used**:
- "Card Creator" = the main `/dashboard` chat
- "Requirements Analyst" = the per-project chat at `/dashboard/knowledge/[projectKey]`
- "SOW" = State of Work document (uploaded as category `"sow"` in knowledge_files)
- "KB files" / "knowledge files" = category `"knowledge"` files
- "Project key" = short uppercase identifier (user-defined, e.g. "PR49")
- "Display name" = human-readable project name (e.g. "Payments API"), stored in `projects` table

**Supabase access pattern**: All DB calls use `db()` from `@/lib/supabase` which returns a service role client. This bypasses RLS. No anon key or client-side Supabase calls exist anywhere.

**Model label strings** (as returned by the cascade and stored in context):
- `"Gemini 2.5 Pro"` — gemini-2.5-pro
- `"Gemini 2.0 Flash"` — gemini-2.0-flash
- `"Groq · Llama 3.3"` — llama-3.3-70b-versatile
- `"Groq · Vision"` — meta-llama/llama-4-scout-17b-16e-instruct
