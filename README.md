# BriefLi

BriefLi is a personal URL shortener. Anyone can browse the public feed of short links; signed-in users can additionally keep personalized (private) links. Deleted links go to a recoverable trash instead of being permanently removed, every redirect increments a click counter (atomically, via a Postgres RPC), and the create form can suggest memorable slugs using Gemini.

Short links look like `https://<your-domain>/<slug>` and are served by a Vercel rewrite (see `vercel.json`) that maps `/:slug` to a redirect function.

## Architecture

| Layer | Location | Notes |
|-------|----------|-------|
| SPA | repo root | Vite + React 19 (`App.tsx`, `components/`, `hooks/`, `services/`, `context/`), styled with Tailwind CSS |
| API | `api/` | Vercel serverless functions sharing a `withApi` wrapper (`api/_lib/`) that handles Clerk auth, validation errors, and JSON responses |
| Database | Supabase Postgres | Schema in `migration.sql` and `migration_v2.sql`, including the `increment_clicks` RPC used by the redirect function |
| Slug rules | `lib/slug.ts` | Shared rules: 3-50 characters, `[a-zA-Z0-9_-]`; when a slug is omitted on create, the server generates one |

The `/api/*` routes run as serverless functions; everything else serves the SPA.

## API surface

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/links` | GET | Public for the public feed and public trash; sign-in required for personalized links | List links (`?type=public\|personalized`, `?trash=true`) |
| `/api/links` | POST | Clerk session required | Create a link; slug is generated server-side when omitted |
| `/api/links` | PUT | Clerk session required | Update a link (also restores from trash via `is_deleted: false`) |
| `/api/links?id=...` | DELETE | Clerk session required | Soft-delete a link to trash |
| `/api/redirect?slug=...` | GET | Public | Resolves a slug, increments its click count atomically, redirects |
| `/api/suggest-slug` | POST | Clerk session required | AI slug suggestions (Gemini); the key stays server-side |

**Authorization rule:** personalized links can only be modified by their owner, public links can be modified by any signed-in user, and anonymous visitors can only read the public feed.

Request payloads are validated with zod in `api/schema.ts` (URL format, slug charset and length, no self-referencing redirects).

## Setup

**Prerequisites:** Node 20+ and the Vercel CLI (`npm i -g vercel`).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root (it is gitignored):

   | Variable | Used by | Notes |
   |----------|---------|-------|
   | `VITE_CLERK_PUBLISHABLE_KEY` | SPA | Clerk publishable key — the only non-secret variable; Vite only exposes `VITE_*` vars to the browser |
   | `CLERK_SECRET_KEY` | API | Server-only. Verifies Clerk session tokens |
   | `SUPABASE_URL` | API | Server-only. Supabase project URL |
   | `SUPABASE_KEY` | API | Server-only. Supabase API key |
   | `GEMINI_API_KEY` | API | Server-only. Powers AI slug suggestions |

3. Apply the database migrations in the Supabase SQL editor, in order:

   - `migration.sql` — creates the `links` table, its unique slug constraint, and indices
   - `migration_v2.sql` — creates the atomic `increment_clicks` function and a partial index for trash filtering

   RLS is not used; authorization is enforced entirely in the API layer, which is why the Supabase key must stay server-side.

4. For production, set the same variables in your Vercel project's environment settings.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server for the SPA only — no serverless functions, so `/api` calls will fail |
| `npm run start` | `vercel dev` — full local stack (SPA + API functions); run `vercel login` / `vercel link` first |
| `npm run build` | Production SPA build into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Type-check the project with `tsc --noEmit` |

**Deploy:** push to the Git branch connected to your Vercel project; `vercel.json` configures the build, rewrites, and security headers.

## Security model

- **Auth:** the SPA sends Clerk session tokens as bearer tokens; functions verify them with `@clerk/backend` inside the shared `withApi` wrapper.
- **No secrets in the browser:** only the Clerk publishable key is shipped in the SPA bundle. `CLERK_SECRET_KEY`, `SUPABASE_KEY`, and `GEMINI_API_KEY` are read exclusively in serverless functions.
- **Authorization in the API layer:** enforced per the rule above (no Supabase RLS).
- **Soft deletes:** trashed links stop redirecting immediately but remain recoverable from Trash.
