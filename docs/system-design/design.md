# System Design — UI/UX Blueprint · IGAD Innovation Hub

> **Constitutional baseline.** This is the visual and interaction system of record, not
> low-level implementation (that lives in
> [`../detailed-design/detailed-design.md`](../detailed-design/detailed-design.md)).
> Token values below are extracted from `igad-app/frontend/tailwind.config.js` and
> `src/styles/globals.css` — keep them in sync with those files.

---

## 1. Product Experience Principles

Following Glashaus Innovation's human-centered guidance, the Hub optimizes for
non-expert users producing high-stakes documents:

- **Guided, not autonomous.** AI augments the user at every step; the human stays in control.
- **Transparency.** Show what the AI analyzed and why; expose analysis status, not black boxes.
- **Feedback loops.** Each step lets the user review, edit, and re-run before moving on.
- **Resumability.** Long AI operations and multi-step flows survive refreshes and returns.
- **Trust through consistency.** One design language, predictable navigation, accessible by default.

## 2. Information Architecture

```
Public          → Home, Guide, Login / Password Reset
Authenticated   → Layout shell (Navigation + content)
  ├─ Dashboard              (list / sort / paginate / resume proposals)
  ├─ Proposal Writer        (4-step workflow, /:stepId)
  ├─ Newsletter Generator   (disabled / under construction)
  └─ Admin (admin role)
       ├─ Prompt Manager    (list / create / edit)
       └─ Settings
```

## 3. Primary User Flows

- **Create a proposal:** Dashboard → New → Step 1 Information Consolidation → Step 2
  Concept Review → Step 3 Structure & Workplan → Step 4 Proposal Review → download.
- **Resume a proposal:** Dashboard → open in-progress proposal → lands on last step;
  `useProcessingResumption` re-attaches to any AI operation still running.
- **Admin tunes AI:** Admin → Prompt Manager → edit → publish (affects subsequent AI ops).
- **Auth:** Login → protected area; password reset via Cognito flow.

## 4. Screen Inventory

| Screen | Route | Notes |
|---|---|---|
| Home | `/` | Public landing |
| Guide | `/guide` | How-to |
| Login / Reset | `/login`, reset routes | Cognito-backed |
| Dashboard | `/dashboard` | Stats cards, sortable/paginated table, mobile view |
| Proposal Writer | `/proposal-writer/:stepId` | Single orchestrator, 4 steps |
| Newsletter | `/newsletter-generator/...` | Disabled / coming soon |
| Prompt Manager | `/admin/prompt-manager[/create|/edit/:id]` | Admin only |
| Admin Settings | `/admin/settings` | Admin only |
| Not Found | `*` | 404 |

## 5. Navigation Model

- **Route guards:** `PublicRoute`, `ProtectedRoute`, `AdminRoute` (`src/shared/components/`).
- Authenticated screens render inside `<Layout />` (top `Navigation`).
- Proposal Writer adds a **secondary navbar + sidebar** (`ProposalSecondaryNavbar`,
  `ProposalSidebar`) with per-step lock indicators and completion hints; disabled steps
  are visibly locked until prerequisites are met.
- Most pages are code-split via `React.lazy`.

## 6. Layout Patterns

- App shell: fixed top navigation + scrollable content region.
- Workflow pages: step header + primary content + contextual sidebar.
- Dashboard: stat cards row → data table (desktop) / stacked cards (mobile).
- Modals for progress and confirmation (`AnalysisProgressModal`, `ConfirmDialog`,
  `ConfirmationModal`, `ErrorModal`) — never native `confirm()`.

## 7. Design Tokens

**Source of truth:** `frontend/tailwind.config.js` + `src/styles/globals.css`
(`--igad-*`, `--background`, `--border`, `--text-primary`, gray scale). Use token
names in code — never hardcode these values.

### Brand (IGAD)
| Token | Value | Use |
|---|---|---|
| `igad-primary` | `#016630` | Primary brand green |
| `igad-secondary` | `#008236` | Secondary green |
| `igad-button-green` | `#00A63E` | Brand CTAs |
| `igad-light-green` | `#DCFCE7` | Tinted surfaces |
| `igad-border-green` | `#B9F8CF` | Brand borders |

### Semantic
| Token family | Main | Use |
|---|---|---|
| `primary-*` | `#2563eb` (blue) | Main actions, links, focus rings |
| `success-*` | `#10b981` | Positive states |
| `warning-*` | `#f59e0b` | Caution states |
| `error-*` | `#ef4444` | Errors, destructive |
| `gray-*` | scale | Neutral UI, text, borders |

### Typography, spacing, geometry
- **Font:** `Inter, system-ui, sans-serif`.
- **Type scale:** custom (`heading-1` … `body-sm`).
- **Spacing:** 8px grid.
- **Radii:** `card` 12px, `button` 8px, `input` 6px.
- **Shadows:** `card`, `card-hover`, `button`.

## 8. Component Inventory

Reusable UI in `src/shared/components/ui/`: **Button, Card, Input, Spinner /
LoadingSpinner, Skeleton, Toast / ToastContainer, ConfirmDialog, ConfirmationModal,
ErrorModal**. Layout/nav: `Layout`, `Navigation`, `LoadingScreen`, route guards.

**Standards:**
- Build variants with **CVA** + the `cn()` helper (`clsx` + `tailwind-merge`).
- Tailwind utilities for layout/spacing/color; **CSS Modules** for complex/animation/
  pseudo-element styling; the two may combine via `cn(styles.x, 'tailwind ...')`.
- UI primitives use the `forwardRef` pattern and set `displayName`.

## 9. Responsive Behavior

- Mobile-first; the Dashboard has an explicit mobile card layout distinct from the
  desktop table. Workflow sidebars collapse on small screens. Use Tailwind breakpoints;
  do not hardcode widths where the spacing grid/tokens apply.

## 10. Accessibility Expectations

- Every interactive element has a visible **`focus-visible` ring**
  (`focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`).
- Provide `aria-label`/roles for icon-only controls and dialogs.
- Use semantic HTML; modals trap focus and are dismissible.
- Lint is strict (`max-warnings 0`); accessibility regressions should fail review.

## 11. Dark Mode Behavior

- No dark theme is currently shipped. CSS variables in `globals.css` make a future
  theme feasible. Until a dark palette is defined, **do not** introduce ad-hoc dark
  styles — this is an open gap (see §13).

## 12. Design Decisions

- **DD-1 Tailwind + CSS Modules hybrid.** Tokens/utilities for the common case; CSS
  Modules for complex component-scoped styling. Rationale: velocity + escape hatch.
- **DD-2 CVA for variants.** Type-safe, consistent component APIs.
- **DD-3 Custom modals over native dialogs.** Consistent styling, focus management,
  and non-blocking UX for async AI progress.
- **DD-4 Two color systems (brand `igad-*` + semantic).** Brand green for identity/CTAs;
  blue `primary-*` for interactive/system semantics. Keep the split intentional.

## 13. Open Gaps / Open Questions

- **Dark mode** palette undefined.
- **Frontend test coverage:** Vitest is configured but no `*.test.tsx` suites exist yet;
  the component library is untested.
- **Token drift risk:** values are duplicated between `tailwind.config.js` and
  `globals.css` — consider generating one from the other.
- **Figma alignment:** confirm the shipped UI matches the referenced Figma mockups.
