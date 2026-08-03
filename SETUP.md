# Faith over Fear — running the app

A React + Vite SPA with Vercel serverless functions, Postgres on Neon, auth via
Clerk, and an AI verse-suggestion endpoint powered by Claude. This is the
production implementation of the design in [`README.md`](./README.md).

## Stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Frontend   | React 18 + Vite + TypeScript, React Router, TanStack Query |
| Auth       | Clerk (`<SignIn/>` styled to the Modernist tokens) |
| API        | Vercel serverless functions in `/api`              |
| Database   | Neon Postgres (`@neondatabase/serverless`)         |
| AI         | Claude via `@anthropic-ai/sdk` (structured output) |
| Verse text | bible-api.com (World English Bible, public domain), cached in Postgres |

## 1. Prerequisites

- Node 20+ and npm
- Accounts: [Clerk](https://dashboard.clerk.com), [Neon](https://console.neon.tech),
  [Anthropic](https://console.anthropic.com)
- The [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`) for local dev
  that runs the API alongside the frontend

## 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — from Clerk → API Keys
- `DATABASE_URL` — the **pooled** Neon connection string
- `ANTHROPIC_API_KEY` — from the Anthropic console

Optional: `SUGGEST_MODEL` (default `claude-opus-5`; use `claude-sonnet-5` or
`claude-haiku-4-5` for lower latency), `BIBLE_TRANSLATION` (default `web`).

## 3. Create the database schema

```bash
npm install
npm run db:setup      # applies db/schema.sql to DATABASE_URL
```

## 4. Run locally

```bash
npm run dev           # `vercel dev` — serves the SPA and /api together
```

Then open the printed URL (usually http://localhost:3000). `vercel dev` reads
`.env.local` automatically.

> Prefer running just the frontend? `npm run dev:web` starts Vite alone and
> proxies `/api` to a `vercel dev` instance on port 3000 (see `vite.config.ts`).

Optional — seed ~15 entries so the Topics cloud looks realistic. Grab your Clerk
user id (Clerk dashboard → Users, or log `useAuth().userId` while signed in):

```bash
SEED_USER_ID=user_xxx npm run db:seed
```

## 5. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel (framework preset: **Vite**).
2. Add the same environment variables in **Project → Settings → Environment
   Variables** (`VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`,
   `ANTHROPIC_API_KEY`, and any optional overrides).
3. In Clerk, add your production domain under **Domains**.
4. Deploy. `vercel.json` routes everything except `/api/*` to the SPA.

## How it maps to the design handoff

| Prototype state        | Production                                             |
| ---------------------- | ----------------------------------------------------- |
| `signedIn`             | Clerk session (`<SignedIn/>` / `<SignedOut/>`)        |
| `screen` / ids         | Routes `/`, `/fear/:id`, `/new`, `/fear/:id/edit`     |
| `fears[]`              | Neon `fears` + `fear_verses`, cached via TanStack Query |
| `query/status/topic/view` | URL search params (a filtered or cloud view is shareable) |
| `draft`                | Local form state in `EntryForm`                       |
| `suggesting`/`suggestions` | `POST /api/suggest-verses` (Claude + Bible hydration) |
| `confirmId`            | Delete dialog                                          |

## API

All routes require a Clerk session (Bearer JWT) and are scoped by `user_id`.

- `GET  /api/fears` — list the signed-in user's entries
- `POST /api/fears` — create `{ fear, truth, topic?, refs[] }`
- `GET  /api/fears/:id` — read one (hydrates any missing verse text)
- `PATCH /api/fears/:id` — update fields / status / verses
- `DELETE /api/fears/:id` — delete
- `POST /api/suggest-verses` — `{ fear }` → `{ topic, verses: [{ reference, text, why }] }`

### AI verse suggestion

`/api/suggest-verses` asks Claude for a topic plus 4–5 references (each with a
one-line reason) using **structured JSON output**, then hydrates the verse
**text** from a licensed public-domain source and caches it in Postgres. The
model never supplies the scripture text, so translations stay correct and
consistent. Swap `SUGGEST_MODEL` to trade latency for depth.
