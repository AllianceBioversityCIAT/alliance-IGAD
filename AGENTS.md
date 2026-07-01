# AGENTS.md - Global AI Guidelines

This file outlines the global guidelines and available AI skills for agents working on the Alliance IGAD repository.

## Context Hierarchy

> **Parent:** [`/CLAUDE.md`](./CLAUDE.md)
> **Children:** [`igad-app/AGENTS.md`](./igad-app/AGENTS.md)

## SDD Baseline & Execution Personas

Before non-trivial feature work, consult the constitutional baseline in `docs/`
(`prd.md`, `system-design/design.md`, `detailed-design/detailed-design.md`,
`specs/general-setup/`) — described in [`/CLAUDE.md`](./CLAUDE.md).

The `.agents/` directory holds the tool-agnostic execution triad that `/sdd-execute`
orchestrates in a Leader → Implementer → Reviewer rework loop (3-attempt ceiling):

- `.agents/leader.md` — orchestration, task tracking, `execution.md` audit trail,
  `[SPEC:<spec-path>]` commit standard.
- `.agents/implementer.md` — coding to spec, IGAD idioms, design-token compliance,
  per-layer verification commands.
- `.agents/reviewer.md` — read-only spec/token/technical audit with structured PASS/FAIL.

## Available Skills

This repository contains an extensive set of agent skills in `.claude/skills/`. When performing a task that matches one of these domains, **you MUST use the `default_api:skill` tool** to load the specialized instructions before proceeding.

### Backend & Cloud
- `fastapi-serverless` - Building Python APIs with FastAPI on AWS Lambda/DynamoDB (CRITICAL for backend).
- `aws-serverless` - AWS serverless application patterns.
- `api-design-principles` - REST API design guidelines.

### Frontend
- `react-doctor` - Deep review and bug fixing for React components.
- `vercel-react-best-practices` - Advanced React optimization and state management patterns.
- `tailwind-design-system` - Scalable Tailwind design systems and CVA usage.
- `shadcn-ui` - Best practices for working with shadcn/ui components.
- `web-design-guidelines` - General UI/UX design checking and accessibility.

### General Engineering & Architecture
- `systematic-debugging` - Deep root-cause tracing for tough bugs.
- `error-handling-patterns` - Advanced error handling.
- `commit` - Conventional commit standards for the project.
- `product-manager-toolkit` - Product requirements, user research, and planning tasks.
- `brainstorming` - Ideation and structured thinking.

## Global Agent Directives

1. **No assumptions:** Use the `read` or `glob` tools to investigate code instead of guessing file contents.
2. **Skill injection:** Be proactive in loading the `fastapi-serverless` skill when touching backend code, or `tailwind-design-system` / `react-doctor` when touching frontend code.
3. **Delegate context:** Do not put tech-stack-specific code rules here. Look at `igad-app/frontend/AGENTS.md` or `igad-app/backend/AGENTS.md` for specific formatting, import orders, and syntax rules.
