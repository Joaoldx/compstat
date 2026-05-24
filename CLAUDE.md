# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CoPatrulha is a criminal intelligence prototype for the Rio de Janeiro municipal government (Compstat). It covers **22 priority areas of the Força Municipal (FM)** and auto-generates RELINT (Area Intelligence Reports) that were previously written by hand.

The repository has two independent subprojects:

| Path | Stack | Purpose |
|---|---|---|
| `/` (root) | Next.js 16, React 19, MapLibre GL, Tailwind CSS 4 | Web frontend — interactive territorial domain map, Radar dashboard with chatbot, contact form |
| `relintgenerator/` | Python 3.13, GeoPandas, Polars, Anthropic SDK | Data pipeline and RELINT generation via Claude API |

See `relintgenerator/CLAUDE.md` for the Python subproject.

## Frontend commands

```bash
npm install          # install dependencies
npm run dev          # dev server with Turbopack (http://localhost:3000)
npm run build        # production build
npm run lint         # ESLint
npm run format       # Prettier (writes in place)
npm run typecheck    # tsc --noEmit
```

No test suite is configured.

## Environment variables

Create `.env.local` at the root (see `.env.example`):

| Variable | Purpose |
|---|---|
| `BREVO_API_KEY` | Brevo transactional API key — server-only, never `NEXT_PUBLIC_` |
| `BREVO_SENDER_EMAIL` | Verified sender address in Brevo |
| `OPEN_ROUTER_API_KEY` | OpenRouter key for the Radar chatbot — server-only |

Contact destination is in `src/config/contact.ts`.

## Architecture

### Pages (App Router)

- `/` — landing page
- `/mapa` — interactive territorial domain map of Rio de Janeiro
- `/radar` — Radar Rio dashboard: RJ state map + AI assistant chatbot (FAB)
- `/radar-rio` — standalone Radar Rio page
- `/contato` — contact form (Brevo email)

### Map rendering

MapLibre GL (`react-map-gl/maplibre`) requires browser APIs. All map components must be loaded with `next/dynamic` + `ssr: false`. See `src/app/mapa/mapa-interactive.tsx` and `src/app/radar/radar-dashboard.tsx` for the pattern.

Data flow for the territorial domain map:
1. `public/dominio_territorial - Extração 1.csv` — WKT polygons with territorial info
2. `GET /api/territorios` — reads the CSV via `src/lib/data/territorios.ts`, parses WKT with `wellknown`, returns GeoJSON
3. `src/hooks/use-territorios-geojson.ts` — client-side fetch hook
4. `src/components/mapa/rio-map.tsx` — renders fill + line layers, hover popup

### Chat API

`POST /api/chat` proxies to OpenRouter using `anthropic/claude-sonnet-4` (fallback: `anthropic/claude-3.5-sonnet`). The key must be `OPEN_ROUTER_API_KEY` (server-only). The route validates and normalizes messages before forwarding.

### Email

`POST /api/contact` sends transactional email via Brevo REST API (`src/lib/email/brevo-transactional.ts`).

## Key domain concepts

| Term | Definition |
|---|---|
| **Área FM** | Polygon of operations for the Força Municipal (22 total) |
| **RELINT** | Area Intelligence Report — qualitative source on criminal dynamics |
| **Mancha criminal** | Geospatial concentration of robbery/theft incidents |
| **Domínio territorial** | Favela/morro coverage by faction or militia (~8% of incidents; most occur on "asfalto") |
| **Coincidência de alto risco** | Overlap of mancha criminal + urban factor + criminal dynamics — operational prioritization criterion |
