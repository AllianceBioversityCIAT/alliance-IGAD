import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Upload, FileText, Users, Target } from 'lucide-react'
import styles from './ProposalWriterPage.module.css'

export function ProposalWriterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedFiles, setUploadedFiles] = useState<{[key: string]: File[]}>({})
  const [textInputs, setTextInputs] = useState<{[key: string]: string}>({})

  const steps = [
    { id: 1, title: 'Information Consolidation', completed: false },
    { id: 2, title: 'Content Review', completed: false },
    { id: 3, title: 'Structure & Validation', completed: false },
    { id: 4, title: 'Proposal Review', completed: false },
    { id: 5, title: 'Finalize', completed: false }
  ]

  const handleFileUpload = (section: string, files: FileList | null) => {
    if (files) {
      setUploadedFiles(prev => ({
        ...prev,
        [section]: Array.from(files)
      }))
    }
  }

  const handleTextChange = (section: string, value: string) => {
    setTextInputs(prev => ({
      ...prev,
      [section]: value
    }))
  }

  const renderStep1 = () => (
    <div className={styles.content}>
      <h2 className={styles.sectionTitle}>Information Consolidation</h2>
      <p style={{ marginBottom: '32px', color: '#6B7280' }}>
        Upload relevant documents and provide key information to help generate your proposal.
      </p>

      <div className={styles.grid}>
        {/* Project Documents Upload */}
        <div className={styles.uploadSection}>
          <div className={styles.uploadIcon}>
            <FileText size={48} />
          </div>
          <h3 className={styles.uploadTitle}>Project Documents</h3>
          <p className={styles.uploadDescription}>
            Upload project plans, research papers, or related documents
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => handleFileUpload('project-docs', e.target.files)}
            className={styles.hiddenInput}
            id="project-docs"
          />
          <label htmlFor="project-docs" className={styles.uploadButton}>
            Choose Files
          </label>
          {uploadedFiles['project-docs'] && (
            <div className={styles.fileList}>
              {uploadedFiles['project-docs'].map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <FileText size={16} />
                  {file.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Information Upload */}
        <div className={styles.uploadSection}>
          <div className={styles.uploadIcon}>
            <Target size={48} />
          </div>
          <h3 className={styles.uploadTitle}>Budget Information</h3>
          <p className={styles.uploadDescription}>
            Upload budget templates, cost estimates, or financial data
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.xls,.xlsx,.csv"
            onChange={(e) => handleFileUpload('budget-info', e.target.files)}
            className={styles.hiddenInput}
            id="budget-info"
          />
          <label htmlFor="budget-info" className={styles.uploadButton}>
            Choose Files
          </label>
          {uploadedFiles['budget-info'] && (
            <div className={styles.fileList}>
              {uploadedFiles['budget-info'].map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <Target size={16} />
                  {file.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team Information Upload */}
        <div className={styles.uploadSection}>
          <div className={styles.uploadIcon}>
            <Users size={48} />
          </div>
          <h3 className={styles.uploadTitle}>Team Information</h3>
          <p className={styles.uploadDescription}>
            Upload CVs, team profiles, or organizational charts
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFileUpload('team-info', e.target.files)}
            className={styles.hiddenInput}
            id="team-info"
          />
          <label htmlFor="team-info" className={styles.uploadButton}>
            Choose Files
          </label>
          {uploadedFiles['team-info'] && (
            <div className={styles.fileList}>
              {uploadedFiles['team-info'].map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <Users size={16} />
                  {file.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Text Input Sections */}
      <div className={styles.textSection}>
        <label className={styles.textLabel}>Project Overview</label>
        <textarea
          className={styles.textArea}
          placeholder="Provide a brief overview of your project, its objectives, and expected outcomes..."
          value={textInputs['project-overview'] || ''}
          onChange={(e) => handleTextChange('project-overview', e.target.value)}
        />
      </div>

      <div className={styles.textSection}>
        <label className={styles.textLabel}>Target Audience & Beneficiaries</label>
        <textarea
          className={styles.textArea}
          placeholder="Describe who will benefit from this project and how it will impact the agricultural sector..."
          value={textInputs['target-audience'] || ''}
          onChange={(e) => handleTextChange('target-audience', e.target.value)}
        />
      </div>

      <div className={styles.textSection}>
        <label className={styles.textLabel}>Funding Requirements</label>
        <textarea
          className={styles.textArea}
          placeholder="Specify the total funding needed, key budget categories, and funding timeline..."
          value={textInputs['funding-requirements'] || ''}
          onChange={(e) => handleTextChange('funding-requirements', e.target.value)}
        />
      </div>
    </div>
  )

  return (
    <Layout>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Proposal Writer</h1>
            <p className={styles.subtitle}>
              Create compelling funding proposals for agricultural projects and development initiatives
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className={styles.progressContainer}>
          <div className={styles.progressSteps}>
            {steps.map((step, index) => (
              <div key={step.id} className={styles.step}>
                <div className={`${styles.stepNumber} ${
                  step.id === currentStep ? styles.stepNumberActive :
                  step.completed ? styles.stepNumberCompleted : styles.stepNumberPending
                }`}>
                  {step.id}
                </div>
                <span className={`${styles.stepTitle} ${
                  step.id === currentStep ? styles.stepTitleActive :
                  step.completed ? styles.stepTitleCompleted : styles.stepTitlePending
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`${styles.stepConnector} ${
                    step.completed ? styles.stepConnectorCompleted : styles.stepConnectorPending
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {currentStep === 1 && renderStep1()}

          {/* Navigation Buttons */}
          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={currentStep === 1}
            >
              Previous
            </button>
            <button 
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => setCurrentStep(2)}
            >
              Next Step
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
