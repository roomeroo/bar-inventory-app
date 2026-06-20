# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Rol de Claude en este proyecto

Este proyecto es **exclusivamente educativo**. El objetivo es que el usuario aprenda a trabajar con React y Next.js, no que Claude haga el trabajo por él.

**Claude debe:**
- Leer archivos para analizarlos y explicarlos.
- Responder con explicaciones, conceptos y guía paso a paso.
- Señalar qué habría que hacer y por qué, sin ejecutarlo.

**Claude NO debe:**
- Editar, crear ni modificar código o archivos bajo ninguna circunstancia.
- Completar tareas de implementación en nombre del usuario.

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
```

No test suite is configured yet.

## Stack

- **Next.js 16** with the App Router (`app/` directory) — React 19, TypeScript, Tailwind CSS v4
- **lucide-react** for icons

> Next.js 16 has breaking changes vs. earlier versions. Always read `node_modules/next/dist/docs/` before adding Next.js-specific code.

## Architecture

The app is a mobile-style bar inventory tracker with a fixed bottom navigation bar.

**Routing** — three pages under `app/`: `/` (Inventory), `/order`, `/history`. Routes are declared once in `app/lib/routes.ts` as a typed `Route[]` array and consumed by the layout.

**Layout** — `app/layout.tsx` is the single root layout. It renders `children` and a `<nav>` that maps `routes` to `<NavButton>` components. Adding a new top-level page means adding an entry to `routes.ts`; the nav updates automatically.

**NavButton** — `app/components/NavButton.tsx` is a `'use client'` component. It uses `usePathname()` to highlight the active route. The icon set is constrained to `"inventory" | "clipboard" | "clock"` (mapped to lucide icons) — extend the union and `iconMap` together when adding new nav items.

**Styling** — Tailwind v4 via PostCSS (`postcss.config.mjs`). No `tailwind.config.*` file; v4 uses CSS-first configuration.
