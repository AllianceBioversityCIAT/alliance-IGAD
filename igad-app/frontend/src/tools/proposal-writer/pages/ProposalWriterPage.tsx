import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProposalLayout } from '../components/ProposalLayout'
import { DraftConfirmationModal } from '../components/DraftConfirmationModal'
import AnalysisProgressModal from '@/tools/proposal-writer/components/AnalysisProgressModal'
import { Step1InformationConsolidation } from './Step1InformationConsolidation'
import { Step2ContentGeneration } from './Step2ContentGeneration'
import Step3StructureValidation from './Step3StructureValidation'
import Step4ReviewRefinement from './Step4ReviewRefinement'
import Step5FinalExport from './Step5FinalExport'
import { useProposals } from '@/tools/proposal-writer/hooks/useProposal'
import { useProposalDraft } from '@/tools/proposal-writer/hooks/useProposalDraft'
import { authService } from '@/shared/services/authService'
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
  const [analysisProgress, setAnalysisProgress] = useState<{
    step: number
    total: number
    message: string
  } | null>(null)
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

  const allowNavigation = useRef(false)

  const { createProposal, isCreating, deleteProposal, isDeleting } = useProposals()
  const { saveProposalId, saveProposalCode, saveFormData, saveRfpAnalysis, loadDraft, clearDraft } =
    useProposalDraft()

  // Load from localStorage on mount
  useEffect(() => {
    const draft = loadDraft()

    if (draft.proposalId) {
      setProposalId(draft.proposalId)
    }
    if (draft.proposalCode) {
      setProposalCode(draft.proposalCode)
    }
    if (draft.formData) {
      setFormData(draft.formData)
    }
    if (draft.rfpAnalysis) {
      setRfpAnalysis(draft.rfpAnalysis)
    }

    // Load concept analysis from localStorage
    if (draft.proposalId) {
      const savedConceptAnalysis = localStorage.getItem(
        `proposal_concept_analysis_${draft.proposalId}`
      )
      if (savedConceptAnalysis) {
        try {
          const parsed = JSON.parse(savedConceptAnalysis)

          // Unwrap if nested (concept_analysis.concept_analysis)
          let unwrapped = parsed?.concept_analysis || parsed
          if (unwrapped?.concept_analysis) {
            console.log('🔍 Initial load - Found nested concept_analysis, unwrapping...')
            unwrapped = unwrapped.concept_analysis
          }

          setConceptAnalysis(unwrapped)
        } catch (e) {
          console.error('Failed to parse saved concept analysis:', e)
        }
      }

      // Load concept document from localStorage
      const savedConceptDocument = localStorage.getItem(
        `proposal_concept_document_${draft.proposalId}`
      )
      if (savedConceptDocument) {
        try {
          setConceptDocument(JSON.parse(savedConceptDocument))
        } catch (e) {
          console.error('Failed to parse saved concept document:', e)
        }
      }

      // Load concept evaluation data from localStorage
      const savedConceptEvaluation = localStorage.getItem(
        `proposal_concept_evaluation_${draft.proposalId}`
      )
      if (savedConceptEvaluation) {
        try {
          setConceptEvaluationData(JSON.parse(savedConceptEvaluation))
        } catch (e) {
          console.error('Failed to parse saved concept evaluation:', e)
        }
      }
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (proposalId) {
      saveProposalId(proposalId)
    }
  }, [proposalId, saveProposalId])

  useEffect(() => {
    if (proposalCode) {
      saveProposalCode(proposalCode)
    }
  }, [proposalCode, saveProposalCode])

  useEffect(() => {
    saveFormData(formData)
  }, [formData, saveFormData])

  useEffect(() => {
    if (rfpAnalysis) {
      saveRfpAnalysis(rfpAnalysis)
    }
  }, [rfpAnalysis, saveRfpAnalysis])

  // Save concept analysis to localStorage
  useEffect(() => {
    if (conceptAnalysis && proposalId) {
      localStorage.setItem(
        `proposal_concept_analysis_${proposalId}`,
        JSON.stringify(conceptAnalysis)
      )
    }
  }, [conceptAnalysis, proposalId])

  // Save concept document to localStorage
  useEffect(() => {
    if (conceptDocument && proposalId) {
      localStorage.setItem(
        `proposal_concept_document_${proposalId}`,
        JSON.stringify(conceptDocument)
      )
    }
  }, [conceptDocument, proposalId])

  // Save concept evaluation data to localStorage
  useEffect(() => {
    if (conceptEvaluationData && proposalId) {
      localStorage.setItem(
        `proposal_concept_evaluation_${proposalId}`,
        JSON.stringify(conceptEvaluationData)
      )
    }
  }, [conceptEvaluationData, proposalId])

  // Calculate completed steps based on available data
  useEffect(() => {
    const completed: number[] = []

    // Step 1 is completed if we have RFP uploaded
    if (formData.uploadedFiles['rfp-document']?.length > 0) {
      completed.push(1)
    }

    // Step 2 is completed if we have concept analysis
    if (conceptAnalysis) {
      completed.push(2)
    }

    // Step 3 is completed if we have concept document
    if (conceptDocument) {
      completed.push(3)
    }

    // Only update if different to avoid infinite loops
    if (JSON.stringify(completed) !== JSON.stringify(completedSteps)) {
      setCompletedSteps(completed)
    }
  }, [formData.uploadedFiles, conceptAnalysis, conceptDocument])

  // Detect RFP changes and invalidate analyses
  useEffect(() => {
    if (proposalId) {
      // Listen for RFP deletion events
      const handleRfpDeleted = () => {
        console.log('🔄 RFP deleted - invalidating analyses')
        setRfpAnalysis(null)
        setConceptAnalysis(null)
        setConceptDocument(null)
        setConceptEvaluationData(null)
        localStorage.removeItem(`proposal_rfp_analysis_${proposalId}`)
        localStorage.removeItem(`proposal_concept_analysis_${proposalId}`)
        localStorage.removeItem(`proposal_concept_document_${proposalId}`)
        localStorage.removeItem(`proposal_concept_evaluation_${proposalId}`)
      }

      window.addEventListener('rfp-deleted', handleRfpDeleted)
      return () => window.removeEventListener('rfp-deleted', handleRfpDeleted)
    }
  }, [proposalId])

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
          const { proposalService } = await import(
            '@/tools/proposal-writer/services/proposalService'
          )
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

  // Load concept evaluation from DynamoDB when entering Step 3
  useEffect(() => {
    const loadConceptEvaluation = async () => {
      if (proposalId && currentStep === 3) {
        try {
          console.log('🔍 Loading concept evaluation for Step 3:', proposalId)
          const { proposalService } = await import(
            '@/tools/proposal-writer/services/proposalService'
          )
          const response = await proposalService.getConceptEvaluation(proposalId)

          if (response?.concept_evaluation) {
            console.log('✅ Loaded concept evaluation from DynamoDB')
            setConceptAnalysis(response.concept_evaluation)
          }
        } catch (error) {
          console.log('⚠️ No saved concept evaluation found, using localStorage')
          // Fallback to localStorage is already handled
        }
      }
    }

    loadConceptEvaluation()
  }, [proposalId, currentStep])

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
    if (!proposalId) {
      return
    }

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
      // Only block if we actually have a proposal draft
      if (proposalId) {
        console.log('⚠️ Blocking navigation - draft exists')
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
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
    console.log('🚨 handleNavigateAway called!')
    console.log('   allowNavigation.current:', allowNavigation.current)
    console.log('   proposalId:', proposalId)

    // Only show modal if navigation is not explicitly allowed
    if (proposalId && !allowNavigation.current) {
      console.log('   ➡️ Showing exit modal')
      setShowExitModal(true)
    } else {
      console.log('   ➡️ Navigation allowed, not showing modal')
    }
  }

  // Helper function to proceed to next step
  const proceedToNextStep = useCallback(() => {
    console.log('⏭️ proceedToNextStep called - allowNavigation:', allowNavigation.current)

    if (currentStep < 5) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      navigate(`/proposal-writer/step-${nextStep}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })

      // Reset allowNavigation after navigation completes
      // Use longer delay to ensure navigation is fully processed
      setTimeout(() => {
        console.log('🔒 Resetting allowNavigation to FALSE')
        allowNavigation.current = false
      }, 500) // Increased from 100ms to 500ms
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
        const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')

        // STEP 1: RFP Analysis
        if (!rfpAnalysis) {
          console.log('📡 Step 1/2: Starting RFP analysis...')
          const rfpResult = await proposalService.analyzeRFP(proposalId!)

          if (rfpResult.status === 'processing') {
            // Poll for RFP completion
            await pollAnalysisStatus(
              () => proposalService.getAnalysisStatus(proposalId!),
              result => {
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
              result => {
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

    // Step 3: Download document before proceeding
    if (currentStep === 3 && conceptDocument) {
      console.log('📥 Step 3: Downloading document before proceeding')
      await handleDownloadConceptDocument()
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

  const handleGenerateConceptDocument = async (overrideData?: {
    selectedSections: string[]
    userComments: { [key: string]: string }
  }) => {
    console.log('🟢 Starting concept document generation...')
    console.log('📋 Override data:', overrideData)
    console.log('📋 Concept evaluation data:', conceptEvaluationData)

    // Use override data if provided (from Step 3 regeneration), otherwise use conceptEvaluationData
    const evaluationData = overrideData || conceptEvaluationData

    console.log('📋 Final evaluation data to use:', evaluationData)
    console.log(
      `   Selected sections (${evaluationData?.selectedSections?.length || 0}):`,
      evaluationData?.selectedSections
    )

    // If concept document already exists and no override, just proceed to next step
    if (conceptDocument && !overrideData) {
      console.log('✅ Concept document already exists, proceeding to next step')
      proceedToNextStep()
      return
    }

    if (!proposalId || !evaluationData) {
      alert('Please select sections and add comments before generating')
      return
    }

    setIsGeneratingDocument(true)

    try {
      const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')

      // Prepare concept evaluation
      // Unwrap conceptAnalysis if it comes wrapped from backend
      let unwrappedAnalysis = conceptAnalysis?.concept_analysis || conceptAnalysis

      // Check if there's another level of nesting (concept_analysis.concept_analysis)
      if (unwrappedAnalysis?.concept_analysis) {
        console.log('🔍 Found nested concept_analysis, unwrapping again...')
        unwrappedAnalysis = unwrappedAnalysis.concept_analysis

        // Update the state with unwrapped version for Step 2
        setConceptAnalysis(unwrappedAnalysis)
      }

      console.log('🔍 Unwrapped concept analysis:', unwrappedAnalysis)

      // Filter sections to include ONLY the ones user selected
      const allSections = unwrappedAnalysis?.sections_needing_elaboration || []
      console.log(`📊 All sections from concept analysis: ${allSections.length}`)
      console.log(
        '📊 Section names:',
        allSections.map((s: any) => s.section)
      )
      const filteredSections = allSections
        .filter(section => evaluationData.selectedSections.includes(section.section))
        .map(section => ({
          ...section,
          selected: true, // Mark as selected
          // Add user comment if provided
          user_comment: evaluationData.userComments[section.section] || '',
        }))

      // Mark all sections with selected flag
      const allSectionsWithSelection = allSections.map(section => ({
        ...section,
        selected: evaluationData.selectedSections.includes(section.section),
        user_comment: evaluationData.userComments[section.section] || '',
      }))

      console.log(
        `📊 Total sections: ${allSections.length}, Selected: ${allSectionsWithSelection.filter(s => s.selected).length}`
      )

      const conceptEvaluation = {
        concept_analysis: {
          // Include complete original analysis (already unwrapped)
          fit_assessment: unwrappedAnalysis?.fit_assessment,
          strong_aspects: unwrappedAnalysis?.strong_aspects,
          // Include ALL sections with selected flags and comments
          sections_needing_elaboration: allSectionsWithSelection,
          strategic_verdict: unwrappedAnalysis?.strategic_verdict,
        },
        status: 'completed',
      }

      console.log('📤 Sending concept evaluation:', conceptEvaluation)

      // Step 1: Save concept evaluation to DynamoDB
      console.log('💾 Saving concept evaluation to DynamoDB...')

      // Prepare update payload in the format expected by the endpoint
      const userComments: Record<string, string> = {}
      allSectionsWithSelection.forEach(section => {
        if (section.user_comment) {
          userComments[section.section] = section.user_comment
        }
      })

      const updatePayload = {
        selected_sections: allSectionsWithSelection.map(section => ({
          title: section.section,
          selected: section.selected,
          analysis: section.analysis,
          alignment_level: section.alignment_level,
          suggestions: section.suggestions,
        })),
        user_comments: Object.keys(userComments).length > 0 ? userComments : undefined,
      }

      const updateResult = await proposalService.updateConceptEvaluation(proposalId, updatePayload)
      console.log('✅ Concept evaluation saved to DynamoDB')

      // Update local state with saved concept evaluation
      // Keep the existing structure, just update the sections
      const updatedConceptAnalysis = {
        concept_analysis:
          updateResult.concept_evaluation?.concept_analysis || updateResult.concept_evaluation,
        status: 'completed',
      }
      console.log('📊 Updated conceptAnalysis:', updatedConceptAnalysis)
      setConceptAnalysis(updatedConceptAnalysis)

      // Step 2: Generate concept document
      const result = await proposalService.generateConceptDocument(proposalId, conceptEvaluation)

      if (result.status === 'completed') {
        console.log('✅ Document generated successfully')
        setConceptDocument(result.concept_document)
        setIsGeneratingDocument(false)
        // Only proceed to next step if not regenerating from Step 3
        if (!overrideData) {
          proceedToNextStep()
        }
      } else {
        // Poll for completion
        await pollConceptDocumentStatus(!!overrideData)
      }
    } catch (error: any) {
      console.error('❌ Concept document generation failed:', error)
      setIsGeneratingDocument(false)
      alert(`Generation failed: ${error.message || 'Unknown error'}`)
    }
  }

  const pollConceptDocumentStatus = async (isRegenerating = false) => {
    const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')

    let attempts = 0
    const maxAttempts = 60 // 3 minutes max

    const poll = async () => {
      attempts++

      try {
        const status = await proposalService.getConceptDocumentStatus(proposalId!)

        if (status.status === 'completed') {
          setConceptDocument(status.concept_document)
          setIsGeneratingDocument(false)
          // Only proceed to next step if not regenerating
          if (!isRegenerating) {
            proceedToNextStep()
          }
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

  const handleConceptEvaluationChange = useCallback(
    (data: { selectedSections: string[]; userComments: { [key: string]: string } }) => {
      setConceptEvaluationData(data)
    },
    []
  )

  const parseMarkdownToHTML = (markdown: string): string => {
    let formatted = markdown

    // Headers
    formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    formatted = formatted.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    formatted = formatted.replace(/^# (.*$)/gim, '<h1>$1</h1>')

    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')

    // Code
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')

    // Lists
    formatted = formatted.replace(/^\- (.*$)/gim, '<li>$1</li>')
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br/>')

    return formatted
  }

  const handleDownloadConceptDocument = async () => {
    console.log('🔽 Downloading concept document...')

    try {
      let content = ''

      console.log('📄 conceptDocument type:', typeof conceptDocument)
      console.log(
        '📄 conceptDocument keys:',
        conceptDocument ? Object.keys(conceptDocument) : 'null'
      )

      // Extract content from conceptDocument
      if (typeof conceptDocument === 'string') {
        content = conceptDocument
      } else if (conceptDocument?.generated_concept_document) {
        content = conceptDocument.generated_concept_document
      } else if (conceptDocument?.content) {
        content = conceptDocument.content
      } else if (conceptDocument?.document) {
        content = conceptDocument.document
      } else if (conceptDocument?.proposal_outline) {
        const outline = conceptDocument.proposal_outline
        if (Array.isArray(outline)) {
          content = outline
            .map(section => {
              const title = section.section_title || ''
              const purpose = section.purpose || ''
              const wordCount = section.recommended_word_count || ''
              const questions = Array.isArray(section.guiding_questions)
                ? section.guiding_questions.map(q => `- ${q}`).join('\n')
                : ''

              return `## ${title}\n\n**Purpose:** ${purpose}\n\n**Recommended Word Count:** ${wordCount}\n\n**Guiding Questions:**\n${questions}`
            })
            .join('\n\n')
        }
      } else if (conceptDocument?.sections) {
        content = Object.entries(conceptDocument.sections)
          .map(([key, value]) => `## ${key}\n\n${value}`)
          .join('\n\n')
      } else {
        content = 'No content available'
      }

      // Convert markdown to HTML
      const htmlContent = parseMarkdownToHTML(content)

      // Create a complete HTML document
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Concept Document</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    h3 { color: #7f8c8d; }
    p { margin: 10px 0; }
    strong { color: #2c3e50; }
    ul { margin: 10px 0; padding-left: 25px; }
    li { margin: 5px 0; }
    code { background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`

      console.log('📝 Content length:', content.length, 'characters')
      console.log('📝 HTML length:', htmlContent.length, 'characters')

      // Create blob and download
      const blob = new Blob([fullHtml], { type: 'text/html' })
      console.log('📦 Blob created - size:', blob.size, 'bytes')

      const url = window.URL.createObjectURL(blob)
      console.log('🔗 Blob URL created:', url)

      const a = document.createElement('a')
      a.href = url
      a.download = `concept-document-${proposalCode || 'draft'}.html`

      console.log('📥 Triggering download:', a.download)
      console.log('   Href:', a.href)

      document.body.appendChild(a)
      a.click()

      console.log('✅ Click triggered!')

      // Clean up after click
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }, 100)

      console.log('✅ Download complete!')
    } catch (error) {
      console.error('❌ Download failed:', error)
      alert('Failed to download document')
    }
  }

  const renderCurrentStep = () => {
    console.log('🎯 Rendering step:', currentStep, {
      hasRfpAnalysis: !!rfpAnalysis,
      hasConceptAnalysis: !!conceptAnalysis,
      conceptAnalysisKeys: conceptAnalysis ? Object.keys(conceptAnalysis) : [],
      hasConceptDocument: !!conceptDocument,
      conceptDocumentKeys: conceptDocument ? Object.keys(conceptDocument) : [],
    })

    const stepProps = {
      formData,
      setFormData,
      proposalId,
      rfpAnalysis,
      conceptAnalysis,
      onConceptEvaluationChange: handleConceptEvaluationChange,
      conceptDocument,
      conceptEvaluationData,
    }

    switch (currentStep) {
      case 1:
        return <Step1InformationConsolidation {...stepProps} />
      case 2:
        return <Step2ContentGeneration {...stepProps} />
      case 3:
        return (
          <Step3StructureValidation
            {...stepProps}
            onNextStep={handleNextStep}
            onRegisterDownload={fn => {}}
            onRegenerateDocument={async (selectedSections, userComments) => {
              // Use the same logic as handleGenerateConceptDocument
              setIsGeneratingDocument(true)
              await handleGenerateConceptDocument({
                selectedSections,
                userComments,
              })
            }}
          />
        )
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
      onClick={async e => {
        e.preventDefault()
        e.stopPropagation()

        console.log('🔘 Next button clicked - Step:', currentStep)

        if (currentStep === 2) {
          handleGenerateConceptDocument()
        } else if (currentStep === 3) {
          console.log('📥 Step 3: Proceeding to next step')
          proceedToNextStep()
        } else {
          handleNextStep()
        }
      }}
      disabled={
        currentStep === 5 ||
        isAnalyzingRFP ||
        isGeneratingDocument ||
        (currentStep === 1 &&
          (!formData.uploadedFiles['rfp-document'] ||
            formData.uploadedFiles['rfp-document'].length === 0 ||
            ((formData.textInputs['initial-concept'] || '').length < 100 &&
              (!formData.uploadedFiles['concept-document'] ||
                formData.uploadedFiles['concept-document'].length === 0))))
      }
      title={
        currentStep === 1 &&
        (!formData.uploadedFiles['rfp-document'] ||
          formData.uploadedFiles['rfp-document'].length === 0)
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
          {analysisProgress
            ? `${analysisProgress.message} (${analysisProgress.step}/${analysisProgress.total})`
            : 'Analyzing...'}
        </>
      ) : currentStep === 5 ? (
        'Complete'
      ) : currentStep === 4 ? (
        'Finish process'
      ) : currentStep === 3 ? (
        <>
          Next
          <ChevronRight size={16} />
        </>
      ) : currentStep === 2 && conceptDocument ? (
        <>
          Continue to Structure Validation
          <ChevronRight size={16} />
        </>
      ) : currentStep === 2 ? (
        <>
          Generate Updated Concept Document and Continue
          <ChevronRight size={16} />
        </>
      ) : currentStep === 1 && rfpAnalysis && conceptAnalysis ? (
        <>
          Continue to Concept Review
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
            ? {
                step: 1,
                total: 3,
                message: 'Generating Concept Document...',
                description:
                  'Our AI is creating a structured proposal outline based on your selections. This may take 1-2 minutes.',
                steps: [
                  'Processing selected sections',
                  'Generating proposal structure',
                  'Creating guiding questions',
                ],
              }
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
