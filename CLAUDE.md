# Alliance IGAD - Main Context (CLAUDE.md)

This file is the root-level context file for AI coding agents working on the Alliance IGAD platform. The primary application code lives in `igad-app/`.

## Hierarchy of AI Context Files

To maintain clarity and specific context, this repository uses a strict hierarchy of `CLAUDE.md` and `AGENTS.md` files. **Always read the context file closest to the directory you are modifying.**

1. **Root (You are here):** `/CLAUDE.md` -> Global project overview.
   - ↳ **Child:** [`/AGENTS.md`](./AGENTS.md) -> Global agent guidelines and available skills list.
2. **App Root:** [`igad-app/CLAUDE.md`](./igad-app/CLAUDE.md) -> Fullstack application overview and deployment commands.
   - ↳ **Child:** [`igad-app/AGENTS.md`](./igad-app/AGENTS.md) -> Global code style and monorepo structure.
3. **Frontend:** [`igad-app/frontend/CLAUDE.md`](./igad-app/frontend/CLAUDE.md) -> React/TypeScript specifics.
   - ↳ **Child:** [`igad-app/frontend/AGENTS.md`](./igad-app/frontend/AGENTS.md) -> React/Tailwind patterns.
4. **Backend:** [`igad-app/backend/CLAUDE.md`](./igad-app/backend/CLAUDE.md) -> Python/FastAPI/Lambda specifics.
   - ↳ **Child:** [`igad-app/backend/AGENTS.md`](./igad-app/backend/AGENTS.md) -> API and DynamoDB patterns.
     - ↳ **Deep Child:** [`igad-app/backend/app/tools/AGENTS.md`](./igad-app/backend/app/tools/AGENTS.md) -> Backend feature module rules.

## Project Structure

- `igad-app/`: The core application source code (frontend, backend, infrastructure).
- `docs/`: **SDD constitutional baseline** (see below) — the source of truth for product, UX, and technical design.
- `planning/`: Planning notes, requirements, and debug logs.
- `prompts/`: Prompt templates and experiments for AI features.
- `specs/`: Legacy architecture notes, designs, user flows, and mockups (some aspirational — cross-check against `docs/` before trusting).
- `.agents/`: SDD execution personas (`leader.md`, `implementer.md`, `reviewer.md`) used by `/sdd-execute`.
- `.claude/skills/` & `.opencode/skills/`: Custom instructions/skills for AI agents.

## SDD Constitutional Baseline (`docs/`)

These four documents are the foundation all module-level SDD work depends on. Read the
relevant one before specifying or implementing a change:

- [`docs/prd.md`](./docs/prd.md) — **why** the product exists: problem, personas, goals,
  scope, success metrics. Consult when scoping features or writing requirements.
- [`docs/system-design/design.md`](./docs/system-design/design.md) — the **UI/UX system**:
  design tokens (IGAD brand + semantic colors, Inter, 8px grid, radii), components,
  navigation, accessibility. Consult for any frontend/visual work; use these tokens, never hardcode.
- [`docs/detailed-design/detailed-design.md`](./docs/detailed-design/detailed-design.md) —
  the **technical blueprint**: modules, single-table data model (PK/SK + GSI1), API
  contracts, async AI worker pattern, model IDs, security model. Consult before backend/data changes.
- [`docs/specs/general-setup/`](./docs/specs/general-setup/) — **templates** (`requirements.md`,
  `design.md`, `task.md`) that `/sdd-specify` must follow, plus the spec taxonomy.

Feature specs live under `docs/specs/<category>/<slug>/` (categories: `changes/`, `bugfix/`,
`enhancements/`, `tools/<tool>/`, `epic/`). The `/sdd-*` commands (`propose`, `specify`,
`execute`, `test`, `validate`, `archive`) operate on these.

**CodeGraph:** not initialized (`.codegraph/` absent). Use `Grep`/`Glob`/Explore for
repository analysis, or ask the user to run `codegraph init -i` if graph lookups would help.

## Core Mandates for Agents
1. **Always trace down the hierarchy:** If asked to work on the frontend, first read `igad-app/frontend/CLAUDE.md` and its `AGENTS.md`.
2. **Load relevant skills:** Check `/AGENTS.md` for a list of available AI skills and use the `default_api:skill` tool to load them before writing complex code.
3. **Run Checks:** Always run the appropriate build and test commands (found in the child `CLAUDE.md` files) after making changes.
