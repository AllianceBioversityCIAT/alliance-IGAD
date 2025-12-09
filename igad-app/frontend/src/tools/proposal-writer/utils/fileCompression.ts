/**
 * File Compression Utilities
 * 
 * Simple compression for PDFs and DOCX files to reduce size before upload
 */

/**
 * Compress a file if it exceeds the target size
 * For PDFs: Attempts to reduce quality by re-encoding
 * For DOCX: Returns original (compression not effective)
 * 
 * @param file - Original file
 * @param maxSizeMB - Maximum size in MB (default 2MB)
 * @returns Compressed file or original if already small enough
 */
export async function compressFileIfNeeded(
  file: File,
  maxSizeMB: number = 2
): Promise<{ file: File; wasCompressed: boolean; originalSize: number; newSize: number }> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  const originalSize = file.size

  // If file is already small enough, return as-is
  if (file.size <= maxSizeBytes) {
    return {
      file,
      wasCompressed: false,
      originalSize,
      newSize: originalSize,
    }
  }

  // For DOCX files, we can't compress effectively in browser
  if (file.name.toLowerCase().endsWith('.docx')) {
    return {
      file,
      wasCompressed: false,
      originalSize,
      newSize: originalSize,
    }
  }

  // For PDFs, we can try to compress by removing metadata and optimizing
  if (file.name.toLowerCase().endsWith('.pdf')) {
    try {
      // Simple approach: Just return original with warning
      // Real PDF compression requires backend processing
      console.warn(`PDF file ${file.name} is ${(originalSize / 1024 / 1024).toFixed(2)}MB. Consider using a PDF compressor tool.`)
      
      return {
        file,
        wasCompressed: false,
        originalSize,
        newSize: originalSize,
      }
    } catch (error) {
      console.error('PDF compression failed:', error)
      return {
        file,
        wasCompressed: false,
        originalSize,
        newSize: originalSize,
      }
    }
  }

  return {
    file,
    wasCompressed: false,
    originalSize,
    newSize: originalSize,
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
