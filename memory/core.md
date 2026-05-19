# Project Core

**Name:** TravelPlanner
**Stack:** Next.js 15 (App Router) + TypeScript + Supabase + Vercel + Google Maps API + LLM Provider (swappable)
**Description:** A personal travel companion for discovering, saving, and planning trips
**Created:** 2026-05-19
**Owner:** yogeshreetawde29@gmail.com

## Architecture Overview

Next.js 15 App Router with React Server Components — client components only where required (map, autocomplete). Supabase for auth (email/password) and PostgreSQL DB with Row Level Security scoped to user_id on all tables. Full-screen Google Maps JavaScript API as primary UI — color-coded pins by category (red=restaurants, orange=places, blue=accommodations, green=activities). AIService abstraction layer with swappable LLM providers (ClaudeProvider | OpenAIProvider | GeminiProvider | MockProvider) selected via LLM_PROVIDER env var — used only for scratchpad categorization. Google Places Autocomplete auto-maps to our 4 categories via static mapping (no LLM). Deployed on Vercel (API routes as serverless functions).

Design spec: `docs/superpowers/specs/2026-05-19-travel-companion-design.md`

## Key External Dependencies

- **Supabase** — auth (email/password) + PostgreSQL DB + Row Level Security
- **Google Maps JavaScript API** — map rendering, custom markers, color-coded pins
- **Google Places API** — Places Autocomplete, place type data for auto-categorization
- **LLM Provider (swappable)** — scratchpad text → structured CategorizedItem; provider set via LLM_PROVIDER env var
- **Vercel** — hosting + serverless functions (Next.js API routes as /api/*)

## Data Model (core)

- `items` — all saved places/restaurants/accommodations/activities; `category` enum nullable (null = unprocessed scratchpad); `google_place_types text[]` for raw Google data; `status` enum (wishlist/planned/visited)
- `trips` — named trips with destination + dates
- `trip_items` — join table pulling global items into trips
- `scratchpad_entries` — raw text pending AI categorization

## Phase 2 Hooks (designed for, not built)

Collaboration (access_grants table), in-the-moment mode, post-trip logging, native mobile/desktop apps, OAuth (Google/Apple), URL/reel import.
