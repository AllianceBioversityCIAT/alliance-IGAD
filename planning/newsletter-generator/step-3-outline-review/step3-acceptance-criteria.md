# Step 3: Outline Review - Acceptance Criteria

## Overview

This document defines the acceptance criteria for Step 3 of the Newsletter Generator. All criteria must pass before the feature is considered complete.

---

## Functional Requirements

### FR-1: Content Summary Display

**Given** a user navigates to Step 3
**When** the page loads
**Then** they should see a summary card showing:
- Selected topics from Step 2 (as badges)
- Total retrieved content chunks count
- Length preference from Step 1
- Retrieval completion timestamp

**Acceptance:**
- [ ] ContentSummaryCard displays all Step 2 data
- [ ] Topic badges show correct names
- [ ] Chunk count is accurate
- [ ] Values are read-only (no edit capability)
- [ ] "Edit in Step 2" link navigates back correctly

---

### FR-2: Outline Generation Trigger

**Given** a user is on Step 3 with completed Step 2
**When** they click "Generate Outline"
**Then** the system should:
1. Show processing state with spinner
2. Call the AI outline generation endpoint
3. Display generated outline when complete
4. Show error with retry option if failed

**Acceptance:**
- [ ] Generate button visible when outline_status is 'pending'
- [ ] Button disabled if Step 2 is incomplete
- [ ] Spinner shown during generation
- [ ] Success message on completion
- [ ] Error message with retry button on failure
- [ ] Generated sections stored in DynamoDB

---

### FR-3: Hierarchical Outline Display

**Given** an outline has been generated
**When** the user views the page
**Then** they should see:
- Collapsible sections (Introduction, Main Content, Updates & News, Conclusion)
- Items within each section with title and description
- Item count badges on section headers
- Custom item indicators where applicable

**Acceptance:**
- [ ] All sections display with correct names
- [ ] Sections are collapsible/expandable
- [ ] Item counts show correct numbers
- [ ] Custom items have visual badge
- [ ] Source count shows for items with content_sources
- [ ] Introduction and Main Content expanded by default

---

### FR-4: Inline Item Editing

**Given** a user views an outline item
**When** they click on the title or description
**Then** they should be able to:
- Edit the text inline
- See changes auto-saved (500ms debounce)
- Cancel edit with Escape key
- Save edit with Enter key or blur

**Acceptance:**
- [ ] Click activates edit mode for title
- [ ] Click activates edit mode for description
- [ ] Edit icon (✎) indicates editable items
- [ ] Saving indicator appears during save
- [ ] Changes persist on page refresh
- [ ] Validation shows for too-short text
- [ ] user_modifications.items_edited increments

---

### FR-5: Add Custom Item

**Given** a user wants to add custom content
**When** they click "+ Add Item" on a section
**Then** a modal should appear allowing them to:
- Enter a title (5-150 characters)
- Enter a description (10-500 characters)
- Optionally add user notes
- Save or cancel the addition

**Acceptance:**
- [ ] Add button visible in each section
- [ ] Modal opens with section name in header
- [ ] Title field validates min/max length
- [ ] Description field validates min/max length
- [ ] Character count shown for each field
- [ ] Cancel closes modal without changes
- [ ] Save adds item with is_custom: true
- [ ] New item appears at end of section
- [ ] user_modifications.items_added increments
- [ ] Toast confirms successful addition

---

### FR-6: Remove Item

**Given** a user wants to remove an item
**When** they click the remove button (×) on an item
**Then** the system should:
1. Show confirmation dialog
2. Remove item on confirmation
3. Update section item count
4. Prevent removal if it's the last item

**Acceptance:**
- [ ] Remove button visible on each item
- [ ] Confirmation dialog appears before deletion
- [ ] Item removed after confirmation
- [ ] Section item count updates
- [ ] Error message if trying to remove last item
- [ ] user_modifications.items_removed increments
- [ ] Toast confirms successful removal

---

### FR-7: Outline Regeneration

**Given** a user wants to start fresh
**When** they click "Regenerate Outline"
**Then** the system should:
1. Show warning if custom items exist
2. Preserve custom items option
3. Generate new outline via AI
4. Re-add custom items to appropriate sections

**Acceptance:**
- [ ] Regenerate button visible when outline exists
- [ ] Warning dialog if hasCustomItems is true
- [ ] Option to preserve or discard custom items
- [ ] Processing state during regeneration
- [ ] Custom items restored if preserved
- [ ] New AI-generated items replace old ones
- [ ] Status resets to 'processing' then 'completed'

---

### FR-8: Step Navigation

**Given** a user is on Step 3
**When** they interact with navigation
**Then**:
- "Previous" goes to Step 2
- "Next" goes to Step 4 (only if outline valid)

**Navigation Requirements:**
- [ ] Previous button always enabled
- [ ] Next button disabled if:
  - Outline not generated (status !== 'completed')
  - Any section has zero items
  - Any item has invalid title (< 5 chars)
  - Any item has invalid description (< 10 chars)
- [ ] Next button enabled when all conditions met
- [ ] current_step updated to 4 on navigation

---

## Non-Functional Requirements

### NFR-1: Performance

- [ ] Page loads within 2 seconds
- [ ] Inline editing feels instant (< 100ms feedback)
- [ ] Outline generation completes within 2 minutes
- [ ] Polling does not cause visible lag
- [ ] Auto-save completes within 1 second

---

### NFR-2: Accessibility

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels on buttons and inputs
- [ ] Screen reader announces status changes
- [ ] Modal has focus trap
- [ ] Escape key closes modal
- [ ] Collapsible sections use proper ARIA attributes

---

### NFR-3: Error Handling

- [ ] Network errors show user-friendly message
- [ ] Retry mechanism available for all failures
- [ ] No console errors during normal operation
- [ ] Graceful fallback if AI service unavailable
- [ ] Validation errors highlight specific fields
- [ ] Toast notifications for save success/failure

---

### NFR-4: Responsive Design

- [ ] Works on desktop (1024px+)
- [ ] Works on tablet (768px+)
- [ ] Outline sections stack on mobile
- [ ] Modal is scrollable on small screens
- [ ] No horizontal scroll

---

## Test Cases

### TC-1: Happy Path - Generate and Proceed

1. Navigate to Step 3 with completed Step 2
2. Verify content summary shows correct data
3. Click "Generate Outline"
4. Wait for completion
5. Verify outline displays with 4+ sections
6. Verify each section has items
7. Click "Next"
8. Verify navigation to Step 4

**Expected:** All steps complete without errors

---

### TC-2: Edit Item Title and Description

1. Navigate to Step 3 with completed outline
2. Click on an item title
3. Change the title text
4. Click outside (blur)
5. Verify saving indicator appears
6. Refresh page
7. Verify title change persisted
8. Repeat for description

**Expected:** Edits saved and persisted correctly

---

### TC-3: Add Custom Item to Section

1. Navigate to Step 3 with completed outline
2. Click "+ Add Item" on Main Content section
3. Enter title: "Custom Research Update"
4. Enter description: "A custom article about recent research findings."
5. Click "Add"
6. Verify modal closes
7. Verify new item appears in section
8. Verify "Custom" badge on item
9. Refresh page
10. Verify custom item still present

**Expected:** Custom item added and persisted

---

### TC-4: Remove Item with Verification

1. Navigate to Step 3 with outline having 3+ items in Main Content
2. Note initial item count
3. Click remove (×) on middle item
4. Confirm deletion in dialog
5. Verify item removed
6. Verify item count decremented
7. Refresh page
8. Verify item still removed

**Expected:** Item removed correctly with count update

---

### TC-5: Regenerate Outline with Custom Items

1. Add a custom item to Main Content
2. Click "Regenerate Outline"
3. Verify warning about custom items
4. Choose "Preserve custom items"
5. Wait for regeneration
6. Verify new AI items present
7. Verify custom item still present

**Expected:** Regeneration preserves custom items

---

### TC-6: Error - Step 2 Incomplete

1. Navigate directly to Step 3 URL (bypassing Step 2)
2. Verify warning message appears
3. Verify "Generate Outline" is disabled
4. Verify "Go to Step 2" link present
5. Click link
6. Verify navigation to Step 2

**Expected:** Step 2 completion enforced

---

### TC-7: Generation Failure with Retry

1. Navigate to Step 3 (simulate AI service error)
2. Click "Generate Outline"
3. Wait for failure
4. Verify error message displays
5. Verify retry button appears
6. Click retry (service restored)
7. Verify successful generation

**Expected:** Error handled gracefully with recovery

---

### TC-8: Page Refresh Resumes Polling

1. Start outline generation
2. Refresh page before completion
3. Verify polling resumes automatically
4. Wait for completion
5. Verify outline displays correctly

**Expected:** State persists across refresh

---

### TC-9: Validation - Invalid Item Text

1. Edit an item title
2. Enter only 2 characters
3. Try to save (blur)
4. Verify validation error appears
5. Verify "Next" button is disabled
6. Fix title to 10+ characters
7. Verify validation error clears
8. Verify "Next" button enabled

**Expected:** Validation enforced on item content

---

### TC-10: Cannot Remove Last Item

1. Create outline with only 1 item in a section
2. Try to remove that item
3. Verify error message: "Cannot remove the last item"
4. Verify item remains

**Expected:** Minimum item constraint enforced

---

## Edge Cases

### EC-1: No Retrieved Content (Empty Step 2)

**Given** Step 2 completed but no content was retrieved
**When** user navigates to Step 3
**Then** show message "No content available. Please retrieve content in Step 2."

---

### EC-2: All Items Removed from Section

**Given** user tries to remove all items from a section
**When** only one item remains
**Then** disable remove button or show error "Cannot remove the last item in a section"

---

### EC-3: Very Long Item Titles

**Given** AI generates a title exceeding 150 characters
**When** displayed in UI
**Then** truncate with ellipsis and show full title on hover

---

### EC-4: Session Expiry During Generation

**Given** auth token expires during AI generation
**When** polling encounters 401 error
**Then** redirect to login with message "Session expired. Please log in again."

---

### EC-5: Concurrent Edits in Multiple Tabs

**Given** user has Step 3 open in two tabs
**When** they edit different items in each tab
**Then** last write wins, no data corruption on refresh

---

### EC-6: AI Response Parsing Failure

**Given** AI returns malformed JSON
**When** backend tries to parse
**Then** set outline_status to 'failed' with error message "Failed to parse outline response"

---

### EC-7: Special Characters in Content

**Given** item title or description contains HTML/special characters
**When** displayed in UI
**Then** properly escaped and rendered safely (no XSS)

---

### EC-8: Network Disconnect During Save

**Given** network disconnects during auto-save
**When** connection restores
**Then** retry save automatically and show toast on success/failure

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
- [ ] Edge cases handled
- [ ] Prompt template stored in DynamoDB
- [ ] Integration with Step 2 data verified
- [ ] Integration with Step 4 navigation verified
