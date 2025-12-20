# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

React 18 + TypeScript SPA for the IGAD Innovation Hub. Main feature is the **Proposal Writer Tool** - a multi-step workflow for creating grant proposals with AI assistance.

## Commands

```bash
npm run dev              # Dev server on port 3000
npm run build            # Production build
npm run lint             # ESLint (strict, max-warnings 0)
npm run lint:fix         # Auto-fix linting
npm run type-check       # TypeScript checking
npm run format           # Prettier formatting
npm run test             # Vitest tests
npm run test:coverage    # Coverage report
```

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Routing:** React Router v6
- **State:** Zustand (client), React Query (server)
- **Forms:** React Hook Form
- **Styling:** Tailwind CSS + CSS Modules
- **HTTP:** Axios
- **Icons:** Lucide React
- **Docs Generation:** docx library for Word files

## Architecture

```
/src
  /pages                 # App pages (Home, Dashboard)
  /tools                 # Feature modules
    /proposal-writer     # Main feature - 4-step workflow
    /newsletter-generator
    /admin               # Prompt management, settings
    /auth                # Login, password reset
  /shared
    /components          # UI components, Layout, Navigation, ProtectedRoute
    /services            # API client, auth, token management
    /hooks               # useAuth, useToast, useConfirmation
    /contexts            # React contexts
```

## Proposal Writer

4-step workflow in `/tools/proposal-writer`:

1. **Step 1 - Information Consolidation:** Upload RFP, reference proposals, concept documents
2. **Step 2 - Concept Review:** Review AI analysis, edit concept document
3. **Step 3 - Structure & Workplan:** Generate AI proposal template, select sections
4. **Step 4 - Proposal Review:** Upload draft, get AI feedback, download with edits

### Key Files
- `ProposalWriterPage.tsx` - Main orchestrator, state management, step navigation
- `Step1-4*.tsx` - Individual step components
- `proposalService.ts` - All API calls for proposal operations
- `useProcessingResumption.ts` - Resumes polling after page refresh

### Invalidation Cascade
When documents change, downstream analyses are invalidated:
- RFP change → clears all analyses
- Concept change → clears concept analysis, structure, template, draft feedback
- Template regeneration → clears draft feedback

## Code Style

- No semicolons
- Single quotes
- 2-space indentation
- 100 char line width
- Path alias: `@/*` → `./src/*`

## Key Patterns

- **Polling for AI operations:** Long-running AI tasks use status polling (3s intervals, 5min timeout)
- **Toast notifications:** Use `useToast()` hook for user feedback
- **Protected routes:** Wrap with `ProtectedRoute` component
- **CSS Modules:** Component styles in `*.module.css` files
- **Dialogs:** Use `ConfirmDialog` component instead of native `confirm()`

## API

Base URL: `https://c37x0xp38k.execute-api.us-east-1.amazonaws.com/prod`

All API calls go through `proposalService.ts` which handles:
- Proposal CRUD operations
- File uploads (RFP, concept, reference docs)
- AI analysis triggers and polling
- Status checking for long-running operations
