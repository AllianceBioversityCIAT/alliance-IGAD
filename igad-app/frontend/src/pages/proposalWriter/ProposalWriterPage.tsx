import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProposalLayout } from './components/ProposalLayout'
import { DraftConfirmationModal } from './components/DraftConfirmationModal'
import AnalysisProgressModal from '../../components/AnalysisProgressModal'
import { Step1InformationConsolidation } from './Step1InformationConsolidation'
import { Step2ContentGeneration } from './Step2ContentGeneration'
import Step3StructureValidation from './Step3StructureValidation'
import Step4ReviewRefinement from './Step4ReviewRefinement'
import Step5FinalExport from './Step5FinalExport'
import { useProposals } from '../../hooks/useProposal'
import { useProposalDraft } from '../../hooks/useProposalDraft'
import { authService } from '../../services/authService'
import styles from './proposalWriter.module.css'

export function ProposalWriterPage() {
  const { stepId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [proposalId, setProposalId] = useState<string>()
  const [proposalCode, setProposalCode] = useState<string>()
  const [showExitModal, setShowExitModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [isAnalyzingRFP, setIsAnalyzingRFP] = useState(false)
  const [rfpAnalysis, setRfpAnalysis] = useState<any>(null)
  const [conceptAnalysis, setConceptAnalysis] = useState<any>(null)
  const [analysisProgress, setAnalysisProgress] = useState<{ step: number; total: number; message: string } | null>(null)
  const [conceptEvaluationData, setConceptEvaluationData] = useState<{
    selectedSections: string[]
    userComments: { [key: string]: string }
  } | null>(null)
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false)
  const [conceptDocument, setConceptDocument] = useState<any>(null)
  const [formData, setFormData] = useState({
    uploadedFiles: {} as { [key: string]: File[] },
    textInputs: {} as { [key: string]: string },
  })

  const { createProposal, isCreating, deleteProposal, isDeleting } = useProposals()
  const { 
    saveProposalId, 
    saveProposalCode, 
    saveFormData, 
    saveRfpAnalysis, 
    loadDraft, 
    clearDraft 
  } = useProposalDraft()

  // Load from localStorage on mount
  useEffect(() => {
    const draft = loadDraft()
    
    if (draft.proposalId) setProposalId(draft.proposalId)
    if (draft.proposalCode) setProposalCode(draft.proposalCode)
    if (draft.formData) setFormData(draft.formData)
    if (draft.rfpAnalysis) setRfpAnalysis(draft.rfpAnalysis)
    
    // Load concept analysis from localStorage
    if (draft.proposalId) {
      const savedConceptAnalysis = localStorage.getItem(`proposal_concept_analysis_${draft.proposalId}`)
      if (savedConceptAnalysis) {
        try {
          setConceptAnalysis(JSON.parse(savedConceptAnalysis))
        } catch (e) {
          console.error('Failed to parse saved concept analysis:', e)
        }
      }
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (proposalId) saveProposalId(proposalId)
  }, [proposalId, saveProposalId])

  useEffect(() => {
    if (proposalCode) saveProposalCode(proposalCode)
  }, [proposalCode, saveProposalCode])

  useEffect(() => {
    saveFormData(formData)
  }, [formData, saveFormData])

  useEffect(() => {
    if (rfpAnalysis) saveRfpAnalysis(rfpAnalysis)
  }, [rfpAnalysis, saveRfpAnalysis])
  
  // Save concept analysis to localStorage
  useEffect(() => {
    if (conceptAnalysis && proposalId) {
      localStorage.setItem(`proposal_concept_analysis_${proposalId}`, JSON.stringify(conceptAnalysis))
    }
  }, [conceptAnalysis, proposalId])

  // Create a proposal when the component mounts (only if authenticated and no saved proposal)
  useEffect(() => {
    const isAuthenticated = authService.isAuthenticated()

    if (!proposalId && !isCreating && isAuthenticated) {
      createProposal(
        {
          title: `Proposal Draft - ${new Date().toLocaleDateString()}`,
          description: 'Draft proposal created from wizard',
        },
        {
          onSuccess: newProposal => {
            setProposalId(newProposal.id)
            setProposalCode(newProposal.proposalCode)
          },
          onError: (_error: unknown) => {
            // Handle error silently for now
          },
        }
      )
    }
  }, [proposalId, isCreating, createProposal])

  // Listen for RFP deletion event to clear analysis
  useEffect(() => {
    const handleRfpDeleted = () => {
      setRfpAnalysis(null)
      saveRfpAnalysis(null)
    }

    window.addEventListener('rfp-deleted', handleRfpDeleted)
    return () => window.removeEventListener('rfp-deleted', handleRfpDeleted)
  }, [saveRfpAnalysis])

  // Load concept document from proposal when available
  useEffect(() => {
    const loadConceptDocument = async () => {
      if (proposalId && currentStep === 3 && !conceptDocument) {
        try {
          console.log('🔍 Loading concept document for proposalId:', proposalId)
          const { proposalService } = await import('../../services/proposalService')
          const response = await proposalService.getProposal(proposalId)
          console.log('📡 API response:', response)
          
          // Handle both single proposal and array responses
          const proposal = Array.isArray(response) 
            ? response.find(p => p.id === proposalId) 
            : response
          
          console.log('🎯 Selected proposal:', proposal?.id, proposal?.proposalCode)
          
          if (proposal?.concept_document_v2) {
            console.log('✅ Found concept_document_v2, loading...')
            setConceptDocument(proposal.concept_document_v2)
          } else {
            console.log('⚠️ No concept_document_v2 in proposal:', proposal?.id)
          }
        } catch (error) {
          console.error('❌ Failed to load concept document:', error)
        }
      }
    }
    
    loadConceptDocument()
  }, [proposalId, currentStep, conceptDocument])

  useEffect(() => {
    if (stepId) {
      if (stepId.startsWith('step-')) {
        const step = parseInt(stepId.replace('step-', ''))
        if (step >= 1 && step <= 5) {
          if (currentStep !== step) {
            setCurrentStep(step)
            // Scroll to top when changing steps
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        } else {
          navigate('/proposal-writer/step-1', { replace: true })
        }
      } else {
        navigate('/proposal-writer/step-1', { replace: true })
      }
    } else {
      navigate('/proposal-writer/step-1', { replace: true })
    }
  }, [stepId, navigate, currentStep])

  // Block browser back/forward navigation
  useEffect(() => {
    if (!proposalId) return

    // Push a dummy state to prevent immediate back navigation
    window.history.pushState(null, '', window.location.pathname)

    const handlePopState = (e: PopStateEvent) => {
      // Push state back to keep user on page
      window.history.pushState(null, '', window.location.pathname)
      
      // Show confirmation modal
      setShowExitModal(true)
      setPendingNavigation(-1 as any) // Special marker for back button
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [proposalId])

  // Block navigation when leaving proposal writer with a draft
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (proposalId) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [proposalId])

  const handleKeepDraft = () => {
    setShowExitModal(false)
    
    if (pendingNavigation === -1) {
      // User clicked back button - go back
      window.history.back()
    } else if (pendingNavigation) {
      // User clicked a link - navigate there
      navigate(pendingNavigation)
    }
    
    setPendingNavigation(null)
  }

  const handleDeleteDraft = async () => {
    if (proposalId) {
      deleteProposal(proposalId, {
        onSuccess: () => {
          // Clear localStorage
          clearDraft()
          
          // Always redirect to home after deleting draft
          setShowExitModal(false)
          setPendingNavigation(null)
          
          // Navigate to home page
          navigate('/', { replace: true })
        },
        onError: () => {
          alert('Failed to delete draft. Please try again.')
        },
      })
    }
  }

  const handleNavigateAway = () => {
    if (proposalId) {
      setShowExitModal(true)
    }
  }

  // Helper function to proceed to next step
  const proceedToNextStep = useCallback(() => {
    if (currentStep < 5) {
      setCompletedSteps(prev => [...prev, currentStep])
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      navigate(`/proposal-writer/step-${nextStep}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep, navigate])

  const handleNextStep = async () => {
    console.log('🔵 handleNextStep called - Current step:', currentStep)
    
    // If on Step 1 and trying to go to Step 2, analyze RFP AND Concept
    if (currentStep === 1) {
      // Check required fields
      const hasRFP = formData.uploadedFiles['rfp-document']?.length > 0
      const hasConcept = 
        (formData.textInputs['initial-concept'] || '').length >= 100 ||
        formData.uploadedFiles['concept-document']?.length > 0
      
      console.log('🔵 Step 1 validation:', { hasRFP, hasConcept })
      
      if (!hasRFP) {
        alert('Please upload an RFP document before proceeding.')
        return
      }
      
      if (!hasConcept) {
        alert('Please provide an Initial Concept (text or file) before proceeding.')
        return
      }
      
      // If both analyses already exist, just proceed
      if (rfpAnalysis && conceptAnalysis) {
        console.log('✅ Both analyses already complete, proceeding to next step')
        proceedToNextStep()
        return
      }
      
      // Start sequential analysis
      console.log('🟢 Starting sequential analysis...')
      setIsAnalyzingRFP(true)
      setAnalysisProgress({ step: 1, total: 2, message: 'Analyzing RFP document...' })
      
      try {
        const { proposalService } = await import('../../services/proposalService')
        
        // STEP 1: RFP Analysis
        if (!rfpAnalysis) {
          console.log('📡 Step 1/2: Starting RFP analysis...')
          const rfpResult = await proposalService.analyzeRFP(proposalId!)
          
          if (rfpResult.status === 'processing') {
            // Poll for RFP completion
            await pollAnalysisStatus(
              () => proposalService.getAnalysisStatus(proposalId!),
              (result) => {
                setRfpAnalysis(result.rfp_analysis)
                return result.rfp_analysis
              },
              'RFP'
            )
          } else if (rfpResult.status === 'completed') {
            setRfpAnalysis(rfpResult.rfp_analysis)
          } else {
            throw new Error('Failed to start RFP analysis')
          }
        }
        
        // STEP 2: Concept Analysis
        console.log('📡 Step 2/2: Starting Concept analysis...')
        setAnalysisProgress({ step: 2, total: 2, message: 'Analyzing initial concept...' })
        
        if (!conceptAnalysis) {
          const conceptResult = await proposalService.analyzeConcept(proposalId!)
          
          if (conceptResult.status === 'processing') {
            // Poll for Concept completion
            await pollAnalysisStatus(
              () => proposalService.getConceptStatus(proposalId!),
              (result) => {
                setConceptAnalysis(result.concept_analysis)
                return result.concept_analysis
              },
              'Concept'
            )
          } else if (conceptResult.status === 'completed') {
            setConceptAnalysis(conceptResult.concept_analysis)
          } else {
            throw new Error('Failed to start Concept analysis')
          }
        }
        
        // Both analyses complete!
        console.log('✅ Sequential analysis completed!')
        setIsAnalyzingRFP(false)
        setAnalysisProgress(null)
        proceedToNextStep()
        
      } catch (error: any) {
        console.error('❌ Analysis failed:', error)
        setIsAnalyzingRFP(false)
        setAnalysisProgress(null)
        alert(`Analysis failed: ${error.message || 'Unknown error'}`)
      }
      
      return
    }
    
    // Normal navigation for other steps
    console.log('➡️ Normal navigation to next step')
    proceedToNextStep()
  }

  // Helper function to poll analysis status
  const pollAnalysisStatus = async (
    statusFn: () => Promise<any>,
    onSuccess: (result: any) => any,
    analysisName: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 100 // 5 minutes at 3 second intervals
      
      const poll = async () => {
        try {
          attempts++
          const status = await statusFn()
          
          console.log(`📊 ${analysisName} status (attempt ${attempts}):`, status.status)
          
          if (status.status === 'completed') {
            onSuccess(status)
            resolve()
          } else if (status.status === 'failed') {
            reject(new Error(status.error || `${analysisName} analysis failed`))
          } else if (attempts >= maxAttempts) {
            reject(new Error(`${analysisName} analysis timeout`))
          } else {
            // Continue polling
            setTimeout(poll, 3000)
          }
        } catch (error) {
          reject(error)
        }
      }
      
      poll()
    })
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      navigate(`/proposal-writer/step-${prevStep}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleGenerateConceptDocument = async () => {
    console.log('🟢 Starting concept document generation...')
    
    if (!proposalId || !conceptEvaluationData) {
      alert('Please select sections and add comments before generating')
      return
    }
    
    setIsGeneratingDocument(true)
    
    try {
      const { proposalService } = await import('../../services/proposalService')
      
      // Prepare concept evaluation
      // Prepare complete concept evaluation with all data
      const conceptEvaluation = {
        // Include complete original analysis
        fit_assessment: conceptAnalysis?.concept_analysis?.fit_assessment || conceptAnalysis?.fit_assessment,
        strong_aspects: conceptAnalysis?.concept_analysis?.strong_aspects || conceptAnalysis?.strong_aspects,
        sections_needing_elaboration: conceptAnalysis?.concept_analysis?.sections_needing_elaboration || conceptAnalysis?.sections_needing_elaboration,
        strategic_verdict: conceptAnalysis?.concept_analysis?.strategic_verdict || conceptAnalysis?.strategic_verdict,
        
        // Add user selections and comments
        selected_sections: conceptEvaluationData.selectedSections,
        user_comments: conceptEvaluationData.userComments,
        modified_at: new Date().toISOString()
      }
      
      console.log('📤 Sending concept evaluation:', conceptEvaluation)
      
      // Call API
      const result = await proposalService.generateConceptDocument(
        proposalId,
        conceptEvaluation
      )
      
      if (result.status === 'completed') {
        console.log('✅ Document generated successfully')
        setConceptDocument(result.concept_document)
        setIsGeneratingDocument(false)
        proceedToNextStep()
      } else {
        // Poll for completion
        await pollConceptDocumentStatus()
      }
      
    } catch (error: any) {
      console.error('❌ Concept document generation failed:', error)
      setIsGeneratingDocument(false)
      alert(`Generation failed: ${error.message || 'Unknown error'}`)
    }
  }

  const pollConceptDocumentStatus = async () => {
    const { proposalService } = await import('../../services/proposalService')
    
    let attempts = 0
    const maxAttempts = 60 // 3 minutes max
    
    const poll = async () => {
      attempts++
      
      try {
        const status = await proposalService.getConceptDocumentStatus(proposalId!)
        
        if (status.status === 'completed') {
          setConceptDocument(status.concept_document)
          setIsGeneratingDocument(false)
          proceedToNextStep()
        } else if (status.status === 'failed') {
          setIsGeneratingDocument(false)
          alert(`Generation failed: ${status.error}`)
        } else if (attempts >= maxAttempts) {
          setIsGeneratingDocument(false)
          alert('Generation timeout. Please try again.')
        } else {
          setTimeout(poll, 3000)
        }
      } catch (error) {
        setIsGeneratingDocument(false)
        alert('Failed to check generation status')
      }
    }
    
    poll()
  }

  const handleConceptEvaluationChange = useCallback((data: {
    selectedSections: string[]
    userComments: { [key: string]: string }
  }) => {
    setConceptEvaluationData(data)
  }, [])

  const renderCurrentStep = () => {
    console.log('🎯 Rendering step:', currentStep, {
      hasRfpAnalysis: !!rfpAnalysis,
      hasConceptAnalysis: !!conceptAnalysis,
      conceptAnalysisKeys: conceptAnalysis ? Object.keys(conceptAnalysis) : [],
      hasConceptDocument: !!conceptDocument,
      conceptDocumentKeys: conceptDocument ? Object.keys(conceptDocument) : []
    })
    
    const stepProps = {
      formData,
      setFormData,
      proposalId,
      rfpAnalysis,
      conceptAnalysis,
      onConceptEvaluationChange: handleConceptEvaluationChange,
      conceptDocument,
    }

    switch (currentStep) {
      case 1:
        return <Step1InformationConsolidation {...stepProps} />
      case 2:
        return <Step2ContentGeneration {...stepProps} />
      case 3:
        return <Step3StructureValidation {...stepProps} />
      case 4:
        return <Step4ReviewRefinement {...stepProps} />
      case 5:
        return <Step5FinalExport {...stepProps} />
      default:
        return <Step1InformationConsolidation {...stepProps} />
    }
  }

  const navigationButtons = [
    <button
      key="previous"
      className={`${styles.button} ${styles.buttonSecondary}`}
      disabled={currentStep === 1}
      onClick={handlePreviousStep}
    >
      <ChevronLeft size={16} />
      Previous
    </button>,
    <button
      key="next"
      className={`${styles.button} ${styles.buttonPrimary}`}
      onClick={currentStep === 2 ? handleGenerateConceptDocument : handleNextStep}
      disabled={
        currentStep === 5 || 
        isAnalyzingRFP ||
        isGeneratingDocument ||
        (currentStep === 1 && (
          !formData.uploadedFiles['rfp-document'] || 
          formData.uploadedFiles['rfp-document'].length === 0 ||
          (
            (formData.textInputs['initial-concept'] || '').length < 100 &&
            (!formData.uploadedFiles['concept-document'] || formData.uploadedFiles['concept-document'].length === 0)
          )
        ))
      }
      title={
        currentStep === 1 && (!formData.uploadedFiles['rfp-document'] || formData.uploadedFiles['rfp-document'].length === 0)
          ? 'Please upload an RFP document and provide an initial concept first'
          : ''
      }
    >
      {isGeneratingDocument ? (
        <>
          <span className={styles.spinner}></span>
          Generating Document...
        </>
      ) : isAnalyzingRFP ? (
        <>
          <span className={styles.spinner}></span>
          {analysisProgress ? `${analysisProgress.message} (${analysisProgress.step}/${analysisProgress.total})` : 'Analyzing...'}
        </>
      ) : currentStep === 5 ? (
        'Complete'
      ) : currentStep === 2 ? (
        <>
          Generate Updated Concept Document and Continue
          <ChevronRight size={16} />
        </>
      ) : currentStep === 1 && rfpAnalysis && conceptAnalysis ? (
        <>
          Next: View Analysis
          <ChevronRight size={16} />
        </>
      ) : currentStep === 1 ? (
        <>
          Analyze & Continue
          <ChevronRight size={16} />
        </>
      ) : (
        <>
          Next
          <ChevronRight size={16} />
        </>
      )}
    </button>,
  ]

  return (
    <>
      <AnalysisProgressModal 
        isOpen={isAnalyzingRFP || isGeneratingDocument} 
        progress={
          isGeneratingDocument 
            ? { step: 1, total: 1, message: 'Generating Updated Concept Document...' }
            : analysisProgress
        } 
      />
      <DraftConfirmationModal
        isOpen={showExitModal}
        proposalCode={proposalCode}
        onKeepDraft={handleKeepDraft}
        onDeleteDraft={handleDeleteDraft}
        isDeleting={isDeleting}
      />
      <ProposalLayout
        currentStep={currentStep}
        completedSteps={completedSteps}
        navigationButtons={navigationButtons}
        proposalCode={proposalCode}
        isLoadingProposal={isCreating}
        onNavigateAway={handleNavigateAway}
      >
        {renderCurrentStep()}
      </ProposalLayout>
    </>
  )
}
