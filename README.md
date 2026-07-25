# Bar Inventory

A small mobile-style inventory tracker for a bar: keep a running count of stock, generate an order list from what's running low, and see a history of past inventory counts. Built with Next.js and Supabase.

Anyone can self-host their own copy. Each deployment uses its **own** Supabase project — there's no shared backend. Within one deployment, any number of accounts can sign up, and every account's inventory, orders, and history are fully isolated from every other account (enforced by Postgres Row Level Security, not just app code).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth), accessed directly from the browser via `@supabase/supabase-js`

## Setup

### 1. Create your Supabase project

Go to [supabase.com](https://supabase.com), create a new project, then open **SQL Editor** and paste in the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it. This creates all the tables and Row Level Security policies the app needs. (If you use the Supabase CLI locally, `supabase db push` works too.)

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

## How the stock numbers work

Each item tracks more than just "how many do we have":

- **Quantity** — the last count you entered.
- **Min stock** — a fixed floor; below or at this, a brand-new item (one that's never been ordered) is flagged low.
- **Expected quantity** — set automatically when you place an order (`quantity + amount ordered`). Until your next inventory count, the item is compared against this instead of min stock — so if you had 2, ordered 4 (expecting 6), and the next count finds only 3, it's flagged low even though 3 might be above min stock, and History shows "ordered 4 to reach 6, found 3". Once you save that count, the expectation clears and 3 becomes the new baseline until you order again.
