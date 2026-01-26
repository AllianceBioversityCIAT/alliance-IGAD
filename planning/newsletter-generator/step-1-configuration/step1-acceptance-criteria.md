# Step 1: Configuration - Acceptance Criteria

**Testing Agent:** Antigravity (Chrome Integration)  
**Priority:** High  
**Estimated Test Time:** 30-45 minutes

---

## Test Environment Setup

### Prerequisites

1. Application deployed to testing environment
2. Valid user authentication
3. Access to `/newsletter-generator` route
4. Chrome browser with Antigravity integration

### Test Data

```
Test User: test@igad.int
Test URL: https://testing.igad-platform.com/newsletter-generator
```

---

## Functional Tests

### TC-1.1: Create New Newsletter

**Steps:**
1. Navigate to `/newsletter-generator`
2. Observe page behavior

**Expected Results:**
- [ ] New newsletter is automatically created
- [ ] URL changes to `/newsletter-generator/{newsletter_code}/step-1`
- [ ] Newsletter code format: `NL-YYYYMMDD-XXXX`
- [ ] Secondary navbar shows newsletter code
- [ ] Status badge shows "Draft"
- [ ] Sidebar shows Step 1 as active
- [ ] All form fields show default values

**Default Values:**
| Field | Expected Default |
|-------|------------------|
| Target Audience | None selected |
| Professional/Casual | 50 (center) |
| Technical/Approachable | 50 (center) |
| Format | Email Newsletter |
| Length | Mixed |
| Frequency | Weekly |
| Geographic Focus | Empty |

---

### TC-1.2: Target Audience Selection

**Steps:**
1. Click "Researchers" checkbox
2. Click "Policy makers" checkbox
3. Click "Researchers" checkbox again (deselect)
4. Verify visual feedback

**Expected Results:**
- [ ] Clicking checkbox toggles selection
- [ ] Selected items show blue border and background
- [ ] Check icon appears in selected items
- [ ] Deselecting removes visual indicators
- [ ] Multiple selections allowed
- [ ] Changes auto-save (no save button needed)

---

### TC-1.3: Tone Slider Interaction

**Steps:**
1. Drag Professional/Casual slider to 20%
2. Observe label change
3. Drag Professional/Casual slider to 80%
4. Observe label change
5. Drag Technical/Approachable slider

**Expected Results:**
- [ ] Slider moves smoothly on drag
- [ ] Value < 33: Shows "Professional" or "Technical" label
- [ ] Value 33-66: Shows "Balanced" label
- [ ] Value > 66: Shows "Casual" or "Approachable" label
- [ ] Changes auto-save

---

### TC-1.4: Dropdown Selection

**Steps:**
1. Click Format dropdown
2. Select "PDF Document"
3. Click Length dropdown
4. Select "Long (> 1000 words)"
5. Click Frequency dropdown
6. Select "Monthly"

**Expected Results:**
- [ ] Dropdowns open on click
- [ ] All options visible
- [ ] Selection updates immediately
- [ ] Dropdown closes after selection
- [ ] Changes auto-save

---

### TC-1.5: Geographic Focus Input

**Steps:**
1. Click geographic focus input
2. Type "East Africa - IGAD Region"
3. Click outside input

**Expected Results:**
- [ ] Input accepts text
- [ ] Text visible in field
- [ ] No character limit visible (but max 200 chars)
- [ ] Changes auto-save after typing stops

---

### TC-1.6: Auto-Save Functionality

**Steps:**
1. Select audience "Farmers"
2. Wait 2 seconds
3. Refresh the page

**Expected Results:**
- [ ] After refresh, "Farmers" is still selected
- [ ] All other changes are preserved
- [ ] No data loss on page refresh

---

### TC-1.7: Validation - Empty Audience

**Steps:**
1. Ensure no audience is selected
2. Click "Next" button

**Expected Results:**
- [ ] Error message appears: "Please select at least one target audience"
- [ ] Error is highlighted under audience section
- [ ] User stays on Step 1
- [ ] Toast notification may appear

---

### TC-1.8: Successful Step Completion

**Steps:**
1. Select at least one audience (e.g., "Researchers")
2. Adjust tone sliders (optional)
3. Select format, length, frequency
4. Click "Next" button

**Expected Results:**
- [ ] No validation errors
- [ ] Navigation to Step 2: `/newsletter-generator/{code}/step-2`
- [ ] Sidebar shows Step 1 as completed (checkmark)
- [ ] Sidebar shows Step 2 as active

---

### TC-1.9: Save and Close

**Steps:**
1. Make some configuration changes
2. Click "Save and close" button in navbar

**Expected Results:**
- [ ] Loading spinner appears on button
- [ ] Success toast: "Newsletter saved successfully"
- [ ] Redirect to Dashboard after ~500ms
- [ ] Newsletter appears in Dashboard list

---

### TC-1.10: Cancel Button

**Steps:**
1. Make some changes
2. Click "Cancel" button

**Expected Results:**
- [ ] Redirect to Dashboard
- [ ] Changes ARE saved (auto-save)
- [ ] Newsletter still exists in Dashboard

---

## UI/UX Tests

### TC-1.11: Loading State

**Steps:**
1. Navigate to existing newsletter URL
2. Observe loading behavior

**Expected Results:**
- [ ] Skeleton loaders appear during load
- [ ] Sidebar shows skeleton
- [ ] Form fields disabled while loading
- [ ] No flash of empty content

---

### TC-1.12: Responsive Design

**Steps:**
1. Resize browser to tablet width (768px)
2. Resize to mobile width (375px)

**Expected Results:**
- [ ] Layout adapts to screen size
- [ ] Audience grid changes columns (3 -> 2)
- [ ] Form remains usable
- [ ] No horizontal scrolling
- [ ] Navigation buttons accessible

---

### TC-1.13: Keyboard Navigation

**Steps:**
1. Tab through all form elements
2. Use Enter/Space to select checkboxes
3. Use arrow keys on sliders

**Expected Results:**
- [ ] All interactive elements focusable
- [ ] Focus indicators visible
- [ ] Checkboxes toggleable with keyboard
- [ ] Sliders adjustable with arrow keys

---

## Edge Cases

### TC-1.14: Network Error During Save

**Steps:**
1. Open DevTools Network tab
2. Set network to Offline
3. Make a change
4. Wait for debounce (500ms)
5. Observe error handling

**Expected Results:**
- [ ] Error toast appears: "Failed to save changes"
- [ ] Local state preserved
- [ ] User can retry when online

---

### TC-1.15: Newsletter Not Found

**Steps:**
1. Navigate to `/newsletter-generator/NL-00000000-XXXX/step-1`

**Expected Results:**
- [ ] Error message displayed
- [ ] Option to create new newsletter or return to dashboard

---

### TC-1.16: Session Expiry

**Steps:**
1. Open newsletter configuration
2. Wait for session to expire (or clear auth token)
3. Try to make a change

**Expected Results:**
- [ ] Redirect to login page
- [ ] After login, return to newsletter

---

## Performance Tests

### TC-1.17: Auto-Save Debounce

**Steps:**
1. Open Network tab in DevTools
2. Rapidly change audience selection (5+ times in 2 seconds)
3. Count PUT requests

**Expected Results:**
- [ ] Only 1-2 PUT requests (not 5+)
- [ ] Debounce working (500ms delay)

---

### TC-1.18: Page Load Time

**Steps:**
1. Clear browser cache
2. Navigate to newsletter Step 1
3. Measure time to interactive

**Expected Results:**
- [ ] Page loads in < 3 seconds
- [ ] Form interactive within 1 second after data loads

---

## API Tests (Backend Verification)

### TC-1.19: Verify DynamoDB Data

**Steps:**
1. Create newsletter and make changes
2. Check DynamoDB item directly

**Expected Results:**
- [ ] PK format: `NEWSLETTER#{newsletter_code}`
- [ ] SK: `METADATA`
- [ ] All fields stored correctly
- [ ] `updated_at` timestamp updated

---

## Test Summary Template

```
Test Run Date: _______________
Tester: Antigravity
Environment: Testing
Browser: Chrome

| Test ID | Test Name | Pass/Fail | Notes |
|---------|-----------|-----------|-------|
| TC-1.1  | Create New Newsletter | | |
| TC-1.2  | Target Audience Selection | | |
| TC-1.3  | Tone Slider Interaction | | |
| TC-1.4  | Dropdown Selection | | |
| TC-1.5  | Geographic Focus Input | | |
| TC-1.6  | Auto-Save Functionality | | |
| TC-1.7  | Validation - Empty Audience | | |
| TC-1.8  | Successful Step Completion | | |
| TC-1.9  | Save and Close | | |
| TC-1.10 | Cancel Button | | |
| TC-1.11 | Loading State | | |
| TC-1.12 | Responsive Design | | |
| TC-1.13 | Keyboard Navigation | | |
| TC-1.14 | Network Error During Save | | |
| TC-1.15 | Newsletter Not Found | | |
| TC-1.16 | Session Expiry | | |
| TC-1.17 | Auto-Save Debounce | | |
| TC-1.18 | Page Load Time | | |
| TC-1.19 | Verify DynamoDB Data | | |

Total Passed: ___/19
Total Failed: ___/19
Blocking Issues: _______________
```

---

## Blocking Criteria

Step 1 is **BLOCKED** if:
1. Cannot create new newsletter
2. Changes do not persist after refresh
3. Cannot proceed to Step 2 with valid data
4. Critical JavaScript errors in console
5. API returns 500 errors

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA (Antigravity) | | | |
| Product Owner | | | |
