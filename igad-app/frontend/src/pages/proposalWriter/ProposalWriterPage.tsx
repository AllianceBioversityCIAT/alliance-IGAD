import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProposalLayout } from './components/ProposalLayout'
import { DraftConfirmationModal } from './components/DraftConfirmationModal'
import { Step1InformationConsolidation } from './Step1InformationConsolidation'
import { Step2ContentGeneration } from './Step2ContentGeneration'
import { Step3StructureValidation } from './Step3StructureValidation'
import { Step4ReviewRefinement } from './Step4ReviewRefinement'
import { Step5FinalExport } from './Step5FinalExport'
import { useProposals } from '../../hooks/useProposal'
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
  const [formData, setFormData] = useState({
    uploadedFiles: {} as { [key: string]: File[] },
    textInputs: {} as { [key: string]: string },
  })

  const { createProposal, isCreating, deleteProposal, isDeleting } = useProposals()

  // Create a proposal when the component mounts (only if authenticated)
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

  const handleNextStep = () => {
    if (currentStep < 5) {
      setCompletedSteps(prev => [...prev, currentStep])
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      navigate(`/proposal-writer/step-${nextStep}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
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
      disabled={currentStep === 5}
    >
      {currentStep === 5 ? 'Complete' : 'Next'}
      <ChevronRight size={16} />
    </button>,
  ]

  return (
    <>
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
