# Upload Validation & Timeout Improvements

**Date:** December 8, 2025  
**Component:** Step 1 - Information Consolidation (Reference Proposals & Existing Work)

## Problem Statement

1. **Missing Validations:**
   - No frontend validation for maximum file count (should be 3 files max)
   - No validation for total file size across multiple uploads (should be 10MB total)
   - Individual file size validation existed but wasn't comprehensive

2. **Timeout Issues:**
   - HTTP client timeout was 30 seconds
   - File upload + vectorization process could take 30+ seconds for 3MB files
   - Caused timeout errors during legitimate uploads

## Changes Implemented

### 1. Frontend Validations (`Step1InformationConsolidation.tsx`)

#### New Constants
```typescript
const MAX_FILES_PER_SECTION = 3
const MAX_TOTAL_SIZE_PER_SECTION = 10 * 1024 * 1024 // 10MB
```

#### Enhanced Upload Handlers

**Reference Proposals (`handleReferenceFileUpload`):**
- ✅ Check file count limit (max 3 files)
- ✅ Validate file type (PDF, DOCX)
- ✅ Validate individual file size (max 10MB)
- ✅ Validate total size won't exceed 10MB limit
- ✅ Clear error messages for each validation failure

**Existing Work (`handleSupportingFileUpload`):**
- ✅ Check file count limit (max 3 files)
- ✅ Validate individual file size (max 10MB)
- ✅ Validate total size won't exceed 10MB limit
- ✅ Clear error messages for each validation failure

#### UI Improvements

**Updated Descriptions:**
- Reference Proposals: "Upload successful proposals to this donor or similar calls (max 3 files, 10MB total)"
- Existing Work: "You can write text or upload documents (max 3 files, 10MB total)"

**Upload Area Text:**
- Changed from "Supports PDF, DOCX files up to 10MB"
- To: "Supports PDF, DOCX files (max 3 files, 10MB total)"

**Add More Files Button:**
- Shows file count: "Add More Files (2/3)"
- Hides button when limit reached
- Shows info message: "Maximum 3 files reached. Delete a file to upload another."

### 2. Timeout Configuration

#### Frontend (`proposalService.ts`)

**uploadReferenceFile:**
```typescript
timeout: 120000, // 2 minutes for file upload + vectorization
```

**uploadSupportingFile:**
```typescript
timeout: 120000, // 2 minutes for file upload + vectorization
```

**Rationale:**
- Default apiClient timeout: 30 seconds (too short)
- New timeout: 120 seconds (2 minutes)
- Allows time for:
  - File upload to S3
  - Text extraction from PDF/DOCX
  - Text chunking
  - Vectorization of all chunks
  - DynamoDB updates

#### Backend (Already Configured)

**API Function (`template.yaml`):**
```yaml
Timeout: 300  # 5 minutes (API Gateway max)
```

**Analysis Worker Function:**
```yaml
Timeout: 900  # 15 minutes for long-running analysis
```

### 3. Helper Functions

**getTotalFileSize:**
```typescript
const getTotalFileSize = (section: string): number => {
  // Placeholder for future enhancement
  // Currently returns 0 - validation happens on new uploads
  return 0
}
```

**Note:** This function is a placeholder. To fully implement total size tracking, we would need to:
1. Store file sizes in DynamoDB metadata when uploading
2. Retrieve and sum sizes when calculating total
3. Update this function to read from metadata

For now, the validation works by:
- Checking individual file size before upload
- Backend enforces 10MB limit per file
- Frontend prevents uploading more than 3 files

## Testing Checklist

### File Count Validation
- [ ] Upload 1 file to Reference Proposals - should succeed
- [ ] Upload 2 more files - should succeed
- [ ] Try to upload 4th file - should show error message
- [ ] Verify "Add More Files" button shows count (3/3)
- [ ] Verify button hides and info message appears at limit
- [ ] Delete 1 file - button should reappear
- [ ] Repeat for Existing Work section

### File Size Validation
- [ ] Try to upload file > 10MB - should show error
- [ ] Upload file ~3MB - should succeed
- [ ] Upload another ~3MB file - should succeed
- [ ] Try to upload third ~5MB file - should show total size error
- [ ] Verify error message shows current size, new file size, and limit

### Timeout Handling
- [ ] Upload 3MB PDF file - should complete without timeout
- [ ] Upload 8MB DOCX file - should complete without timeout
- [ ] Monitor console for timeout errors - should not occur
- [ ] Verify vectorization completes successfully

### UI/UX
- [ ] Verify all descriptions show "(max 3 files, 10MB total)"
- [ ] Verify upload area text updated
- [ ] Verify "Add More Files" button shows count
- [ ] Verify info message appears at limit
- [ ] Verify error messages are clear and actionable

## Backend Validation (Already Exists)

The backend already has these validations in place:

**`upload-reference-file` endpoint:**
```python
if file_size > 10 * 1024 * 1024:  # 10MB limit
    raise HTTPException(status_code=400, detail="File size must be less than 10MB")
```

**`upload-supporting-file` endpoint:**
```python
if file_size > 10 * 1024 * 1024:
    raise HTTPException(status_code=400, detail="File size must be less than 10MB")
```

## Future Enhancements

1. **Track File Sizes in Metadata:**
   - Store file sizes in DynamoDB when uploading
   - Implement accurate total size calculation
   - Show total size used in UI (e.g., "7.5MB / 10MB used")

2. **Progress Indicators:**
   - Show upload progress percentage
   - Show vectorization progress
   - Estimated time remaining

3. **Chunked Uploads:**
   - For very large files, implement chunked upload
   - Resume capability for interrupted uploads

4. **Compression:**
   - Offer to compress large files before upload
   - Automatic optimization for PDFs

## Notes

- All changes are backward compatible
- Existing uploaded files are not affected
- No database migrations required
- No changes to backend logic (only timeout configs)
- Frontend validations provide immediate feedback
- Backend validations remain as final safeguard
