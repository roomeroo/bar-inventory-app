# Bar Needs Board

A small mobile-style app for a bar: mark how many units of each article need ordering, build an order list from what's been marked, and keep a history of past orders. There's no inventory count — nothing here tracks actual stock on hand. Built with Next.js and Supabase.

Anyone can self-host their own copy. Each deployment uses its **own** Supabase project — there's no shared backend. Within one deployment, any number of accounts can sign up, and every account's catalog, orders, and history are fully isolated from every other account (enforced by Postgres Row Level Security, not just app code).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth), accessed directly from the browser via `@supabase/supabase-js`

## Setup

### 1. Create your Supabase project

Go to [supabase.com](https://supabase.com), create a new project, then open **SQL Editor** and paste in the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it, then do the same with [`supabase/migrations/0002_rework_needs_board.sql`](supabase/migrations/0002_rework_needs_board.sql). Together these create all the tables and Row Level Security policies the app needs. (If you use the Supabase CLI locally, `supabase db push` applies both in order.)

### 2. Check three Auth settings (required)

This app only asks users for a **username and password** — there's no real email involved. Under the hood, each account is created with a hidden address (`<username>@gmail.com`) so Supabase Auth has something to store; Supabase validates that the domain can actually receive mail, which is why a made-up domain like `.local` doesn't work here — but since email confirmation is always off (see below), nothing is ever actually sent there.

In your Supabase project, check all three of these under **Authentication**:

1. **Settings → "Allow new users to sign up"** — must be **ON**.
2. **Providers → Email → "Enable email provider"** — must be **ON**.
3. **Providers → Email → "Confirm email"** — must be **OFF**.

Miss any one of these and new accounts will be stuck unable to sign up or sign in.

### 3. Set your environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — both found in your Supabase project under **Project Settings → API**.

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the sign-up page.

## Deploy

The whole app is a **static export** (`output: "export"` in `next.config.ts`) — there's no server-side code, everything talks to Supabase directly from the browser. That means it can be hosted anywhere that serves static files, not just Node hosts.

### Vercel (simplest)

Import the repo at [vercel.com/new](https://vercel.com/new), set the same two environment variables from step 3, and deploy. Every push redeploys automatically. Optionally also set `NEXT_PUBLIC_SITE_URL` to your Vercel domain (e.g. `https://your-app.vercel.app`) so shared links show a proper preview image instead of a broken one — see the note in `.env.example`.

### GitHub Pages

Already wired up via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml):

1. In your repo: **Settings → Pages → Source → GitHub Actions**.
2. **Settings → Secrets and variables → Actions**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as repository secrets (same values as `.env.local`). `NEXT_PUBLIC_SITE_URL` is computed automatically from your username — nothing to add for that one.
3. Push to `develop` (or run the workflow manually from the Actions tab) — it builds and publishes to `https://<your-username>.github.io/bar-inventory-app/`.

If you fork/rename the repo, update `basePath` in [`app/lib/base-path.ts`](app/lib/base-path.ts) to match your repo name — GitHub Pages serves project sites under `/<repo-name>/`, so this has to line up exactly.

### Netlify / Cloudflare Pages

Same idea as Vercel: connect the repo, set the two environment variables, deploy. Both have first-class Next.js static export support.

## How the order list works

Every article has one number: **needed quantity** — how many units someone has flagged as needed. Mark it from the Articles list (search or filter by category first, if the catalog is long), and it shows up on the Order screen along with everything else marked. From there you can tweak the amount, remove a line entirely (e.g. it's too expensive to order right now), copy the list to your clipboard, download it as a `.txt`, or mark it as ordered — which saves it to History and clears every needed quantity back to zero.

## Managing categories and articles

The catalog itself (categories and articles) is managed from a separate, desktop-only screen (linked as "Gestionar" from the Articles list): a Trello-style board where each column is a category and each card is an article, draggable between columns. It's gated to larger screens because rearranging a catalog like this needs more room than a phone can give it — on mobile, that link just shows a message instead of the board.
