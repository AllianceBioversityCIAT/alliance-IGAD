# Step 2 & 3 Merge - Testing Checklist

**Date:** 2025-12-08
**Tester:** _____________________

---

## ✅ Visual Testing

### Header Section
- [ ] Title "Step 2: Concept Review" displays correctly
- [ ] Blue "CONCEPT" badge shows
- [ ] Description text is readable

### Fit Assessment Card
- [ ] Green target icon displays
- [ ] "Fit Assessment" title shows
- [ ] Alignment level badge displays (e.g., "Very strong alignment")
- [ ] Justification text in gray box is readable

### Strong Aspects Card
- [ ] Green award icon displays
- [ ] "Strong Aspects of Your Proposal" title shows
- [ ] List items have green checkmarks
- [ ] All strong aspects display

### Sections Needing Elaboration
- [ ] Green sparkles icon displays
- [ ] "Sections Needing Elaboration" title shows
- [ ] Selection counter shows correct number (e.g., "3 sections selected")
- [ ] All sections render with checkboxes
- [ ] Priority badges show (Critical/Recommended/Optional)
- [ ] "See more" / "See less" buttons work

### Expanded Section Content
- [ ] "Details and Guidance" section displays
- [ ] "Suggestions" section with bullet list displays
- [ ] **"Your Comments" textarea displays** ✨ NEW
- [ ] Textarea accepts input
- [ ] Placeholder text shows

### Updated Concept Document Card (when document exists)
- [ ] Green file icon displays
- [ ] "Updated Concept Document" title shows
- [ ] Document content renders with proper markdown
- [ ] Headers (H1, H2, H3) styled correctly
- [ ] Lists render properly
- [ ] Download button displays
- [ ] Re-upload button displays
- [ ] Regenerate button displays

### Generate Button (when no document)
- [ ] "Generate Updated Concept" button shows when sections selected
- [ ] Button hidden when document exists
- [ ] Button disabled when no sections selected
- [ ] Green styling with sparkles icon

---

## ✅ Functional Testing

### Section Selection
- [ ] Click checkbox to select section
- [ ] Click again to deselect
- [ ] Selection counter updates correctly
- [ ] Multiple sections can be selected

### Section Expansion
- [ ] Click "See more" to expand section
- [ ] Click "See less" to collapse
- [ ] Multiple sections can be expanded simultaneously

### User Comments
- [ ] Type in comment textarea
- [ ] Text persists when collapsing/expanding section
- [ ] Comments save when navigating away
- [ ] Comments restore when returning to step
- [ ] Multiple sections can have different comments

### Document Download
- [ ] Click Download button
- [ ] DOCX file downloads
- [ ] File opens correctly in Word/LibreOffice
- [ ] Content matches displayed document
- [ ] Filename includes date

### Document Regeneration
- [ ] Select different sections
- [ ] Add/modify comments
- [ ] Click Regenerate button
- [ ] Loading state shows
- [ ] New document generates with updated content
- [ ] Comments are reflected in new document

### Initial Generation
- [ ] Select sections (no existing document)
- [ ] Add comments
- [ ] Click "Generate Updated Concept"
- [ ] Loading state shows
- [ ] Document generates successfully
- [ ] Comments are included in generated content

---

## ✅ Data Flow Testing

### State Management
- [ ] selectedSections syncs to parent component
- [ ] userComments syncs to parent component
- [ ] onConceptEvaluationChange callback fires with correct data
- [ ] Data structure includes both selectedSections and userComments

### Backend Integration
- [ ] API receives selectedSections array
- [ ] API receives userComments object
- [ ] Backend passes data to Prompt 3
- [ ] Generated document reflects user comments

### LocalStorage Persistence
- [ ] Navigate away from Step 2
- [ ] Return to Step 2
- [ ] Selected sections restored
- [ ] User comments restored
- [ ] Document state restored

---

## ✅ Navigation Testing

### Step Navigation
- [ ] Navigate from Step 1 to Step 2
- [ ] Step 2 loads correctly
- [ ] Navigate to Step 3 (should show Coming Soon)
- [ ] Navigate back to Step 2
- [ ] All state preserved

### Sidebar Progress
- [ ] Step 2 shows as current step
- [ ] Step 1 shows as completed
- [ ] Steps 3-4 show as upcoming
- [ ] Progress indicator accurate

---

## ✅ Responsive Testing

### Desktop (1920px)
- [ ] All elements aligned correctly
- [ ] Cards have proper spacing
- [ ] Text is readable
- [ ] Buttons are accessible

### Laptop (1366px)
- [ ] Layout adapts properly
- [ ] No horizontal scrolling
- [ ] All content visible

### Tablet (768px)
- [ ] Mobile styles apply
- [ ] Cards stack vertically
- [ ] Buttons full width
- [ ] Text remains readable

### Mobile (375px)
- [ ] All elements stack vertically
- [ ] Touch targets are large enough
- [ ] No content overflow
- [ ] Scrolling works smoothly

---

## ✅ Edge Cases

### Empty States
- [ ] No concept analysis: Shows empty state
- [ ] No sections: Handles gracefully
- [ ] No document: Generate button shows
- [ ] No comments: Works without comments

### Error Handling
- [ ] Network error during generation: Shows error message
- [ ] Invalid document format: Handles gracefully
- [ ] Missing RFP analysis: Shows appropriate error
- [ ] API timeout: User notified

### Performance
- [ ] Large documents (>10 pages): Renders smoothly
- [ ] Many sections (>20): All render without lag
- [ ] Long comments (>1000 chars): Saves correctly
- [ ] Multiple rapid clicks: No duplicate requests

---

## ✅ Backend Verification

### Prompt 3 Configuration
- [ ] Prompt exists in DynamoDB
- [ ] Contains `{{reference_proposals_analysis}}` placeholder
- [ ] Contains `{{existing_work_analysis}}` placeholder
- [ ] Instructions mention using user comments

### API Endpoints
- [ ] POST /api/proposals/{id}/analyze-step-2 works
- [ ] GET /api/proposals/{id}/analysis-status works
- [ ] POST /api/proposals/{id}/generate-concept-document works
- [ ] Endpoints receive userComments parameter

### Lambda Logs
- [ ] Concept evaluation logs show reference proposals analysis
- [ ] Logs show existing work analysis
- [ ] User comments appear in logs
- [ ] No errors in CloudWatch

---

## 🐛 Issues Found

| # | Issue Description | Severity | Status |
|---|-------------------|----------|--------|
| 1 |                   |          |        |
| 2 |                   |          |        |
| 3 |                   |          |        |

---

## 📝 Notes

_Add any additional observations or comments here:_

---

## ✅ Sign-off

- [ ] All critical tests passed
- [ ] All blockers resolved
- [ ] Ready for production

**Tested by:** _____________________  
**Date:** _____________________  
**Approved by:** _____________________  
**Date:** _____________________
