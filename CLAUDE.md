# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Rol de Claude en este proyecto

Claude actúa como desarrollador de este proyecto: implementa features, corrige bugs y mantiene el código directamente, siguiendo las indicaciones del usuario (product owner).

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
```

No test suite is configured yet.

## Stack

- **Next.js 16** with the App Router (`app/` directory) — React 19, TypeScript, Tailwind CSS v4
- **react-icons** for icons (not lucide-react)
- **Supabase** (`@supabase/supabase-js`) for auth + Postgres, accessed directly from the browser (no server-side admin client, no `@supabase/ssr`)
- **Static export** — `output: "export"` in `next.config.ts`. No Node server at runtime; deployable to Vercel, GitHub Pages, Netlify, or any static host. `basePath`/`assetPrefix` are conditionally set to `/bar-inventory-app` only when the GitHub Actions workflow sets `GITHUB_PAGES=true`.

> Next.js 16 has breaking changes vs. earlier versions (e.g. `middleware.ts` → `proxy.ts`, exported function renamed to `proxy`, no more `edge` runtime for it). Always read `node_modules/next/dist/docs/` before adding Next.js-specific code.

> **`trailingSlash: true` breaks this app under `output: "export"`** — confirmed by testing: it makes every route emit as a directory (`login/index.html`) instead of a flat file (`login.html`), which silently breaks client-side hydration (stuck on the initial loading state, zero console errors). Don't add it back without re-testing a served static build end-to-end, not just `npm run dev`.

## Architecture

The app is a mobile-style bar inventory tracker with a fixed bottom navigation bar, gated behind username/password auth.

**Routing** — three bottom-nav pages under `app/`: `/` (Inventory), `/order`, `/history`, declared once in `app/lib/routes.ts` as a typed `Route[]` array. A few non-nav pages are reached by link/redirect instead: `/login`, `/signup`, `/inventory/add`, `/inventory/count`, `/inventory/articles` (list/edit/delete items — linked from the "Manage items" row on Inventory).

**Error handling** — every page that fetches data on mount (`/`, `/order`, `/history`, `/inventory/count`, `/inventory/articles`) follows the same `loading`/`error`/`reloadKey` state pattern: a failed fetch shows a "Could not load..." banner with a "Try again" button (bumping `reloadKey` to retrigger the effect) instead of leaving the UI stuck on a loading state forever. `AuthProvider` (in `auth-context.tsx`) also verifies the account still has a `bar` row after every session resolution — a session can outlive a deleted account, and without that check every page below would hang on the resulting query failure.

**Friendly errors** — `app/lib/services/friendly-error.ts`'s `toFriendlyMessage()` maps known Postgres unique-constraint names (duplicate item name, duplicate username, etc.) to plain text; raw Postgres/Auth error messages should never reach a toast directly — route them through this first.

**Auth** — accounts are username + password only; there's no real email. `app/lib/services/auth/auth.service.ts` builds a hidden synthetic email (`<username>@gmail.com` — Supabase validates that the domain can receive mail, so made-up domains get rejected; email confirmation is always off, so nothing is ever actually sent there) before calling `supabase.auth`. Signup also relies on a `handle_new_user` trigger (in `supabase/migrations/0001_init.sql`) that auto-creates the matching `profiles` row and the user's one `bar` row. `app/lib/services/auth/auth-context.tsx` exposes `AuthProvider`/`useAuth()`. `app/components/AppShell.tsx` wraps the whole app, redirects logged-out users to `/login` and logged-in users away from `/login`/`/signup`, and only renders the bottom nav when authenticated. This is client-side only (no `proxy.ts`) — Postgres Row Level Security is the real security boundary, not the redirect.

**Schema note** — the live inventory item is called `article` in the database (with `bar`/`category` as its parent tables), but `Item` in the app-facing TypeScript. `app/lib/services/items/items.service.ts` maps between them so pages never see the raw table names.

**Data access** — one service class per domain under `app/lib/services/<domain>/` (`items`, `orders`, `inventory`, `auth`), each with a matching `*.interface.ts`. Pages call these services rather than querying Supabase directly.

**Stock model** — see the README's "How the stock numbers work" section, and `app/lib/services/items/low-stock.ts`'s `isLow()` for the single shared low-stock rule (reused by the home stats, `/order`'s auto-list, the count screen, and history badges — don't reimplement it per page).

**Schema** — `supabase/migrations/0001_init.sql` is the source of truth for tables and RLS policies; it's also what the README tells new deployers to paste into their own Supabase SQL Editor.

**NavButton** — `app/components/NavButton.tsx` is a `'use client'` component. It uses `usePathname()` to highlight the active route. The icon set is constrained to `"inventory" | "order" | "history"` (mapped to react-icons) — extend the union and `iconMap` together when adding new nav items.

**Styling** — Tailwind v4 via PostCSS (`postcss.config.mjs`). No `tailwind.config.*` file; v4 uses CSS-first configuration.
