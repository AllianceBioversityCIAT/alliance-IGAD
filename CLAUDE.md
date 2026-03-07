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
- `planning/`: Planning notes, requirements, and debug logs.
- `prompts/`: Prompt templates and experiments for AI features.
- `specs/`: Designs, user flows, and mockups.
- `.claude/skills/` & `.opencode/skills/`: Custom instructions/skills for AI agents.

## Core Mandates for Agents
1. **Always trace down the hierarchy:** If asked to work on the frontend, first read `igad-app/frontend/CLAUDE.md` and its `AGENTS.md`.
2. **Load relevant skills:** Check `/AGENTS.md` for a list of available AI skills and use the `default_api:skill` tool to load them before writing complex code.
3. **Run Checks:** Always run the appropriate build and test commands (found in the child `CLAUDE.md` files) after making changes.
