import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProposalLayout } from './components/ProposalLayout'
import { DraftConfirmationModal } from './components/DraftConfirmationModal'
import AnalysisProgressModal from '../../components/AnalysisProgressModal'
import { Step1InformationConsolidation } from './Step1InformationConsolidation'
import { Step2ContentGeneration } from './Step2ContentGeneration'
import { Step3StructureValidation } from './Step3StructureValidation'
import { Step4ReviewRefinement } from './Step4ReviewRefinement'
import { Step5FinalExport } from './Step5FinalExport'
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

  useEffect(() => {
    if (stepId) {
      if (stepId.startsWith('step-')) {
        const step = parseInt(stepId.replace('step-', ''))
        if (step >= 1 && step <= 5) {
          setCurrentStep(step)
          // Scroll to top when changing steps
          window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
          navigate('/proposal-writer/step-1', { replace: true })
        }
      } else {
        navigate('/proposal-writer/step-1', { replace: true })
      }
    } else {
      navigate('/proposal-writer/step-1', { replace: true })
    }
  }, [stepId, navigate])

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
    console.log('🔵 handleNextStep called - Current step:', currentStep, 'Has RFP Analysis:', !!rfpAnalysis)
    
    // If on Step 1 and trying to go to Step 2, analyze RFP first
    if (currentStep === 1 && !rfpAnalysis) {
      // Check if RFP is uploaded
      const hasRFP = formData.uploadedFiles['rfp-document']?.length > 0
      
      console.log('🔵 Step 1 → Step 2 transition, hasRFP:', hasRFP)
      
      if (!hasRFP) {
        alert('Please upload an RFP document before proceeding.')
        return
      }
      
      // Start RFP analysis and poll for completion
      console.log('🟢 Starting RFP analysis for proposal:', proposalId)
      setIsAnalyzingRFP(true)
      
      let pollInterval: NodeJS.Timeout | null = null
      let timeoutId: NodeJS.Timeout | null = null
      
      const cleanup = () => {
        if (pollInterval) clearInterval(pollInterval)
        if (timeoutId) clearTimeout(timeoutId)
        setIsAnalyzingRFP(false)
      }
      
      try {
        const { proposalService } = await import('../../services/proposalService')
        
        // Start analysis (now synchronous, returns result directly)
        console.log('📡 Calling proposalService.analyzeRFP...')
        const result = await proposalService.analyzeRFP(proposalId!)
        console.log('📡 Analysis result:', result)
        
        if (result.status === 'completed') {
          // Analysis completed successfully
          console.log('✅ Analysis completed!', result.rfp_analysis)
          setRfpAnalysis(result.rfp_analysis)
          cleanup()
          proceedToNextStep()
          return
        }
        
        // If still processing (shouldn't happen with sync), fall back to polling
        if (result.status === 'processing') {
          console.log('⏳ Starting polling for analysis completion...')
          // Poll for completion
          pollInterval = setInterval(async () => {
            try {
              const statusResult = await proposalService.getAnalysisStatus(proposalId!)
              console.log('📊 Polling status:', statusResult.status)
              
              if (statusResult.status === 'completed') {
                console.log('✅ Analysis completed!', statusResult.rfp_analysis)
                setRfpAnalysis(statusResult.rfp_analysis)
                cleanup()
                proceedToNextStep()
              } else if (statusResult.status === 'failed') {
                console.error('❌ Analysis failed:', statusResult.error)
                cleanup()
                alert(`Analysis failed: ${statusResult.error || 'Unknown error'}`)
              }
              // Otherwise keep polling (status === 'processing')
            } catch (pollError) {
              console.error('Polling error:', pollError)
              cleanup()
              alert('Failed to check analysis status. Please refresh and try again.')
            }
          }, 3000) // Poll every 3 seconds
          
          // Timeout after 5 minutes
          timeoutId = setTimeout(() => {
            console.warn('⏰ Analysis timeout')
            cleanup()
            alert('Analysis is taking longer than expected. Please try again later.')
          }, 300000) // 5 minutes
        }
        
      } catch (error) {
        console.error('RFP analysis failed:', error)
        cleanup()
        alert('Failed to start analysis. Please try again.')
      }
      
      return
    }
    
    // Normal navigation for other steps
    console.log('➡️ Normal navigation to next step')
    proceedToNextStep()
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      navigate(`/proposal-writer/step-${prevStep}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const renderCurrentStep = () => {
    const stepProps = {
      formData,
      setFormData,
      proposalId,
      rfpAnalysis,
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
      onClick={handleNextStep}
      disabled={
        currentStep === 5 || 
        isAnalyzingRFP || 
        (currentStep === 1 && (!formData.uploadedFiles['rfp-document'] || formData.uploadedFiles['rfp-document'].length === 0))
      }
      title={
        currentStep === 1 && (!formData.uploadedFiles['rfp-document'] || formData.uploadedFiles['rfp-document'].length === 0)
          ? 'Please upload an RFP document first'
          : ''
      }
    >
      {isAnalyzingRFP ? (
        <>
          <span className={styles.spinner}></span>
          Analyzing RFP...
        </>
      ) : currentStep === 5 ? (
        'Complete'
      ) : currentStep === 1 && rfpAnalysis ? (
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
      <AnalysisProgressModal isOpen={isAnalyzingRFP} />
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
