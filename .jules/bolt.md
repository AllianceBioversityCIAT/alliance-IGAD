## 2026-01-28 - React Render Optimization
**Learning:** Defining expensive text processing functions (regex) inside a component's render scope causes unnecessary re-creation and re-execution on every render.
**Action:** Extract pure helper functions to module scope and use `useMemo` for derived data to ensure stability and performance.
