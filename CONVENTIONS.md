# CONVENTIONS.md

Living document — actively maintained by the reviewer and memory agents.
Last reviewed: 2026-05-19

---

## Code Style

### Naming
- Variables and functions: camelCase
- React components and TypeScript types/interfaces: PascalCase
- Constants and env vars: UPPER_SNAKE_CASE
- Files: kebab-case (e.g. `place-card.tsx`, `ai-service.ts`)
- Database columns: snake_case (Supabase/Postgres convention)
- Private class members: _leading_underscore

### Formatting
- Formatter: **Prettier** (project `.prettierrc`)
- Indentation: 2 spaces (JS/TS/JSX standard)
- Max line length: 100 characters
- Trailing commas: all (ES5+)
- Single quotes for strings

### Imports
- External packages first, internal second, relative last
- Alphabetical within each group
- No wildcard imports
- Use `@/` path alias for `src/` imports (configured in `tsconfig.json`)

---

## Architecture

### Folder Structure (Next.js 15 App Router)
```
src/
  app/                  ← Next.js App Router pages and layouts
    (auth)/             ← auth group (login, signup)
    map/                ← main map view
    trips/              ← trip list + detail
    add/                ← add item flow
    scratchpad/         ← scratchpad flow
    api/                ← API route handlers (serverless)
      categorize/
      items/
  components/           ← shared React components
  lib/                  ← pure utilities, service clients, helpers
    supabase/           ← Supabase client setup
    google-maps/        ← Google Maps helpers + place type mapping
    ai/                 ← AIService + LLM providers
  types/                ← TypeScript interfaces and enums
  hooks/                ← React custom hooks (useMap, useItems, etc.)
tests/                  ← Vitest unit + integration tests (mirrors src/)
e2e/                    ← Playwright E2E + visual regression tests
```

### Patterns
- **Server Components by default** — only add `'use client'` when interactivity requires it
- **AIService interface** — all LLM calls go through `lib/ai/ai-service.ts`; never call provider APIs directly from components or API routes
- **Supabase RLS** — every query is scoped by auth context; never bypass with service role key in user-facing routes
- **Provider pattern** for LLM — `LLM_PROVIDER` env var selects the implementation at startup
- One responsibility per file; if a file exceeds ~200 lines it's doing too much

### What to Avoid
- `'use client'` on layout or page components — push interactivity to leaf components
- Calling LLM provider APIs directly from anywhere except `lib/ai/`
- Hardcoding API keys — always via env vars
- Bypassing Supabase RLS with `supabaseAdmin` in user-facing code
- `any` type in TypeScript — use `unknown` and narrow it

---

## Testing

### Unit Tests (Vitest)
- Every exported function in `lib/` has a unit test
- Tests mirror source structure under `tests/`
- Naming: `describe('<module>') > it('<function> <scenario>')`
- Use `MockProvider` for all tests touching AIService — no real LLM calls
- One assertion per test (prefer)

### Integration Tests (Vitest + local Supabase)
- Cover API route → service → DB flows
- Run against local Supabase instance (`supabase start`)
- No external API calls — use `MockProvider` for LLM, test data for Google place types
- Tag with `// @integration` comment

### Visual Regression Tests (Playwright + Docker)
- Baseline PNGs committed to `e2e/snapshots/`
- Run inside Playwright's official Docker image for rendering consistency
- Update baselines: `playwright test --update-snapshots`
- Covers: map view, side panel, item card, add form, scratchpad flow, trip detail

### E2E (Playwright)
- Happy path only per feature: add item via autocomplete, scratchpad → categorize → confirm, create trip → add items
- Run against local dev server or staging

### Coverage
- Unit test coverage target: 80% for `lib/`
- No coverage requirement on `components/` (covered by visual regression)
- Enforce via `vitest --coverage` in CI

---

## Git

### Branch Naming
- Features: `feat/<short-description>`
- Bug fixes: `fix/<short-description>`
- Chores: `chore/<short-description>`
- Docs: `docs/<short-description>`

### Commit Style
- Format: `<type>: <short description>` (50 chars max for subject)
- Types: feat, fix, chore, docs, test, refactor, perf
- Body: wrap at 72 chars, explain WHY not WHAT
- No "WIP" commits on main — squash before merge

### PR Size
- Aim for < 400 lines changed per PR
- One logical change per PR
- Link to TASK-ID in PR description

### What Not to Do
- Never force push to main
- Never commit `.env`, `.env.local`, or any API keys
- Never skip pre-commit hooks (`--no-verify`)

---

## API / Interface Design

### Response Structure
All `/api/*` routes return:
```ts
{ data: T | null, error: { code: string, message: string } | null }
```

### Error Codes
Snake_case, descriptive: `invalid_input`, `not_found`, `unauthorized`, `categorization_failed`

### Versioning
No versioning for Phase 1 — all routes are internal to the Next.js app.

---

## Agent Rules

### Must Do
- Memory agent runs after every completed pipeline — no exceptions
- Security agent is a hard gate — pipeline stops on BLOCKERS
- Coder agent writes unit tests before implementation (TDD)
- Reviewer agent must output `PASS` or `FIX_REQUIRED` — nothing else

### Must Not Do
- Sub-agents do not inherit full conversation history
- Sub-agents do not load all skill files — only the one relevant to their task
- Orchestrator does not write code directly
- No agent skips the memory step after a significant decision

### Convention Promotion
When reviewer or memory agent identifies a repeated pattern, flag it to the orchestrator as:
```
CONVENTION_CANDIDATE: [section] description of the convention
```

---

## Documentation

### What to Document
- Public API route contracts
- Non-obvious design decisions (the WHY)
- AIService provider interface and how to add a new provider
- External service integration setup (Supabase, Google Maps)

### What Not to Document
- Self-explanatory component props
- Standard Next.js/React patterns
- Temporary workarounds (fix them instead)

---

_Last reviewed: 2026-05-19_
