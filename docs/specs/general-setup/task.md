# Tasks Template & Standard — IGAD Innovation Hub

> **Methodology template, not a feature spec.** `/sdd-specify` copies this into each new
> `docs/specs/<spec-path>/tasks.md`. It defines the task format, status lifecycle, and
> verification expectations the `/sdd-execute` Leader → Implementer → Reviewer loop relies on.

## Task Status Lifecycle

| Marker | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress / paused (resume from `execution.md`) |
| `[x]` | Complete and Reviewer-approved (PASS) |

The Leader transitions status and records every loop iteration in `execution.md`.

## Document Structure

```markdown
# Tasks: <Feature Name>

## Task Graph
A short dependency list so the Leader can pick eligible tasks:
- T1 → (none)
- T2 → T1
- T3 → T1
- T4 → T2, T3

## Tasks

### [ ] T1: <Short title>
- **Requirement(s):** REQ-1, REQ-2.1
- **Scope:** exact files/modules to change (e.g. `igad-app/backend/app/tools/proposal_writer/...`).
- **Layer:** frontend | backend | infrastructure | data
- **Details:** what to implement, referencing the design section.
- **Verification:** the exact command to run and the expected result, e.g.
  `cd igad-app/backend && make check && make test` or
  `cd igad-app/frontend && npm run type-check && npm run lint && npm run test`.
- **Dependencies:** none | T-ids

### [ ] T2: <Short title>
...
```

## Standards

- **One task = one focused, verifiable unit.** If it can't be verified by a command or a
  concrete manual step, split it.
- **Every task cites its requirement(s)** so traceability holds from `requirements.md` →
  `tasks.md` → commit (`[SPEC:<spec-path>] <message>`).
- **Every task names its verification command**, chosen by layer:
  - Frontend: `npm run type-check && npm run lint && npm run test`
  - Backend: `make check && make test` (or `make all-checks`)
  - Infrastructure: `npm run build && npm run test`
- **Dependencies are explicit** and acyclic. The Leader only starts a task when all its
  dependencies are `[x]`.
- **No production deploys inside tasks.** Deploying to `igad-prod-*` is a human-gated step,
  never part of an automated task. Deploy to `igad-testing-*` first when a task requires it.
- **Async AI tasks** must verify both the trigger and the status/polling behavior.
- **Testing expectation:** each behavioral task adds or updates automated tests
  (pytest for backend, Vitest for frontend) covering its acceptance criteria.
