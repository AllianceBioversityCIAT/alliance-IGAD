import React, { useState } from 'react'
import { Upload, FileText } from 'lucide-react'
import styles from './step4.module.css'

const Step4ReviewRefinement: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = (file: File) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const maxSize = 20 * 1024 * 1024 // 20MB

    if (!validTypes.includes(file.type)) {
      alert('Please upload PDF, DOC, or DOCX files only')
      return
    }

    if (file.size > maxSize) {
      alert('File size must be less than 20MB')
      return
    }

    setSelectedFile(file)
    console.log('📄 File selected:', file.name)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <div className={styles.mainContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>Step 4: Proposal Review</h1>
        <p className={styles.stepMainDescription}>
          Upload your draft for AI feedback, download with edits, and iterate until ready
        </p>
      </div>

      <div className={styles.uploadCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Upload Your Draft Proposal</h3>
          <p className={styles.cardSubtitle}>
            In case you made adjustments to the downloaded Concept Document, please upload the new version here to take it into consideration.
          </p>
        </div>

        <div 
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''} ${selectedFile ? styles.dropZoneHasFile : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {selectedFile ? (
            <div className={styles.fileInfo}>
              <FileText size={48} color="#00A63E" />
              <p className={styles.fileName}>{selectedFile.name}</p>
              <p className={styles.fileSize}>
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button 
                className={styles.changeFileButton}
                onClick={() => {
                  setSelectedFile(null)
                  const input = document.getElementById('file-input') as HTMLInputElement
                  if (input) input.value = ''
                }}
              >
                Change File
              </button>
            </div>
          ) : (
            <>
              <Upload size={48} color="#99A1AF" />
              <p className={styles.dropText}>Drop your proposal file here or click to upload</p>
              <p className={styles.dropSubtext}>Supports PDF, DOC, DOCX files up to 20MB</p>
              <label htmlFor="file-input" className={styles.chooseFileButton}>
                Choose File
              </label>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Step4ReviewRefinement
