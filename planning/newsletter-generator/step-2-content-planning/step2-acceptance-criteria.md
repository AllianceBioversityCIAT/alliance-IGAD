# Step 2: Content Planning - Acceptance Criteria

## Overview

This document defines the acceptance criteria for Step 2 of the Newsletter Generator. All criteria must pass before the feature is considered complete.

---

## Functional Requirements

### FR-1: Configuration Summary Display

**Given** a user navigates to Step 2
**When** the page loads
**Then** they should see a summary card showing:
- Selected target audiences (as badges)
- Writing tone preset (label and description)
- Content length preference
- Publishing frequency

**Acceptance:**
- [ ] ConfigSummaryCard displays all Step 1 settings
- [ ] Values are read-only (no edit capability)
- [ ] "Edit in Step 1" link navigates back correctly

---

### FR-2: Topic Selection

**Given** a user is on the Step 2 page
**When** they interact with the topic selector
**Then** they should be able to:
- See all 12 information types grouped by category
- Toggle topics on/off with visual feedback
- See relevance indicators based on their target audience
- See recommended topics highlighted

**Acceptance:**
- [ ] All 12 topics displayed and toggleable
- [ ] Topics grouped by category (News, Insights, Opportunities, Resources)
- [ ] Category badges show correct colors (blue, purple, yellow, green)
- [ ] Relevance stars calculated correctly based on audience
- [ ] Recommended section shows topics with relevance >= 0.8
- [ ] Selection counter updates in real-time

---

### FR-3: Topic Auto-Save

**Given** a user selects or deselects a topic
**When** they make the change
**Then** the selection should be auto-saved to the backend

**Acceptance:**
- [ ] Topics save within 500ms of change (debounced)
- [ ] Saving indicator appears during save
- [ ] Error toast shown if save fails
- [ ] Selection persists on page refresh

---

### FR-4: Content Retrieval

**Given** a user has selected at least one topic
**When** they click "Retrieve Content"
**Then** the system should:
1. Show loading state
2. Call the Knowledge Base API
3. Display retrieved content when complete
4. Show error with retry option if failed

**Acceptance:**
- [ ] Button disabled if no topics selected
- [ ] Spinner shown during retrieval
- [ ] Success message with chunk count on completion
- [ ] Error message with retry button on failure
- [ ] Retrieved content stored in DynamoDB

---

### FR-5: Retrieval Progress Polling

**Given** a retrieval is in progress
**When** the frontend polls for status
**Then** it should poll every 2 seconds until completed or failed

**Acceptance:**
- [ ] Polling starts when retrieval triggered
- [ ] Polling interval is 2 seconds
- [ ] Polling stops on completion
- [ ] Polling stops on failure
- [ ] Polling stops on component unmount
- [ ] Timeout after 5 minutes with user message

---

### FR-6: Retrieved Content Preview

**Given** content retrieval has completed
**When** the user views the page
**Then** they should see a preview of retrieved content including:
- Number of chunks retrieved
- Sample content excerpts
- Source information when available

**Acceptance:**
- [ ] Shows total chunk count
- [ ] Displays up to 5 content excerpts
- [ ] "Show more" expands full list
- [ ] Content truncated at 150 characters
- [ ] Topic badge shown for each chunk

---

### FR-7: Configuration Change Detection

**Given** a user modifies Step 1 after completing Step 2
**When** they return to Step 2
**Then** they should see a warning that content needs to be re-retrieved

**Acceptance:**
- [ ] Warning shown when config differs from retrieval_config
- [ ] Config comparison includes: tone_preset, frequency, length_preference, target_audience
- [ ] "Re-retrieve Content" button shown
- [ ] Next button disabled until re-retrieval complete

---

### FR-8: Step Navigation

**Given** a user is on Step 2
**When** they interact with navigation
**Then**:
- "Previous" goes to Step 1
- "Next" goes to Step 3 (only if requirements met)

**Navigation Requirements:**
- [ ] Previous button always enabled
- [ ] Next button disabled if:
  - No topics selected
  - Retrieval not completed
  - No content retrieved
  - Config changed since last retrieval
- [ ] Next button enabled when all conditions met
- [ ] current_step updated to 3 on navigation

---

## Non-Functional Requirements

### NFR-1: Performance

- [ ] Page loads within 2 seconds
- [ ] Topic selection feels instant (< 100ms feedback)
- [ ] Retrieval completes within 30 seconds
- [ ] Polling does not cause visible lag

---

### NFR-2: Accessibility

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels on toggle buttons
- [ ] Screen reader announces status changes
- [ ] Color is not the only indicator of state

---

### NFR-3: Error Handling

- [ ] Network errors show user-friendly message
- [ ] Retry mechanism available for all failures
- [ ] No console errors during normal operation
- [ ] Graceful degradation if Knowledge Base unavailable

---

### NFR-4: Responsive Design

- [ ] Works on desktop (1024px+)
- [ ] Works on tablet (768px+)
- [ ] Topic cards stack on mobile
- [ ] No horizontal scroll

---

## Test Cases

### TC-1: Happy Path

1. Navigate to Step 2 with completed Step 1
2. Verify config summary shows correct values
3. Select 3 topics (one from each category)
4. Click "Retrieve Content"
5. Wait for completion
6. Verify content preview shows
7. Click "Next"
8. Verify navigation to Step 3

**Expected:** All steps complete without errors

---

### TC-2: No Topics Selected

1. Navigate to Step 2
2. Ensure no topics selected
3. Verify "Retrieve Content" button is disabled
4. Verify "Next" button is disabled
5. Select one topic
6. Verify buttons become enabled

**Expected:** Validation prevents proceeding without topics

---

### TC-3: Retrieval Failure

1. Navigate to Step 2
2. Select topics
3. Simulate network failure (offline)
4. Click "Retrieve Content"
5. Verify error message shows
6. Verify retry button appears
7. Restore network
8. Click retry
9. Verify successful retrieval

**Expected:** Error handled gracefully with recovery option

---

### TC-4: Config Change After Retrieval

1. Complete Step 2 with retrieval
2. Go back to Step 1
3. Change frequency from "weekly" to "monthly"
4. Return to Step 2
5. Verify warning message appears
6. Verify "Next" button disabled
7. Click "Re-retrieve Content"
8. Verify new retrieval completes
9. Verify "Next" enabled

**Expected:** Config changes detected and handled

---

### TC-5: Page Refresh During Retrieval

1. Start content retrieval
2. Refresh the page before completion
3. Verify page shows correct state
4. Wait for retrieval to complete
5. Verify content displays

**Expected:** State persists across refresh

---

### TC-6: Audience-Based Recommendations

1. In Step 1, select "Researchers" only
2. Navigate to Step 2
3. Verify "Research Findings" shows high relevance (★★★)
4. Verify "Livestock" shows low relevance (★☆☆)
5. Verify recommended section shows research-related topics

**Expected:** Relevance calculated correctly

---

### TC-7: Multiple Audience Selection

1. In Step 1, select "Researchers" and "Farmers"
2. Navigate to Step 2
3. Verify relevance scores are averaged
4. Verify recommendations consider both audiences

**Expected:** Multi-audience relevance works correctly

---

### TC-8: Keyboard Navigation

1. Tab to first topic
2. Press Space/Enter to toggle
3. Verify toggle works
4. Tab through all topics
5. Tab to "Retrieve Content" button
6. Press Enter to trigger retrieval

**Expected:** Full keyboard accessibility

---

## Edge Cases

### EC-1: Empty Knowledge Base Results

**Given** no content matches the query
**When** retrieval completes
**Then** show message "No relevant content found. Try selecting different topics."

---

### EC-2: Very Long Content Chunks

**Given** a chunk exceeds 500 characters
**When** displayed in preview
**Then** truncate with ellipsis and "Show full content" option

---

### EC-3: Special Characters in Content

**Given** content contains HTML or special characters
**When** displayed in preview
**Then** properly escaped and rendered safely

---

### EC-4: Concurrent Tab Access

**Given** user has Step 2 open in two tabs
**When** they modify topics in one tab
**Then** other tab should not corrupt data on refresh

---

### EC-5: Session Expiry During Retrieval

**Given** auth token expires during retrieval
**When** polling encounters 401 error
**Then** redirect to login with message "Session expired"

---

## Definition of Done

- [ ] All functional requirements implemented
- [ ] All test cases pass
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Backend endpoints tested with curl
- [ ] Frontend tested in Chrome, Firefox, Safari
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met
