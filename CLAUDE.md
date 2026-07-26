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

The app is a mobile-style "what does the bar need to order" board with a fixed bottom navigation bar, gated behind username/password auth. There is no inventory count and no stock tracking — an article either has a `needed_quantity` marked (someone flagged that many units as needed) or it doesn't.

**Routing** — three bottom-nav pages under `app/`: `/` (Articles), `/order`, `/history`, declared once in `app/lib/routes.ts` as a typed `Route[]` array. `/manage` is reached by link instead (from the "Gestionar" row on `/`) — a desktop-only Trello-style board for adding/renaming/deleting categories and articles and dragging articles between categories. `/login`/`/signup` are the other non-nav pages.

**Error handling** — every page that fetches data on mount (`/`, `/order`, `/history`) follows the same `loading`/`error`/`reloadKey` state pattern: a failed fetch shows a "no se pudo cargar..." banner with a retry button (bumping `reloadKey` to retrigger the effect) instead of leaving the UI stuck on a loading state forever. `AuthProvider` (in `auth-context.tsx`) also verifies the account still has a `bar` row after every session resolution — a session can outlive a deleted account, and without that check every page below would hang on the resulting query failure.

**Friendly errors** — `app/lib/services/friendly-error.ts`'s `toFriendlyMessage()` maps known Postgres unique-constraint names (duplicate item name, duplicate username, etc.) to plain text; raw Postgres/Auth error messages should never reach a toast directly — route them through this first.

**Auth** — accounts are username + password only; there's no real email. `app/lib/services/auth/auth.service.ts` builds a hidden synthetic email (`<username>@gmail.com` — Supabase validates that the domain can receive mail, so made-up domains get rejected; email confirmation is always off, so nothing is ever actually sent there) before calling `supabase.auth`. Signup also relies on a `handle_new_user` trigger (in `supabase/migrations/0001_init.sql`) that auto-creates the matching `profiles` row and the user's one `bar` row. `app/lib/services/auth/auth-context.tsx` exposes `AuthProvider`/`useAuth()`. `app/components/AppShell.tsx` wraps the whole app, redirects logged-out users to `/login` and logged-in users away from `/login`/`/signup`, and only renders the bottom nav when authenticated (and never on `/manage`, which also gets a wider container — see below). This is client-side only (no `proxy.ts`) — Postgres Row Level Security is the real security boundary, not the redirect.

**Schema note** — the live catalog item is called `article` in the database (with `bar`/`category` as its parent tables), but `Item` in the app-facing TypeScript. `app/lib/services/items/items.service.ts` maps between them so pages never see the raw table names.

**Data access** — one service class per domain under `app/lib/services/<domain>/` (`items`, `categories`, `orders`, `auth`), each with a matching `*.interface.ts`. Pages call these services rather than querying Supabase directly.

**Needed-quantity model** — `article.needed_quantity` is the only per-article state: it's a plain number someone sets on `/` (via `itemsService.setNeeded`) meaning "this many units need ordering." `/order` shows every article where it's above zero. Confirming an order (`ordersService.confirmOrder`) writes `orders`/`order_items` rows and then zeroes `needed_quantity` for every confirmed line via `itemsService.clearNeeded`; removing a single line from `/order` without placing the order calls the same `clearNeeded`. None of this touches actual stock-on-hand — there isn't one.

**Manage board** (`/manage`) — `app/manage/page.tsx` renders two responsive-gated siblings (`hidden lg:block` / `lg:hidden`) instead of a JS viewport check, so there's no hydration flicker; the real board (`ManageBoard.tsx`) always mounts and fetches, it just isn't shown below the `lg` breakpoint. Columns are categories (plus a fixed, non-deletable "Sin categoría" column for `category_id = null`), cards are articles, drag-and-drop is `@dnd-kit` (`DndContext` + `useDroppable` per column + `useSortable` per card) — dragging a card across columns calls `itemsService.moveToCategory`, reordering within a column calls the same with the column's own id. Category CRUD goes through `categoriesService`.

**Schema** — `supabase/migrations/0001_init.sql` + `0002_rework_needs_board.sql` (run in order) are the source of truth for tables and RLS policies; they're also what the README tells new deployers to paste into their own Supabase SQL Editor.

**Base path** — `app/lib/base-path.ts` exports the single `basePath` constant (`/bar-inventory-app` under `GITHUB_PAGES=true`, else `""`), imported by both `next.config.ts` and `app/manifest.ts`. Keep using it rather than re-deriving the GitHub Pages prefix elsewhere.

**Icons & link previews** — `app/icon0.png`/`icon1.png`/`apple-icon.png`/`favicon.ico` (favicon/home-screen icons), `app/opengraph-image.png`/`twitter-image.png` (social share preview), and `public/icon-192.png`/`icon-512.png` (PWA manifest icons, referenced from `app/manifest.ts`) were all generated from one source logo — see `metadata` in `app/layout.tsx` for the title/description/OG/Twitter tags. `metadataBase` comes from `NEXT_PUBLIC_SITE_URL`, which must be the bare origin (no path) — Next.js already appends `basePath` itself, so including it in the env var too would double it up. `app/manifest.ts` needs `export const dynamic = "force-static"` to work under `output: "export"`.

**NavButton** — `app/components/NavButton.tsx` is a `'use client'` component. It uses `usePathname()` to highlight the active route. The icon set is constrained to `"articles" | "order" | "history"` (mapped to react-icons) — extend the union and `iconMap` together when adding new nav items.

**Styling** — Tailwind v4 via PostCSS (`postcss.config.mjs`). No `tailwind.config.*` file; v4 uses CSS-first configuration.
