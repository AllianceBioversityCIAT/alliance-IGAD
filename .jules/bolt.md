## 2024-05-23 - Performance Optimization: Markdown Parsing
**Learning:** Complex markdown parsing logic (regex, splitting, DOM element creation) was defined inside component render functions (e.g., `parseMarkdownToReact` inside `UpdatedConceptDocumentCard`). This caused the parser to be redefined and re-executed on every render, even if the content didn't change.
**Action:** Extracted the parsing logic to a shared utility `utils/markdownParser.tsx`. Used `useMemo` in components to memoize the parsing result, dependent only on the content string. This prevents unnecessary recalculations. Passed CSS module styles as an argument to the utility to maintain styling without tight coupling or circular dependencies.

## 2024-05-23 - Missing Tests Discrepancy
**Learning:** The user provided evidence (screenshot) of a rich test suite in `backend/tests/app/tools/proposal_writer`, but the local environment (and git branch `jules-...`) only contained empty `__init__.py` and `conftest.py`.
**Action:** Verified file system reality with `ls -R` and `find`. Acknowledged the discrepancy to the user but proceeded with static analysis and refactoring optimization that didn't require modifying the missing logic. When working in a potentially out-of-sync environment, rely on what is present but document what is missing.

## 2024-05-23 - Performance Optimization: String Concatenation in Loops
**Learning:** In Python, strings are immutable. Using `+=` in a loop to build a large string (e.g., extracting text from a multi-page PDF) has O(N²) time complexity because it creates a new string object in every iteration.
**Action:** Replaced `text += part` loops with `parts.append(part)` and `"".join(parts)`. This is the idiomatic and performant way to build strings in Python (O(N) complexity). Applied this to `concept_evaluation/service.py` for PDF and DOCX extraction.
