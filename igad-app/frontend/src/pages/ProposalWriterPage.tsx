import { useState } from 'react'

export function ProposalWriterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedFiles, setUploadedFiles] = useState<{[key: string]: File[]}>({})
  const [textInputs, setTextInputs] = useState<{[key: string]: string}>({})

  const steps = [
    { id: 1, title: 'Information Consolidation', completed: true },
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

  return (
    <div className="proposal-writer-page">
      {/* Left Sidebar - Progress & Navigation */}
      <div className="proposal-sidebar">
        <div className="proposal-header">
          <h2 className="proposal-title">Proposal Writer</h2>
        </div>

        <div className="proposal-progress">
          <div className="progress-label">Proposal Progress</div>
          <div className="progress-percentage">20%</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '20%' }}></div>
          </div>
          <div className="progress-step">Step 1 of 5</div>
        </div>

        <div className="steps-navigation">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={`step-item ${step.id === currentStep ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
            >
              <div className="step-number">{step.id}</div>
              <div className="step-title">{step.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="proposal-main">
        {/* Breadcrumb and Actions */}
        <div className="proposal-header-bar">
          <div className="breadcrumb">
            <span className="breadcrumb-back">←</span>
            <span className="breadcrumb-text">Proposal Writer</span>
          </div>
          <button className="prompt-manager-btn">Prompt Manager</button>
        </div>

        <div className="step-header">
          <h1 className="step-title">Step 1: Information Consolidation</h1>
          <p className="step-description">Gather all necessary content, RFPs, reference proposals, existing work, and initial concepts</p>
          <div className="step-progress-info">
            <span className="step-counter">Step 1 of 5</span>
          </div>
        </div>

        <div className="information-progress">
          <div className="progress-header">
            <h3 className="progress-title">Information Gathering Progress</h3>
            <div className="progress-counter">0/3 sections complete</div>
          </div>
          <div className="progress-bar-main">
            <div className="progress-fill-main" style={{ width: '0%' }}></div>
          </div>
        </div>

        <div className="content-sections">
          {/* RFP / Call for Proposals Section */}
          <div className="content-section">
            <div className="section-header">
              <div className="section-icon">📄</div>
              <div className="section-info">
                <h3 className="section-title">RFP / Call for Proposals</h3>
                <p className="section-description">Upload the official Request for Proposals document. This is essential for understanding donor requirements and evaluation criteria.</p>
              </div>
            </div>
            
            <div className="upload-area">
              <div className="upload-icon">📁</div>
              <p className="upload-text">Drop RFP file here or click to upload</p>
              <p className="upload-formats">Supports PDF, DOC, DOCX files up to 10MB</p>
              <button className="choose-file-btn">Choose File</button>
            </div>
            
            <div className="missing-document-warning">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">Missing RFP Document</span>
              <p className="warning-description">Upload your guidelines if not included in the main RFP document</p>
            </div>
          </div>

          {/* Reference Proposals Section */}
          <div className="content-section">
            <div className="section-header">
              <div className="section-icon">📋</div>
              <div className="section-info">
                <h3 className="section-title">Reference Proposals</h3>
                <p className="section-description">Upload successful proposals to this donor or similar calls. These help understand donor preferences and winning strategies.</p>
              </div>
            </div>
            
            <div className="upload-area">
              <div className="upload-icon">📁</div>
              <p className="upload-text">Drop reference proposals here or click to upload</p>
              <p className="upload-formats">Multiple files supported</p>
              <button className="choose-files-btn">Choose Files</button>
            </div>
          </div>

          {/* Existing Work & Experience Section */}
          <div className="content-section">
            <div className="section-header">
              <div className="section-icon">📊</div>
              <div className="section-info">
                <h3 className="section-title">Existing Work & Experience</h3>
                <p className="section-description">Describe your organization's relevant experience, ongoing projects, and previous work that relates to this call.</p>
              </div>
            </div>
            
            <div className="text-input-area">
              <textarea
                className="experience-textarea"
                placeholder="Describe your relevant experience, ongoing projects, previous work with similar donors, institutional strengths, partnerships, and any preliminary research or activities related to this call."
                value={textInputs.experience || ''}
                onChange={(e) => handleTextChange('experience', e.target.value)}
                rows={4}
              />
              <div className="character-count">
                <span className="current-count">{textInputs.experience?.length || 0}</span> characters
                <span className="max-count">Please provide more detail (minimum 50 characters)</span>
              </div>
            </div>

            <div className="supporting-documents">
              <h4 className="supporting-title">Supporting Documents (Optional)</h4>
              <p className="supporting-description">Upload additional documents like organizational profiles, previous project reports, or technical papers.</p>
              
              <div className="upload-area-small">
                <div className="upload-icon">📁</div>
                <p className="upload-text">Drop supporting files here</p>
                <button className="add-files-btn">Add Files</button>
              </div>
            </div>
          </div>

          {/* Initial Concept or Direction Section */}
          <div className="content-section">
            <div className="section-header">
              <div className="section-icon">💡</div>
              <div className="section-info">
                <h3 className="section-title">Initial Concept or Direction</h3>
                <p className="section-description">Share your initial ideas, approach, or hypothesis for this proposal. You can have formal or upload a document outlining your concept.</p>
              </div>
            </div>
            
            <div className="text-input-area">
              <textarea
                className="concept-textarea"
                placeholder="Describe your initial concept, proposed approach, target beneficiaries, expected outcomes, implementation strategy, or any specific insights."
                value={textInputs.concept || ''}
                onChange={(e) => handleTextChange('concept', e.target.value)}
                rows={6}
              />
              <div className="character-count">
                <span className="current-count">{textInputs.concept?.length || 0}</span> characters
                <span className="max-count">Please provide more detail about your concept (minimum 100 characters) or upload a document</span>
              </div>
            </div>

            <div className="concept-upload">
              <h4 className="upload-title">Or Upload Concept Document</h4>
              <p className="upload-description">Upload an existing Word document, PDF, or slide deck outlining your concept instead</p>
              
              <div className="upload-area-small">
                <div className="upload-icon">📁</div>
                <p className="upload-text">Drop concept document here</p>
                <button className="choose-file-btn">Choose File</button>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps Section */}
        <div className="next-steps">
          <h3 className="next-steps-title">Next Steps</h3>
          <p className="next-steps-description">Once you complete this information gathering, our AI will analyze your inputs and provide:</p>
          <ul className="next-steps-list">
            <li>Fill assessments between your work and RFP requirements</li>
            <li>Specific suggestions for strengthening your proposal</li>
            <li>Checklist of mandatory RFP items to address</li>
            <li>Team skills and roles analysis</li>
            <li>Project overview with objectives and milestones</li>
          </ul>
        </div>

        {/* Navigation Buttons */}
        <div className="step-navigation">
          <button className="btn-previous" disabled>
            ← Previous
          </button>
          <button className="btn-next">
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
