import { useEffect, useState } from 'react'
import { FileText, AlertTriangle } from 'lucide-react'
import { useProposal } from '../../hooks/useProposal'
import { StepProps } from './stepConfig'
import styles from './proposalWriter.module.css'
import { apiClient } from '../../services/apiClient'
import ManualRFPInput from '../../components/ManualRFPInput'

interface Step1Props extends StepProps {
  proposalId?: string
  rfpAnalysis?: any
}

function Step1Skeleton() {
  return (
    <div className={styles.stepContent}>
      <div className={styles.skeletonCard}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonInput}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonButton}`}></div>
      </div>
      
      <div className={styles.skeletonCard}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonInput}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonInput}`}></div>
      </div>
      
      <div className={styles.skeletonCard}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>
      </div>
    </div>
  )
}

export function Step1InformationConsolidation({ formData, setFormData, proposalId, rfpAnalysis }: Step1Props) {
  const { proposal, updateFormData, isUpdating, isLoading } = useProposal(proposalId)
  const [isUploadingRFP, setIsUploadingRFP] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')
  const [errorDetails, setErrorDetails] = useState<string>('')
  const [showManualInput, setShowManualInput] = useState(false)
  
  // Concept states
  const [isUploadingConcept, setIsUploadingConcept] = useState(false)
  const [isSavingConceptText, setIsSavingConceptText] = useState(false)
  const [conceptTextSaved, setConceptTextSaved] = useState(false)
  const [isEditingConceptText, setIsEditingConceptText] = useState(false)
  const [conceptUploadError, setConceptUploadError] = useState('')

  // Load data from localStorage or proposal when component mounts
  useEffect(() => {
    if (proposalId) {
      const storageKey = `proposal_draft_${proposalId}`
      const savedData = localStorage.getItem(storageKey)
      
      if (savedData) {
        // Load from localStorage if available
        try {
          const parsed = JSON.parse(savedData)
          setFormData(parsed)
        } catch (e) {
          console.error('Failed to parse saved proposal data:', e)
        }
      } else if (proposal) {
        // Otherwise load from proposal
        setFormData({
          uploadedFiles: proposal.uploaded_files || {},
          textInputs: proposal.text_inputs || {},
        })
      }
    }
  }, [proposalId, proposal, setFormData])

  // Save to localStorage whenever formData changes
  useEffect(() => {
    if (proposalId && (formData.uploadedFiles || formData.textInputs)) {
      const storageKey = `proposal_draft_${proposalId}`
      localStorage.setItem(storageKey, JSON.stringify(formData))
    }
  }, [formData, proposalId])

  // Show skeleton while loading (after all hooks)
  if (isLoading) {
    return <Step1Skeleton />
  }

  const handleFileUpload = async (section: string, files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0] // Take first file
      
      // Store just the filename, not the File object
      const updatedFiles = {
        ...formData.uploadedFiles,
        [section]: [file.name],
      }

      setFormData(prev => ({
        ...prev,
        uploadedFiles: updatedFiles,
      }))

      // Upload to S3 and create vectors if we have a proposal ID
      if (proposalId && section === 'rfp-document') {
        setIsUploadingRFP(true)
        try {
          // Create FormData for file upload
          const uploadFormData = new FormData()
          uploadFormData.append('file', file)
          
          console.log('Uploading document to:', `/api/proposals/${proposalId}/documents/upload`)
          console.log('File:', file.name, 'Size:', file.size)
          
          // Upload document - this will process and create vectors
          const response = await apiClient.post(
            `/api/proposals/${proposalId}/documents/upload`,
            uploadFormData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          )
          
          console.log('Document uploaded and vectorized:', response.data)
          
          // Clear any previous errors
          setUploadError('')
          
        } catch (error: any) {
          console.error('Failed to upload document:', error)
          
          const errorMessage = error.response?.data?.detail || error.message || 'Upload failed. Please try again.'
          setUploadError(errorMessage)
          
          // Remove the file from state on error
          setFormData(prev => ({
            ...prev,
            uploadedFiles: {
              ...prev.uploadedFiles,
              [section]: [],
            },
          }))
        } finally {
          setIsUploadingRFP(false)
        }
      }
      
      // Update proposal metadata with filename
      if (proposalId) {
        try {
          await updateFormData({
            uploadedFiles: updatedFiles,
            textInputs: formData.textInputs,
          })
        } catch (error) {
          console.error('Failed to save form data:', error)
        }
      }
    }
  }

  const handleManualTextSubmit = async (text: string) => {
    if (!proposalId) return
    
    setIsUploadingRFP(true)
    setShowManualInput(false)
    
    try {
      const formData = new FormData()
      formData.append('rfp_text', text)
      
      const response = await apiClient.post(
        `/api/proposals/${proposalId}/documents/upload-text`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      
      console.log('Manual text processed:', response.data)
      
      setUploadResult(response.data)
      setShowSuccess(true)
      setShowError(false)
      
    } catch (error: any) {
      console.error('Failed to process manual text:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error'
      setErrorDetails(errorMessage)
      setShowError(true)
    } finally {
      setIsUploadingRFP(false)
    }
  }

  const handleTextChange = async (section: string, value: string) => {
    const updatedInputs = {
      ...formData.textInputs,
      [section]: value,
    }

    setFormData(prev => ({
      ...prev,
      textInputs: updatedInputs,
    }))

    // Save to backend if we have a proposal ID (debounced)
    if (proposalId) {
      try {
        await updateFormData({
          uploadedFiles: formData.uploadedFiles,
          textInputs: updatedInputs,
        })
      } catch (error) {
        console.error('Failed to update form data:', error)
      }
    }
  }

  const getUploadedFileCount = (section: string) => {
    return formData.uploadedFiles[section]?.length || 0
  }

  const hasRequiredFiles = () => {
    const hasRFP = getUploadedFileCount('rfp-document') > 0
    const hasConcept = 
      (formData.textInputs['initial-concept'] || '').length >= 100 ||
      getUploadedFileCount('concept-document') > 0
    
    return hasRFP && hasConcept
  }

  const handleDeleteFile = async (section: string, fileIndex: number) => {
    const updatedFiles = { ...formData.uploadedFiles }
    const fileName = updatedFiles[section][fileIndex]
    
    console.log('🗑️ DELETE FILE:', {
      section,
      fileIndex,
      fileName,
      proposalId,
      allFiles: formData.uploadedFiles
    })
    
    // Remove from local state first for immediate UI feedback
    updatedFiles[section].splice(fileIndex, 1)
    
    setFormData(prev => ({
      ...prev,
      uploadedFiles: updatedFiles,
    }))

    // Delete from backend (S3 + DynamoDB) if we have a proposal ID
    if (proposalId) {
      try {
        // Import proposalService dynamically
        const { proposalService } = await import('../../services/proposalService')
        
        console.log('📡 Calling deleteDocument API:', {
          proposalId,
          fileName
        })
        
        // Delete from S3
        const deleteResult = await proposalService.deleteDocument(proposalId, fileName)
        
        console.log('✅ Delete API response:', deleteResult)
        
        // Update DynamoDB metadata
        await updateFormData({
          uploadedFiles: updatedFiles,
        })
        
        console.log(`✅ Deleted file from S3 and DynamoDB: ${fileName}`)
        
        // If deleting RFP document, also clear the analysis
        if (section === 'rfp-document' && window.location.pathname.includes('proposal-writer')) {
          // Clear rfpAnalysis from parent component
          // This will be handled by the parent ProposalWriterPage
          localStorage.removeItem(`proposal_rfp_analysis_${proposalId}`)
          window.dispatchEvent(new CustomEvent('rfp-deleted'))
          console.log('🧹 Cleared RFP analysis from localStorage')
        }
      } catch (error: any) {
        console.error('❌ Failed to delete file from backend:', error)
        console.error('❌ Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
        // Optionally: revert the local state change if backend deletion failed
        setUploadError('Failed to delete file from server')
      }
    }
  }

  // Concept handlers
  const handleSaveConceptText = async () => {
    const text = formData.textInputs['initial-concept'] || ''
    
    if (text.length < 100) {
      setConceptUploadError('Concept text must be at least 100 characters')
      return
    }
    
    if (!proposalId) return
    
    setIsSavingConceptText(true)
    setConceptUploadError('')
    
    try {
      const { proposalService } = await import('../../services/proposalService')
      await proposalService.saveConceptText(proposalId, text)
      
      setConceptTextSaved(true)
      setIsEditingConceptText(false)
      console.log('✅ Concept text saved successfully')
    } catch (error: any) {
      console.error('❌ Failed to save concept text:', error)
      setConceptUploadError(error.response?.data?.detail || 'Failed to save concept text')
    } finally {
      setIsSavingConceptText(false)
    }
  }

  const handleEditConceptText = () => {
    setIsEditingConceptText(true)
    setConceptTextSaved(false)
  }

  const handleDeleteConceptText = async () => {
    if (!confirm('Delete saved concept text?')) return
    if (!proposalId) return
    
    try {
      const { proposalService } = await import('../../services/proposalService')
      await proposalService.deleteConceptText(proposalId)
      
      setFormData(prev => ({
        ...prev,
        textInputs: { ...prev.textInputs, 'initial-concept': '' }
      }))
      
      setConceptTextSaved(false)
      setIsEditingConceptText(false)
      console.log('✅ Concept text deleted')
    } catch (error: any) {
      console.error('❌ Failed to delete concept text:', error)
      setConceptUploadError(error.response?.data?.detail || 'Failed to delete concept text')
    }
  }

  const handleConceptFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!proposalId) return
    
    const file = files[0]
    setIsUploadingConcept(true)
    setConceptUploadError('')
    
    try {
      const { proposalService } = await import('../../services/proposalService')
      await proposalService.uploadConceptFile(proposalId, file)
      
      // Update local state
      setFormData(prev => ({
        ...prev,
        uploadedFiles: {
          ...prev.uploadedFiles,
          'concept-document': [file.name]
        }
      }))
      
      console.log('✅ Concept file uploaded successfully')
    } catch (error: any) {
      console.error('❌ Failed to upload concept file:', error)
      setConceptUploadError(error.response?.data?.detail || 'Failed to upload concept file')
    } finally {
      setIsUploadingConcept(false)
    }
  }

  const handleDeleteConceptFile = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return
    if (!proposalId) return
    
    try {
      const { proposalService } = await import('../../services/proposalService')
      await proposalService.deleteConceptFile(proposalId, filename)
      
      setFormData(prev => ({
        ...prev,
        uploadedFiles: {
          ...prev.uploadedFiles,
          'concept-document': []
        }
      }))
      
      console.log('✅ Concept file deleted')
    } catch (error: any) {
      console.error('❌ Failed to delete concept file:', error)
      setConceptUploadError(error.response?.data?.detail || 'Failed to delete concept file')
    }
  }

  // Show skeleton until proposal is loaded
  if (!proposalId) {
    return (
      <div className={styles.mainContent}>
        <div className={styles.stepHeader}>
          <div className={styles.skeleton} style={{ height: '40px', width: '60%', marginBottom: '16px' }}></div>
          <div className={styles.skeleton} style={{ height: '20px', width: '80%' }}></div>
        </div>
        <div className={styles.skeleton} style={{ height: '150px', marginTop: '24px' }}></div>
        <div className={styles.skeleton} style={{ height: '200px', marginTop: '24px' }}></div>
      </div>
    )
  }

  return (
    <div className={styles.mainContent}>
      {/* Header */}
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>Step 1: Information Consolidation</h1>
        <p className={styles.stepMainDescription}>
          Gather all necessary context: RFPs, reference proposals, existing work, and initial
          concepts
        </p>
      </div>

      {/* Progress Card */}
      <div className={styles.progressCard}>
        <div className={styles.progressCardHeader}>
          <div className={styles.progressCardInfo}>
            <h3 className={styles.progressCardTitle}>Information Gathering Progress</h3>
            <p className={styles.progressCardDescription}>
              Complete RFP and Initial Concept sections to proceed with AI analysis
            </p>
          </div>
          <div className={styles.progressCardStats}>
            <span className={styles.progressCount}>
              {hasRequiredFiles() ? '2/2' : (getUploadedFileCount('rfp-document') > 0 ? '1/2' : '0/2')}
            </span>
            <span className={styles.progressLabel}>required sections complete</span>
          </div>
        </div>
        <div className={styles.progressCardBar}>
          <div
            className={styles.progressCardFill}
            style={{ width: hasRequiredFiles() ? '100%' : (getUploadedFileCount('rfp-document') > 0 ? '50%' : '1%') }}
          />
        </div>
      </div>

      {/* Next Steps Card */}
      <div className={styles.nextStepsCard}>
        <h3 className={styles.nextStepsTitle}>Next Steps</h3>
        <p className={styles.nextStepsDescription}>
          Once you complete this information gathering, our AI will analyze your inputs and provide:
        </p>
        <ul className={styles.nextStepsList}>
          <li>Fit assessment between your work and RFP requirements</li>
          <li>Specific suggestions for strengthening your proposal</li>
          <li>Checklist of mandatory RFP items to address</li>
          <li>Team skills and roles analysis</li>
          <li>Project roadmap with deadlines and milestones</li>
        </ul>
      </div>

      {/* RFP Upload Section */}
      <div className={styles.uploadSection}>
        <div className={styles.uploadSectionHeader}>
          <FileText className={styles.uploadSectionIcon} size={20} />
          <div className={styles.uploadSectionInfo}>
            <h3 className={styles.uploadSectionTitle}>RFP / Call for Proposals*</h3>
            <p className={styles.uploadSectionDescription}>
              Upload the official Request for Proposals document. This is essential for
              understanding donor requirements and evaluation criteria.
            </p>
          </div>
        </div>

        {/* Missing RFP Warning */}
        {!hasRequiredFiles() && (
          <div className={styles.warningCard}>
            <AlertTriangle className={styles.warningIcon} size={16} />
            <div className={styles.warningContent}>
              <p className={styles.warningTitle}>Missing RFP Document</p>
              <p className={styles.warningDescription}>
                Upload donor guidelines if not included in the main RFP document
              </p>
            </div>
          </div>
        )}

        {/* Upload Area */}
        {getUploadedFileCount('rfp-document') === 0 ? (
          <div className={styles.uploadArea}>
            {isUploadingRFP ? (
              <>
                <div className={styles.uploadingSpinner}>
                  <div className={styles.spinner}></div>
                </div>
                <p className={styles.uploadAreaTitle}>Uploading and processing...</p>
                <p className={styles.uploadAreaDescription}>
                  Please wait while we upload your document to secure storage
                </p>
              </>
            ) : (
              <>
                <FileText className={styles.uploadAreaIcon} size={48} />
                <p className={styles.uploadAreaTitle}>Drop RFP file here or click to upload</p>
                <p className={styles.uploadAreaDescription}>Supports PDF files up to 10MB</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => handleFileUpload('rfp-document', e.target.files)}
                  className={styles.hiddenInput}
                  id="rfp-document"
                  disabled={isUpdating || isUploadingRFP}
                />
                <label htmlFor="rfp-document" className={styles.uploadButton}>
                  {isUpdating ? 'Saving...' : 'Choose File'}
                </label>
              </>
            )}
          </div>
        ) : (
          <div className={styles.uploadedFileCard}>
            <div className={styles.uploadedFileHeader}>
              <div className={styles.uploadedFileInfo}>
                <div className={styles.uploadedFileIconWrapper}>
                  <FileText className={styles.uploadedFileIcon} size={24} />
                  <div className={styles.uploadedFileCheck}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="#10b981"/>
                      <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <p className={styles.uploadedFileName}>
                    {typeof formData.uploadedFiles['rfp-document']?.[0] === 'string' 
                      ? formData.uploadedFiles['rfp-document'][0]
                      : formData.uploadedFiles['rfp-document']?.[0]?.name || 'Document'}
                  </p>
                  <p className={styles.uploadedFileDescription}>
                    ✓ Document uploaded successfully • Ready for analysis
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteFile('rfp-document', 0)}
                className={styles.deleteFileButton}
                title="Delete and upload a different file"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M6 8v8m4-8v8m4-8v8M4 6h12M9 4h2a1 1 0 011 1v1H8V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className={styles.uploadedFileActions}>
              <label htmlFor="rfp-document-replace" className={styles.replaceFileButton}>
                Replace Document
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={e => {
                  handleDeleteFile('rfp-document', 0)
                  handleFileUpload('rfp-document', e.target.files)
                }}
                className={styles.hiddenInput}
                id="rfp-document-replace"
                disabled={isUpdating || isUploadingRFP}
              />
              {rfpAnalysis && (
                <p className={styles.replaceHint}>
                  ℹ️ Replacing will automatically trigger re-analysis
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Upload Error Message */}
        {uploadError && (
          <div className={styles.errorMessage}>
            <AlertTriangle size={16} />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Reference Proposals Section - TEMPORARILY DISABLED */}
      <div className={`${styles.uploadSection} ${styles.disabledSection}`}>
        <div className={styles.disabledBadge}>
          <span>Coming Soon</span>
        </div>
        <div className={styles.uploadSectionHeader}>
          <FileText className={styles.uploadSectionIcon} size={20} />
          <div className={styles.uploadSectionInfo}>
            <h3 className={styles.uploadSectionTitle}>Reference Proposals</h3>
            <p className={styles.uploadSectionDescription}>
              Upload successful proposals to this donor or similar calls. These help understand
              donor preferences and winning strategies.
            </p>
          </div>
        </div>

        <div className={`${styles.uploadArea} ${styles.uploadAreaDisabled}`}>
          <FileText className={styles.uploadAreaIcon} size={32} />
          <p className={styles.uploadAreaTitle}>Drop reference proposals here or click to upload</p>
          <p className={styles.uploadAreaDescription}>Multiple files supported</p>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            onChange={e => handleFileUpload('reference-proposals', e.target.files)}
            className={styles.hiddenInput}
            id="reference-proposals"
            disabled={true}
          />
          <label htmlFor="reference-proposals" className={`${styles.uploadButtonSecondary} ${styles.uploadButtonDisabled}`}>
            Choose Files
          </label>
        </div>
      </div>

      {/* Existing Work Section - TEMPORARILY DISABLED */}
      <div className={`${styles.uploadSection} ${styles.disabledSection}`}>
        <div className={styles.disabledBadge}>
          <span>Coming Soon</span>
        </div>
        <div className={styles.uploadSectionHeader}>
          <FileText className={styles.uploadSectionIcon} size={20} />
          <div className={styles.uploadSectionInfo}>
            <h3 className={styles.uploadSectionTitle}>Existing Work &amp; Experience</h3>
            <p className={styles.uploadSectionDescription}>
              Describe your organization's relevant experience, ongoing projects, and previous work
              that relates to this call.
            </p>
          </div>
        </div>

        <textarea
          className={`${styles.textArea} ${styles.textAreaDisabled}`}
          placeholder="Describe your relevant experience, ongoing projects, previous work with similar donors, institutional strengths, partnerships, and any preliminary research or activities related to this call..."
          value={formData.textInputs['existing-work'] || ''}
          onChange={e => handleTextChange('existing-work', e.target.value)}
          disabled={true}
        />

        <div className={styles.textAreaFooter}>
          <span className={styles.textAreaHint}>
            Please provide more detail (minimum 50 characters)
          </span>
          <span className={styles.textAreaCount}>
            {(formData.textInputs['existing-work'] || '').length} characters
          </span>
        </div>

        {/* Supporting Documents */}
        <div className={styles.supportingDocs}>
          <h4 className={styles.supportingDocsTitle}>Supporting Documents (Optional)</h4>
          <p className={styles.supportingDocsDescription}>
            Upload additional documents like organizational profiles, previous project reports, or
            technical papers.
          </p>

          <div className={`${styles.uploadAreaSmall} ${styles.uploadAreaDisabled}`}>
            <FileText className={styles.uploadAreaIcon} size={24} />
            <p className={styles.uploadAreaTitle}>Drop supporting files here</p>
            <input
              type="file"
              multiple
              onChange={e => handleFileUpload('supporting-docs', e.target.files)}
              className={styles.hiddenInput}
              id="supporting-docs"
              disabled={true}
            />
            <label htmlFor="supporting-docs" className={`${styles.uploadButtonSecondary} ${styles.uploadButtonDisabled}`}>
              Add Files
            </label>

            {/* Show uploaded files */}
            {getUploadedFileCount('supporting-docs') > 0 && (
              <div className={styles.fileList}>
                {formData.uploadedFiles['supporting-docs']?.map((file, index) => (
                  <div key={index} className={styles.fileItem}>
                    <FileText size={16} />
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Initial Concept Section */}
      <div className={styles.uploadSection}>
        <div className={styles.uploadSectionHeader}>
          <FileText className={styles.uploadSectionIcon} size={20} />
          <div className={styles.uploadSectionInfo}>
            <h3 className={styles.uploadSectionTitle}>Initial Concept or Direction*</h3>
            <p className={styles.uploadSectionDescription}>
              Outline your initial ideas, approach, or hypothesis for this proposal. You can write
              text or upload a document outlining your concept.
            </p>
          </div>
        </div>

        <textarea
          className={styles.textArea}
          placeholder="Describe your initial concept, proposed approach, target beneficiaries, expected outcomes, implementation strategy, or any specific innovations you plan to include..."
          value={formData.textInputs['initial-concept'] || ''}
          onChange={e => handleTextChange('initial-concept', e.target.value)}
          disabled={(conceptTextSaved && !isEditingConceptText) || isSavingConceptText}
        />

        <div className={styles.textAreaFooter}>
          <div>
            <span className={styles.textAreaHint}>
              Please provide more detail about your concept (minimum 100 characters)
            </span>
            <span className={styles.textAreaCount}>
              {(formData.textInputs['initial-concept'] || '').length} characters
            </span>
          </div>
          
          <div className={styles.textAreaActions}>
            {!conceptTextSaved ? (
              <button
                onClick={handleSaveConceptText}
                disabled={isSavingConceptText || (formData.textInputs['initial-concept'] || '').length < 100}
                className={styles.saveButton}
              >
                {isSavingConceptText ? 'Saving...' : 'Save Text'}
              </button>
            ) : (
              <>
                <span className={styles.savedIndicator}>✓ Text saved</span>
                <button onClick={handleEditConceptText} className={styles.editButton}>
                  Edit
                </button>
                <button onClick={handleDeleteConceptText} className={styles.deleteButton}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {conceptUploadError && (
          <div className={styles.errorMessage}>
            <AlertTriangle size={16} />
            <span>{conceptUploadError}</span>
          </div>
        )}

        {/* Upload Alternative */}
        <div className={styles.uploadAlternative}>
          <h4 className={styles.uploadAlternativeTitle}>Or Upload Concept Document</h4>
          <p className={styles.uploadAlternativeDescription}>
            Upload an existing Word document, PDF, or other file outlining your concept instead
          </p>

          {getUploadedFileCount('concept-document') === 0 ? (
            <div className={styles.uploadAreaSmall}>
              {isUploadingConcept ? (
                <>
                  <div className={styles.uploadingSpinner}>
                    <div className={styles.spinner}></div>
                  </div>
                  <p className={styles.uploadAreaTitle}>Uploading concept file...</p>
                </>
              ) : (
                <>
                  <FileText className={styles.uploadAreaIcon} size={24} />
                  <p className={styles.uploadAreaTitle}>Drop concept document here</p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={e => handleConceptFileUpload(e.target.files)}
                    className={styles.hiddenInput}
                    id="concept-document"
                    disabled={isUploadingConcept}
                  />
                  <label htmlFor="concept-document" className={styles.uploadButtonSecondary}>
                    {isUploadingConcept ? 'Uploading...' : 'Choose File'}
                  </label>
                </>
              )}
            </div>
          ) : (
            <div className={styles.uploadedFileCard}>
              <div className={styles.uploadedFileHeader}>
                <div className={styles.uploadedFileInfo}>
                  <div className={styles.uploadedFileIconWrapper}>
                    <FileText className={styles.uploadedFileIcon} size={24} />
                    <div className={styles.uploadedFileCheck}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="8" fill="#10b981"/>
                        <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className={styles.uploadedFileName}>
                      {typeof formData.uploadedFiles['concept-document']?.[0] === 'string' 
                        ? formData.uploadedFiles['concept-document'][0]
                        : formData.uploadedFiles['concept-document']?.[0]?.name || 'Document'}
                    </p>
                    <p className={styles.uploadedFileDescription}>
                      ✓ Concept document uploaded successfully
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteConceptFile(formData.uploadedFiles['concept-document'][0])}
                  className={styles.deleteFileButton}
                  title="Delete and upload a different file"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6 8v8m4-8v8m4-8v8M4 6h12M9 4h2a1 1 0 011 1v1H8V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual RFP Input Modal */}
      <ManualRFPInput
        isOpen={showManualInput}
        onClose={() => setShowManualInput(false)}
        onSubmit={handleManualTextSubmit}
        isProcessing={isUploadingRFP}
      />
    </div>
  )
}
