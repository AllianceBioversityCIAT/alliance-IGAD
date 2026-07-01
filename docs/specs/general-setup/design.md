# Design Template & Standard — IGAD Innovation Hub

> **Methodology template, not a feature spec.** `/sdd-specify` copies this into each new
> `docs/specs/<spec-path>/design.md`. It defines how a feature's technical design is
> documented so it stays consistent with the constitutional baseline.

## Document Structure

```markdown
# Design: <Feature Name>

## Overview
What is being built and how it fits the existing architecture. Link to the
requirements it satisfies (`REQ-*`) and to `docs/detailed-design/detailed-design.md`.

## Architecture Impact
Which layers change: frontend tool(s), backend tool module(s), infrastructure, data.
A small diagram or bullet flow of the request/async path.

## Data Model Changes
New/changed DynamoDB items: `PK`/`SK` patterns, `GSI1`/`GSI2` access patterns, new
attributes. State whether single-table conventions are preserved.

## API Surface
New/changed endpoints: method, path, request/response Pydantic models, auth requirement,
sync vs. async (trigger + status endpoints for long operations).

## Frontend Design
Affected pages/components under `src/tools/<tool>/` or `src/shared/`. State management
(React Query keys, Zustand slices), design tokens used, new UI components, and where
CSS Modules vs. Tailwind apply.

## Backend Design
Affected `app/tools/<module>/` files (`routes.py`, `service.py`, `config.py`), Bedrock
prompt/model usage, Lambda worker involvement, error handling.

## Design Decisions (ADR-style)
### DD-1: <Decision>
- **Context:** ...
- **Options considered:** ...
- **Decision:** ...
- **Consequences:** ...

## Risks & Open Questions
```

## Standards

- **Consistency with the baseline:** designs must not contradict
  `docs/system-design/design.md` (UX/tokens) or `docs/detailed-design/detailed-design.md`
  (data model, API, module boundaries). If they must, record a Design Decision explaining why.
- **Design tokens are mandatory** for any UI work — reference the token names, not raw values.
- **Async by default** for AI/long-running work: define the trigger + status contract.
- **Single-table discipline:** every new access pattern must fit `PK`/`SK` + `GSI1`/`GSI2`
  or justify a new index.
- **Decisions are recorded**, not implied. Every non-obvious choice gets a `DD-*` entry.
