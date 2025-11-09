import { useEffect } from 'react'
import { FileText, AlertTriangle } from 'lucide-react'
import { useProposal } from '../../hooks/useProposal'
import { StepProps } from './stepConfig'
import styles from './proposalWriter.module.css'

interface Step1Props extends StepProps {
  proposalId?: string
}

export function Step1InformationConsolidation({ formData, setFormData, proposalId }: Step1Props) {
  const { proposal, updateFormData, isUpdating } = useProposal(proposalId)

  // Load existing data when proposal is loaded
  useEffect(() => {
    if (proposal) {
      setFormData({
        uploadedFiles: {}, // Files would need to be reconstructed from file names
        textInputs: proposal.text_inputs || {},
      })
    }
  }, [proposal, setFormData])

  const handleFileUpload = async (section: string, files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files)
      const updatedFiles = {
        ...formData.uploadedFiles,
        [section]: newFiles,
      }

      setFormData(prev => ({
        ...prev,
        uploadedFiles: updatedFiles,
      }))

      // Save to backend if we have a proposal ID
      if (proposalId) {
        try {
          await updateFormData({
            uploadedFiles: updatedFiles,
            textInputs: formData.textInputs,
          })
        } catch (error) {}
      }
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
      } catch (error) {}
    }
  }

  const getUploadedFileCount = (section: string) => {
    return formData.uploadedFiles[section]?.length || 0
  }

  const hasRequiredFiles = () => {
    return getUploadedFileCount('rfp-document') > 0
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
              Collect all necessary documents and context before AI analysis
            </p>
          </div>
          <div className={styles.progressCardStats}>
            <span className={styles.progressCount}>{hasRequiredFiles() ? '1' : '0'}/3</span>
            <span className={styles.progressLabel}>sections complete</span>
          </div>
        </div>
        <div className={styles.progressCardBar}>
          <div
            className={styles.progressCardFill}
            style={{ width: hasRequiredFiles() ? '33%' : '1%' }}
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
        <div className={styles.uploadArea}>
          <FileText className={styles.uploadAreaIcon} size={48} />
          <p className={styles.uploadAreaTitle}>Drop RFP file here or click to upload</p>
          <p className={styles.uploadAreaDescription}>Supports PDF, DOC, DOCX files up to 10MB</p>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={e => handleFileUpload('rfp-document', e.target.files)}
            className={styles.hiddenInput}
            id="rfp-document"
            disabled={isUpdating}
          />
          <label htmlFor="rfp-document" className={styles.uploadButton}>
            {isUpdating ? 'Saving...' : 'Choose File'}
          </label>

          {/* Show uploaded files */}
          {getUploadedFileCount('rfp-document') > 0 && (
            <div className={styles.fileList}>
              {formData.uploadedFiles['rfp-document']?.map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <FileText size={16} />
                  {file.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reference Proposals Section */}
      <div className={styles.uploadSection}>
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

        <div className={styles.uploadArea}>
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
            disabled={isUpdating}
          />
          <label htmlFor="reference-proposals" className={styles.uploadButtonSecondary}>
            {isUpdating ? 'Saving...' : 'Choose Files'}
          </label>

          {/* Show uploaded files */}
          {getUploadedFileCount('reference-proposals') > 0 && (
            <div className={styles.fileList}>
              {formData.uploadedFiles['reference-proposals']?.map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <FileText size={16} />
                  {file.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Existing Work Section */}
      <div className={styles.uploadSection}>
        <div className={styles.uploadSectionHeader}>
          <FileText className={styles.uploadSectionIcon} size={20} />
          <div className={styles.uploadSectionInfo}>
            <h3 className={styles.uploadSectionTitle}>Existing Work & Experience</h3>
            <p className={styles.uploadSectionDescription}>
              Describe your organization's relevant experience, ongoing projects, and previous work
              that relates to this call.
            </p>
          </div>
        </div>

        <textarea
          className={styles.textArea}
          placeholder="Describe your relevant experience, ongoing projects, previous work with similar donors, institutional strengths, partnerships, and any preliminary research or activities related to this call..."
          value={formData.textInputs['existing-work'] || ''}
          onChange={e => handleTextChange('existing-work', e.target.value)}
          disabled={isUpdating}
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

          <div className={styles.uploadAreaSmall}>
            <FileText className={styles.uploadAreaIcon} size={24} />
            <p className={styles.uploadAreaTitle}>Drop supporting files here</p>
            <input
              type="file"
              multiple
              onChange={e => handleFileUpload('supporting-docs', e.target.files)}
              className={styles.hiddenInput}
              id="supporting-docs"
              disabled={isUpdating}
            />
            <label htmlFor="supporting-docs" className={styles.uploadButtonSecondary}>
              {isUpdating ? 'Saving...' : 'Add Files'}
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
              Outline your initial ideas, approach, or hypothesis for this proposal. You can have
              formal or upload a document outlining your concept.
            </p>
          </div>
        </div>

        <textarea
          className={styles.textArea}
          placeholder="Describe your initial concept, proposed approach, target beneficiaries, expected outcomes, implementation strategy, or any specific innovations you plan to include..."
          value={formData.textInputs['initial-concept'] || ''}
          onChange={e => handleTextChange('initial-concept', e.target.value)}
          disabled={isUpdating}
        />

        <div className={styles.textAreaFooter}>
          <span className={styles.textAreaHint}>
            Please provide more detail about your concept (minimum 100 characters)
          </span>
          <span className={styles.textAreaCount}>
            {(formData.textInputs['initial-concept'] || '').length} characters
          </span>
        </div>

        {/* Upload Alternative */}
        <div className={styles.uploadAlternative}>
          <h4 className={styles.uploadAlternativeTitle}>Or Upload Concept Document</h4>
          <p className={styles.uploadAlternativeDescription}>
            Upload an existing Word document, PDF, or other file outlining your concept instead
          </p>

          <div className={styles.uploadAreaSmall}>
            <FileText className={styles.uploadAreaIcon} size={24} />
            <p className={styles.uploadAreaTitle}>Drop concept document here</p>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={e => handleFileUpload('concept-document', e.target.files)}
              className={styles.hiddenInput}
              id="concept-document"
              disabled={isUpdating}
            />
            <label htmlFor="concept-document" className={styles.uploadButtonSecondary}>
              {isUpdating ? 'Saving...' : 'Choose File'}
            </label>

            {/* Show uploaded files */}
            {getUploadedFileCount('concept-document') > 0 && (
              <div className={styles.fileList}>
                {formData.uploadedFiles['concept-document']?.map((file, index) => (
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
    </div>
  )
}
