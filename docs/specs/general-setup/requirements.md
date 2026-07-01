# Requirements Template & Standard — IGAD Innovation Hub

> **This is a methodology template, not a feature spec.** `/sdd-specify` copies this
> structure into each new `docs/specs/<spec-path>/requirements.md`. It defines how
> requirements are numbered, written, and made testable for this repository.

## Spec Taxonomy

Feature specs live under `docs/specs/<category>/<slug>/`. Use these categories:

| Category | Use for | Example path |
|---|---|---|
| `changes/` | Small, bounded changes (default for `/sdd-propose <bare-name>`) | `docs/specs/changes/add-remember-me/` |
| `bugfix/` | Defect fixes with a reproduction | `docs/specs/bugfix/login-redirect/` |
| `enhancements/` | Improvements to an existing module | `docs/specs/enhancements/renewals/` |
| `tools/<tool>/` | New capability inside a product tool | `docs/specs/tools/proposal-writer/section-reorder/` |
| `epic/` | Large multi-spec initiatives | `docs/specs/epic/newsletter-generator/` |

Each spec folder contains: `proposal.md` (optional, from `/sdd-propose`),
`requirements.md`, `design.md`, `tasks.md`, and — during execution — `execution.md`.

## Document Structure

```markdown
# Requirements: <Feature Name>

## Introduction
Short paragraph: the problem, the user, and the outcome. Link back to `docs/prd.md`
goals/user stories this feature serves.

## Glossary (optional)
Domain terms specific to this feature.

## Requirements

### REQ-1: <Short title>
**User Story:** As a <role>, I want <capability>, so that <benefit>.

**Acceptance Criteria (EARS-style):**
1. WHEN <trigger/condition> THE SYSTEM SHALL <observable behavior>.
2. WHILE <state> WHEN <event> THE SYSTEM SHALL <behavior>.
3. IF <error condition> THEN THE SYSTEM SHALL <handling>.

### REQ-2: <Short title>
...
```

## Writing Standards

- **Numbering:** `REQ-<n>` sequential per spec. Acceptance criteria are numbered under
  their requirement (`REQ-1.1`, `REQ-1.2`) so tasks and reviews can cite them exactly.
- **Testable & observable:** every criterion must be checkable by a test or a manual
  step. No vague language ("fast", "intuitive") without a measurable definition.
- **One behavior per criterion.** Use EARS keywords (WHEN / WHILE / IF-THEN / THE SYSTEM SHALL).
- **Roles** must be one of the modeled roles (`Government | NGO | Research | IGAD_Staff`)
  or "any authenticated user" / "admin".
- **Trace up:** each requirement references the `docs/prd.md` goal or user story it serves.
- **Non-goals:** include an explicit `## Non-Goals` section for anything deliberately excluded.

## IGAD-Specific Requirement Concerns (include when relevant)

- **Async AI operations:** specify the trigger endpoint, the status endpoint, and the
  expected polling behavior (3s interval, 5-min timeout) as acceptance criteria.
- **Invalidation cascade:** if the feature changes an upstream input (RFP, concept,
  template), state which downstream analyses must be invalidated.
- **Document types:** if uploads are involved, state accepted types (PDF/DOCX for
  vectorization) and rejection behavior.
- **Authorization:** state the required role and whether the route is protected/admin-only.
- **Prompt formats:** if prompts/placeholders are touched, require both `{{KEY}}` and
  `{[KEY]}` substitution.
