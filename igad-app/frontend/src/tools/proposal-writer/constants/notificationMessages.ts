/**
 * Notification Messages for Proposal Writer
 *
 * Centralized message templates for toast notifications
 * Used across Step 1 Information Consolidation
 */

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  // File Uploads
  RFP_UPLOADED: {
    title: 'RFP Document Uploaded',
    message: 'Your RFP has been successfully uploaded and is ready for analysis.',
  },
  CONCEPT_FILE_UPLOADED: {
    title: 'Concept Document Uploaded',
    message: 'Your concept document has been uploaded successfully.',
  },
  REFERENCE_UPLOADED: {
    title: 'Reference Document Added',
    message: 'Reference proposal has been uploaded successfully.',
  },
  SUPPORTING_UPLOADED: {
    title: 'Supporting Document Added',
    message: 'Supporting document has been uploaded successfully.',
  },

  // Text Saves
  CONCEPT_TEXT_SAVED: {
    title: 'Concept Text Saved',
    message: 'Your concept text has been saved and is ready for analysis.',
  },
  WORK_TEXT_SAVED: {
    title: 'Work Experience Saved',
    message: 'Your existing work text has been saved successfully.',
  },

  // Deletions
  FILE_DELETED: {
    title: 'Document Deleted',
    message: 'The document has been removed successfully.',
  },
  CONCEPT_TEXT_DELETED: {
    title: 'Concept Text Deleted',
    message: 'Your concept text has been removed.',
  },
  WORK_TEXT_DELETED: {
    title: 'Work Text Deleted',
    message: 'Your work experience text has been removed.',
  },
} as const

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  // File Validation
  FILE_TOO_LARGE: (sizeMB: string, maxMB: number) => ({
    title: 'File Too Large',
    message: `File size (${sizeMB} MB) exceeds the maximum allowed size of ${maxMB} MB. Please select a smaller file.`,
  }),
  INVALID_FILE_TYPE: (extension: string, allowed: string[]) => ({
    title: 'Invalid File Type',
    message: `File type ${extension} is not supported. Please upload one of: ${allowed.join(', ')}`,
  }),

  // Text Validation
  CONCEPT_TEXT_TOO_SHORT: {
    title: 'Concept Too Short',
    message: 'Please provide at least 100 characters to describe your concept.',
  },
  WORK_TEXT_TOO_SHORT: {
    title: 'Text Too Short',
    message: 'Please provide at least 50 characters about your existing work.',
  },

  // Upload Failures
  RFP_UPLOAD_FAILED: {
    title: 'RFP Upload Failed',
    message: 'There was an error uploading your RFP document. Please try again.',
  },
  CONCEPT_UPLOAD_FAILED: {
    title: 'Concept Upload Failed',
    message: 'There was an error uploading your concept document. Please try again.',
  },
  REFERENCE_UPLOAD_FAILED: {
    title: 'Reference Upload Failed',
    message: 'There was an error uploading your reference document. Please try again.',
  },
  SUPPORTING_UPLOAD_FAILED: {
    title: 'Supporting Document Upload Failed',
    message: 'There was an error uploading your supporting document. Please try again.',
  },

  // Save Failures
  CONCEPT_TEXT_SAVE_FAILED: {
    title: 'Save Failed',
    message: 'Failed to save concept text. Please try again.',
  },
  WORK_TEXT_SAVE_FAILED: {
    title: 'Save Failed',
    message: 'Failed to save work experience text. Please try again.',
  },

  // Delete Failures
  FILE_DELETE_FAILED: {
    title: 'Delete Failed',
    message: 'Failed to delete file from server. Please try again.',
  },
  CONCEPT_TEXT_DELETE_FAILED: {
    title: 'Delete Failed',
    message: 'Failed to delete concept text. Please try again.',
  },
  WORK_TEXT_DELETE_FAILED: {
    title: 'Delete Failed',
    message: 'Failed to delete work text. Please try again.',
  },

  // Network Errors
  NETWORK_ERROR: {
    title: 'Network Error',
    message: 'Unable to connect to the server. Please check your connection and try again.',
  },

  // Generic
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
  },
} as const

// ============================================================================
// WARNING MESSAGES
// ============================================================================

export const WARNING_MESSAGES = {
  RFP_REQUIRED: {
    title: 'RFP Required',
    message: 'Please upload an RFP document before starting analysis.',
  },
  CONCEPT_REQUIRED: {
    title: 'Concept Required',
    message: 'Please provide concept text or upload a concept document before proceeding.',
  },
  UNSAVED_CHANGES: {
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Please save or discard them before continuing.',
  },
} as const

// ============================================================================
// INFO MESSAGES
// ============================================================================

export const INFO_MESSAGES = {
  PROCESSING: {
    title: 'Processing',
    message: 'Your document is being processed. This may take a moment.',
  },
  ANALYZING: {
    title: 'Analyzing Document',
    message: 'AI is analyzing your document to extract key information.',
  },
} as const
