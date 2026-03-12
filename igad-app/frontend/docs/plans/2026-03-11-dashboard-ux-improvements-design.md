# Dashboard UX Improvements Design

## Quick Stats Cards

4 summary cards between header and controls bar:

- **Total Proposals** (FileText icon, gray) — count of all proposals
- **In Progress** (Clock icon, blue) — count of `draft` + `in_progress`
- **Under Review** (Eye icon, amber) — count of `review`
- **Completed** (CheckCircle icon, green) — count of `completed`

Cards are clickable: clicking filters the table to that status. Active card gets border highlight. Synced with the status dropdown filter.

## Enhanced Table

- **Sortable columns**: click headers to toggle asc/desc/default. Arrow indicator shows direction. Default sort: Last Updated descending.
- **Progress bar column**: new column between Status and Created. Thin bar showing 25/50/75/100% with "Step N of 4" text below.
- **Clickable rows**: whole row navigates to proposal. Delete button uses stopPropagation.
- **Classic pagination**: 10/25/50 per page selector, page numbers, prev/next buttons, "Showing X-Y of Z" text.

## Responsive Card View

Below 768px, table transforms to stacked cards with: title, code, status badge, progress bar, dates, action buttons.

## Data Flow

All client-side. Proposals fetched once; stats, filtering, sorting, pagination computed from in-memory array. No backend changes.

## Unchanged

- Header with green gradient and "Create New Proposal" button
- Search input + status dropdown
- Delete confirmation dialog
- Existing color scheme
