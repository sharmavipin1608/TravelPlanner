# Task Queue

Tasks are processed top-to-bottom. Each task goes through the full agent pipeline.

## Format

```
### [TASK-ID] Task Title
**Status:** pending | in_progress | completed | blocked | failed
**Priority:** high | medium | low
**Agent:** researcher | coder | tester | etc.
**Tags:** [domain] tags matching facts.md
**Depends on:** TASK-ID (if any)

Task description — what needs to be done and why.
```

## Tasks

### [TASK-000] Brainstorm and design TravelPlanner
**Status:** completed
**Priority:** high
**Agent:** orchestrator
**Tags:** [core]

Brainstorming complete. Design spec approved and committed.
Spec: `docs/superpowers/specs/2026-05-19-travel-companion-design.md`

Key decisions:
- Stack: Next.js 15 + TypeScript + Supabase + Vercel + Google Maps API
- UI: Map-first (full-screen map with color-coded pins + side panel)
- Data: Single `items` table with category enum + `google_place_types[]` for auto-classification
- AI: AIService abstraction with swappable LLM providers (LLM_PROVIDER env var)
- Phase 1 scope: global save list, 4 categories, AI scratchpad, basic trip planning, auth

---

### [TASK-001] Apply ClaudeTemplate and initialize project structure
**Status:** completed
**Priority:** high
**Agent:** writer
**Tags:** [core]
**Depends on:** TASK-000

ClaudeTemplate (feat/superpowers-phase0-integration) applied manually to TravelPlanner:
- All template files copied with placeholders replaced
- memory/core.md populated with TravelPlanner architecture
- CONVENTIONS.md filled in for Next.js/TypeScript stack
- Agent definitions, hooks, skills, tools all in place
- .claude/settings.json configured with hooks
- GitHub repo initialized: https://github.com/sharmavipin1608/TravelPlanner

---

### [TASK-002] Adjust agent definitions for Next.js / TypeScript stack
**Status:** pending
**Priority:** medium
**Agent:** writer
**Tags:** [agents] [conventions]
**Depends on:** TASK-001

Review `agents/coder.md`, `agents/tester.md`, and `agents/security.md`. Replace generic/language-agnostic guidance with Next.js/TypeScript specifics:
- Coder: ESLint + Prettier commands, `pnpm` as package manager, Next.js App Router patterns
- Tester: Vitest for unit/integration, Playwright for E2E + visual regression, `supabase start` for integration DB
- Security: Next.js-specific concerns (API route auth, env var handling, Supabase RLS, Google Maps key restrictions)

---

### [TASK-003] Write implementation plan
**Status:** pending
**Priority:** high
**Agent:** orchestrator
**Tags:** [core] [planning]
**Depends on:** TASK-001

Invoke the `writing-plans` skill with the approved design spec as input:
`docs/superpowers/specs/2026-05-19-travel-companion-design.md`

Output: `docs/superpowers/plans/2026-05-19-travel-companion-implementation.md`

After plan is approved, dispatch Writer agent to bulk-populate TASKS.md with implementation tasks (TASK-004 onwards).

