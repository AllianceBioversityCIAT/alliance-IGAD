import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProposalLayout } from '../components/ProposalLayout'
import { DraftConfirmationModal } from '../components/DraftConfirmationModal'
import AnalysisProgressModal from '@/tools/proposal-writer/components/AnalysisProgressModal'
import { Step1InformationConsolidation } from './Step1InformationConsolidation'
import { Step2ConceptReview } from './Step2ConceptReview'
import { Step3StructureWorkplan } from './Step3StructureWorkplan'
import { Step4ProposalReview } from './Step4ProposalReview'
import { useProposals } from '@/tools/proposal-writer/hooks/useProposal'
import { useProposalDraft } from '@/tools/proposal-writer/hooks/useProposalDraft'
import { authService } from '@/shared/services/authService'
import { proposalService } from '../services/proposalService'
import { useToast } from '@/shared/components/ui/ToastContainer'
import styles from './proposalWriter.module.css'

export function ProposalWriterPage() {
  const { stepId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { showSuccess, showError } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [proposalId, setProposalId] = useState<string>()
  const [proposalCode, setProposalCode] = useState<string>()
  const [showExitModal, setShowExitModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isAnalyzingRFP, setIsAnalyzingRFP] = useState(false)
  const [rfpAnalysis, setRfpAnalysis] = useState<any>(null)
  const [referenceProposalsAnalysis, setReferenceProposalsAnalysis] = useState<any>(null)
  const [conceptAnalysis, setConceptAnalysis] = useState<any>(null)
  const [structureWorkplanAnalysis, setStructureWorkplanAnalysis] = useState<any>(null)
  const [draftFeedbackAnalysis, setDraftFeedbackAnalysis] = useState<any>(null)
  const [proposalStatus, setProposalStatus] = useState<'draft' | 'in_progress' | 'review' | 'completed' | 'archived'>('draft')
  const [analysisProgress, setAnalysisProgress] = useState<{
    step: number
    total: number
    message: string
  } | null>(null)
  const [conceptEvaluationData, setConceptEvaluationData] = useState<{
    selectedSections: string[]
    userComments?: { [key: string]: string }
  } | null>(null)
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false)
  const [generationProgressStep, setGenerationProgressStep] = useState(1)
  const [conceptDocument, setConceptDocument] = useState<any>(null)
  const [proposalTemplate, setProposalTemplate] = useState<any>(null)
  const [structureSelectionData, setStructureSelectionData] = useState<{
    selectedSections: string[]
    userComments: { [key: string]: string }
  } | null>(null)
  const [formData, setFormData] = useState({
    uploadedFiles: {} as { [key: string]: File[] },
    textInputs: {} as { [key: string]: string },
  })

  // Upload states for validation
  const [isUploadingRFP, setIsUploadingRFP] = useState(false)
  const [isUploadingReference, setIsUploadingReference] = useState(false)
  const [isUploadingSupporting, setIsUploadingSupporting] = useState(false)
  const [isUploadingConcept, setIsUploadingConcept] = useState(false)
  // Vectorization state - tracks if any files are being vectorized
  const [isVectorizingFiles, setIsVectorizingFiles] = useState(false)

  const allowNavigation = useRef(false)
  const formDataLoadedFromDB = useRef(false)
  const localStorageLoaded = useRef(false)
  // Flag to track intentional document clearing (to prevent auto-reload from DynamoDB)
  const intentionalDocumentClearRef = useRef(false)

  const { createProposal, isCreating, deleteProposal, isDeleting } = useProposals()
  const { saveProposalId, saveProposalCode, saveFormData, saveRfpAnalysis, loadDraft, clearDraft } =
    useProposalDraft()

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

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
      // Check if formData actually has meaningful content (not just empty objects)
      const hasContent =
        Object.keys(draft.formData.textInputs || {}).length > 0 ||
        Object.keys(draft.formData.uploadedFiles || {}).some(
          key => (draft.formData.uploadedFiles[key] || []).length > 0
        )

      if (hasContent) {
        setFormData(draft.formData)
        formDataLoadedFromDB.current = true // Mark as loaded from localStorage
      }
    }
    if (draft.rfpAnalysis) {
      console.log('📊 Loading rfpAnalysis from localStorage:', !!draft.rfpAnalysis)
      setRfpAnalysis(draft.rfpAnalysis)
    }

    // Load reference proposals analysis from localStorage
    if (draft.proposalId) {
      const savedRefAnalysis = localStorage.getItem(
        `proposal_reference_proposals_analysis_${draft.proposalId}`
      )
      if (savedRefAnalysis) {
        try {
          const parsed = JSON.parse(savedRefAnalysis)
          console.log('📊 Loading referenceProposalsAnalysis from localStorage')
          setReferenceProposalsAnalysis(parsed)
        } catch (e) {
          console.error('Failed to parse saved reference proposals analysis:', e)
        }
      }
    }

    // Mark that we've completed localStorage loading
    localStorageLoaded.current = true

    // Load concept analysis from localStorage
    if (draft.proposalId) {
      const savedConceptAnalysis = localStorage.getItem(
        `proposal_concept_analysis_${draft.proposalId}`
      )
      console.log(
        `📊 Checking for conceptAnalysis with key: proposal_concept_analysis_${draft.proposalId}`,
        !!savedConceptAnalysis
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

          console.log('📊 Loading conceptAnalysis from localStorage:', !!unwrapped)
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

    console.log('📊 Initial load complete - rfpAnalysis:', !!draft.rfpAnalysis)
  }, [])

  // Track if step completion data has been loaded for this session
  const stepCompletionLoadedRef = useRef(false)

  // Loading state for step data (used by Step 4 to show skeleton)
  const [isLoadingStepData, setIsLoadingStepData] = useState(true)

  // Load step completion data from DynamoDB on initial mount (always runs regardless of localStorage)
  // This ensures Step 3 and Step 4 checkmarks show correctly when loading from dashboard
  useEffect(() => {
    const loadStepCompletionData = async () => {
      if (!proposalId) {
        setIsLoadingStepData(false)
        return
      }

      // Only run once per session
      if (stepCompletionLoadedRef.current) {
        setIsLoadingStepData(false)
        return
      }
      stepCompletionLoadedRef.current = true

      try {
        setIsLoadingStepData(true)
        console.log('🔄 Loading step completion data from DynamoDB...')
        const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
        const proposal = await proposalService.getProposal(proposalId)

        if (proposal) {
          // Load structure workplan analysis (Step 3 completion)
          if (proposal.structure_workplan_analysis) {
            console.log('✅ Loaded structure_workplan_analysis for Step 3 completion')
            setStructureWorkplanAnalysis(proposal.structure_workplan_analysis)
          }

          // Load draft feedback analysis (Step 4 completion)
          if (proposal.draft_feedback_analysis) {
            console.log('✅ Loaded draft_feedback_analysis for Step 4 completion')
            setDraftFeedbackAnalysis(proposal.draft_feedback_analysis)
          }

          // Load proposal template generated flag
          if (proposal.proposal_template_generated) {
            console.log('✅ Loaded proposal_template_generated for Step 3 completion')
            setProposalTemplate({ generated: true, timestamp: proposal.proposal_template_generated })
          } else if (proposal.structure_workplan_completed_at && proposal.structure_workplan_analysis) {
            console.log('✅ Using structure_workplan_completed_at as fallback for Step 3')
            setProposalTemplate({ generated: true, timestamp: proposal.structure_workplan_completed_at })
          }

          // Load concept document (Step 2 completion)
          if (proposal.concept_document_v2) {
            console.log('✅ Loaded concept_document_v2 for Step 2 completion')
            setConceptDocument(proposal.concept_document_v2)
          }

          // Load uploaded draft files
          const draftFiles = proposal.uploaded_files?.['draft-proposal'] || []
          if (draftFiles.length > 0) {
            console.log('✅ Loaded draft-proposal files:', draftFiles)
            setFormData(prev => ({
              ...prev,
              uploadedFiles: {
                ...prev.uploadedFiles,
                'draft-proposal': draftFiles
              }
            }))
          }

          // Load proposal status
          if (proposal.status) {
            console.log('✅ Loaded proposal status:', proposal.status)
            setProposalStatus(proposal.status)
          }
        }
      } catch (error) {
        console.log('⚠️ Error loading step completion data:', error)
      } finally {
        setIsLoadingStepData(false)
      }
    }

    loadStepCompletionData()
  }, [proposalId])

  // Load formData from DynamoDB if localStorage is empty
  useEffect(() => {
    const loadFormDataFromDynamoDB = async () => {
      if (!proposalId || formDataLoadedFromDB.current) {
        return
      }

      // Wait until localStorage loading is complete
      let attempts = 0
      while (!localStorageLoaded.current && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 10))
        attempts++
      }

      // If formData was already loaded from localStorage, skip DynamoDB loading
      if (formDataLoadedFromDB.current) {
        return
      }

      try {
        const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
        const proposal = await proposalService.getProposal(proposalId)

        if (proposal) {
          // Map DynamoDB documents field to formData uploadedFiles structure
          // DynamoDB stores documents in a separate 'documents' field with arrays like:
          // documents: { rfp_documents: [...], concept_documents: [...], ... }
          const uploadedFiles: { [key: string]: string[] } = {}

          if (proposal.documents) {
            uploadedFiles['rfp-document'] = proposal.documents.rfp_documents || []
            uploadedFiles['concept-document'] = proposal.documents.concept_documents || []
            uploadedFiles['reference-proposals'] = proposal.documents.reference_documents || []
            uploadedFiles['supporting-docs'] = proposal.documents.supporting_documents || []
          } else if (proposal.uploaded_files) {
            // Fallback to uploaded_files if documents field doesn't exist
            Object.assign(uploadedFiles, proposal.uploaded_files)
          }

          setFormData({
            textInputs: proposal.text_inputs || {},
            uploadedFiles: uploadedFiles as any,
          })
          formDataLoadedFromDB.current = true

          // Load concept_document_v2 from DynamoDB for step completion tracking
          if (proposal.concept_document_v2 && !conceptDocument) {
            console.log('📄 Loading concept_document_v2 from DynamoDB on initial mount')
            setConceptDocument(proposal.concept_document_v2)
          }

          // Load proposal_template_generated flag from DynamoDB for step completion tracking
          // Also check structure_workplan_completed_at as fallback for older proposals
          if (!proposalTemplate) {
            if (proposal.proposal_template_generated) {
              console.log('📄 Loading proposal_template_generated from DynamoDB on initial mount')
              setProposalTemplate({ generated: true, timestamp: proposal.proposal_template_generated })
            } else if (proposal.structure_workplan_completed_at && proposal.structure_workplan_analysis) {
              // Fallback: If structure workplan is completed, mark Step 3 as done
              console.log('📄 Loading structure_workplan_completed_at as fallback for Step 3 completion')
              setProposalTemplate({ generated: true, timestamp: proposal.structure_workplan_completed_at })
            }
          }

          // Also load structure workplan analysis if available
          if (proposal.structure_workplan_analysis && !structureWorkplanAnalysis) {
            console.log('📄 Loading structure_workplan_analysis from DynamoDB on initial mount')
            setStructureWorkplanAnalysis(proposal.structure_workplan_analysis)
          }

          // Also load draft feedback analysis if available (Step 4)
          if (proposal.draft_feedback_analysis && !draftFeedbackAnalysis) {
            console.log('📄 Loading draft_feedback_analysis from DynamoDB on initial mount')
            setDraftFeedbackAnalysis(proposal.draft_feedback_analysis)
          }
        } else {
          formDataLoadedFromDB.current = true
        }
      } catch (error) {
        // This is not a critical error - the form will still work with empty values
        formDataLoadedFromDB.current = true
      }
    }

    loadFormDataFromDynamoDB()
  }, [proposalId, conceptDocument, proposalTemplate, structureWorkplanAnalysis, draftFeedbackAnalysis])

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
      console.log('💾 Saving rfpAnalysis to localStorage with key: draft_rfp_analysis')
      saveRfpAnalysis(rfpAnalysis)
    }
  }, [rfpAnalysis, saveRfpAnalysis])

  // Save reference proposals analysis to localStorage
  useEffect(() => {
    if (referenceProposalsAnalysis && proposalId) {
      console.log(
        `💾 Saving referenceProposalsAnalysis to localStorage with key: proposal_reference_proposals_analysis_${proposalId}`
      )
      localStorage.setItem(
        `proposal_reference_proposals_analysis_${proposalId}`,
        JSON.stringify(referenceProposalsAnalysis)
      )
    }
  }, [referenceProposalsAnalysis, proposalId])

  // Save concept analysis to localStorage
  useEffect(() => {
    if (conceptAnalysis && proposalId) {
      console.log(
        `💾 Saving conceptAnalysis to localStorage with key: proposal_concept_analysis_${proposalId}`
      )
      localStorage.setItem(
        `proposal_concept_analysis_${proposalId}`,
        JSON.stringify(conceptAnalysis)
      )
    } else {
      console.log(
        `⚠️ Not saving conceptAnalysis - conceptAnalysis: ${!!conceptAnalysis}, proposalId: ${!!proposalId}`
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

  // Track previous selectedSections and userComments to detect changes
  const previousSelectedSectionsRef = useRef<string[] | null>(null)
  const previousUserCommentsRef = useRef<{ [key: string]: string } | null>(null)

  // Invalidate concept document when section selections OR user comments change in Step 2
  useEffect(() => {
    if (!conceptEvaluationData?.selectedSections || !proposalId) {
      return
    }

    const currentSelections = conceptEvaluationData.selectedSections
    const currentComments = conceptEvaluationData.userComments || {}
    const previousSelections = previousSelectedSectionsRef.current
    const previousComments = previousUserCommentsRef.current

    // Skip on initial load - only invalidate if there was previous data
    if (previousSelections === null) {
      // Store initial values but don't invalidate
      previousSelectedSectionsRef.current = [...currentSelections]
      previousUserCommentsRef.current = { ...currentComments }
      return
    }

    // Check if selections have actually changed
    const selectionsChanged =
      previousSelections.length !== currentSelections.length ||
      !previousSelections.every(section => currentSelections.includes(section))

    // Check if comments have actually changed
    const currentCommentsKeys = Object.keys(currentComments)
    const previousCommentsKeys = Object.keys(previousComments || {})
    const commentsChanged =
      currentCommentsKeys.length !== previousCommentsKeys.length ||
      currentCommentsKeys.some(key => currentComments[key] !== (previousComments || {})[key])

    // Only invalidate if (selections OR comments) changed AND a concept document already exists
    if ((selectionsChanged || commentsChanged) && conceptDocument) {
      console.log('📋 Concept evaluation changed - invalidating concept document')
      if (selectionsChanged) {
        console.log('   Selections changed - Previous:', previousSelections, 'Current:', currentSelections)
      }
      if (commentsChanged) {
        console.log('   Comments changed')
      }

      // Set flag to prevent auto-reload from DynamoDB
      intentionalDocumentClearRef.current = true

      // Clear concept document
      setConceptDocument(null)

      // Clear localStorage
      localStorage.removeItem(`proposal_concept_document_${proposalId}`)

      console.log('✅ Concept document invalidated - user will need to regenerate')
    }

    // Update references for next comparison
    previousSelectedSectionsRef.current = [...currentSelections]
    previousUserCommentsRef.current = { ...currentComments }
  }, [conceptEvaluationData?.selectedSections, conceptEvaluationData?.userComments, proposalId, conceptDocument])

  // Calculate completed steps based on available data
  useEffect(() => {
    const completed: number[] = []

    // Step 1 is completed if we have RFP uploaded
    if (formData.uploadedFiles['rfp-document']?.length > 0) {
      completed.push(1)
    }

    // Step 2 is completed if we have concept document generated
    // (conceptDocument is generated in Step 2 - Concept Review)
    if (conceptDocument) {
      completed.push(2)
    }

    // Step 3 is completed if we have proposal template generated OR structure workplan analysis
    // (proposalTemplate is generated in Step 3 - Structure & Workplan)
    // Also check structureWorkplanAnalysis as fallback for when proposalTemplate isn't loaded yet
    // Also check draftFeedbackAnalysis - if Step 4 is done, Step 3 must have been completed
    if (proposalTemplate || structureWorkplanAnalysis || draftFeedbackAnalysis) {
      completed.push(3)
    }

    // Step 4 is completed if we have draft feedback analysis
    if (draftFeedbackAnalysis) {
      completed.push(4)
    }

    // Only update if different to avoid infinite loops
    if (JSON.stringify(completed) !== JSON.stringify(completedSteps)) {
      setCompletedSteps(completed)
    }
  }, [formData.uploadedFiles, conceptDocument, proposalTemplate, structureWorkplanAnalysis, draftFeedbackAnalysis, completedSteps])

  // Detect RFP/document changes and invalidate analyses
  useEffect(() => {
    if (proposalId) {
      // Listen for document update events
      const handleDocumentsUpdated = () => {
        console.log('📄 [ProposalWriterPage] documents-updated event received - clearing analyses')
        setRfpAnalysis(null)
        setReferenceProposalsAnalysis(null)
        setConceptAnalysis(null)
        setConceptDocument(null)
        setConceptEvaluationData(null)
        setProposalTemplate(null)
        setStructureSelectionData(null)
        localStorage.removeItem(`proposal_rfp_analysis_${proposalId}`)
        localStorage.removeItem(`proposal_reference_proposals_analysis_${proposalId}`)
        localStorage.removeItem(`proposal_concept_analysis_${proposalId}`)
        localStorage.removeItem(`proposal_concept_document_${proposalId}`)
        localStorage.removeItem(`proposal_concept_evaluation_${proposalId}`)
        localStorage.removeItem(`proposal_template_${proposalId}`)
        localStorage.removeItem(`proposal_structure_selection_${proposalId}`)
      }

      // Listen for RFP deletion events (legacy)
      const handleRfpDeleted = () => {
        handleDocumentsUpdated()
      }

      window.addEventListener('rfp-deleted', handleRfpDeleted)
      window.addEventListener('documents-updated', handleDocumentsUpdated)
      return () => {
        window.removeEventListener('rfp-deleted', handleRfpDeleted)
        window.removeEventListener('documents-updated', handleDocumentsUpdated)
      }
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
      // Skip if document was intentionally cleared (user changed selections/comments)
      if (intentionalDocumentClearRef.current) {
        console.log('⏭️ Skipping concept document load - intentionally cleared')
        intentionalDocumentClearRef.current = false
        return
      }

      if (proposalId && currentStep === 2 && !conceptDocument) {
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
          console.error('❌ Error loading concept document:', error)
        }
      }
    }

    loadConceptDocument()
  }, [proposalId, currentStep, conceptDocument])

  // Load proposal template when on Step 4
  useEffect(() => {
    const loadProposalTemplate = async () => {
      if (proposalId && currentStep === 4 && !proposalTemplate) {
        try {
          console.log('🔍 Loading proposal template for proposalId:', proposalId)

          // First check localStorage
          const cachedTemplate = localStorage.getItem(`proposal_template_${proposalId}`)
          if (cachedTemplate) {
            console.log('✅ Found cached template in localStorage')
            setProposalTemplate(JSON.parse(cachedTemplate))
            return
          }

          // TODO: Load from backend when API is ready
          // const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
          // const response = await proposalService.getProposal(proposalId)
          // if (response?.proposal_template) {
          //   setProposalTemplate(response.proposal_template)
          // }
        } catch (error) {
          console.error('❌ Error loading proposal template:', error)
        }
      }
    }

    loadProposalTemplate()
  }, [proposalId, currentStep, proposalTemplate])

  // Load concept evaluation from DynamoDB when entering Step 2
  useEffect(() => {
    const loadConceptEvaluation = async () => {
      if (proposalId && currentStep === 2) {
        try {
          console.log('🔍 Loading concept evaluation for Step 2:', proposalId)
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

  // Load structure workplan analysis from DynamoDB when entering Step 3
  useEffect(() => {
    const loadStructureWorkplan = async () => {
      if (proposalId && currentStep === 3 && !structureWorkplanAnalysis) {
        try {
          console.log('🔍 Loading structure workplan for Step 3:', proposalId)
          const { proposalService } = await import(
            '@/tools/proposal-writer/services/proposalService'
          )
          const response = await proposalService.getStructureWorkplanStatus(proposalId)

          if (response?.data) {
            console.log('✅ Loaded structure workplan from DynamoDB')
            setStructureWorkplanAnalysis(response.data)
            // Also update localStorage
            localStorage.setItem(
              `proposal_structure_workplan_${proposalId}`,
              JSON.stringify(response.data)
            )
          }
        } catch (error) {
          console.log('⚠️ No saved structure workplan found, checking localStorage')
          // Try localStorage fallback
          const cached = localStorage.getItem(`proposal_structure_workplan_${proposalId}`)
          if (cached) {
            console.log('✅ Found structure workplan in localStorage')
            setStructureWorkplanAnalysis(JSON.parse(cached))
          }
        }
      }
    }

    loadStructureWorkplan()
  }, [proposalId, currentStep, structureWorkplanAnalysis])

  // Load draft feedback analysis from DynamoDB when entering Step 4
  useEffect(() => {
    const loadDraftFeedback = async () => {
      if (proposalId && currentStep === 4) {
        try {
          console.log('🔍 Loading draft feedback for Step 4:', proposalId)
          const { proposalService } = await import(
            '@/tools/proposal-writer/services/proposalService'
          )

          // Load proposal to get both draft files and feedback analysis
          const proposal = await proposalService.getProposal(proposalId)

          if (proposal) {
            // Load draft feedback analysis
            if (proposal.draft_feedback_analysis && !draftFeedbackAnalysis) {
              console.log('✅ Loaded draft_feedback_analysis from DynamoDB')
              setDraftFeedbackAnalysis(proposal.draft_feedback_analysis)
            }

            // Load structure workplan analysis (to show Step 3 as completed)
            if (proposal.structure_workplan_analysis && !structureWorkplanAnalysis) {
              console.log('✅ Loaded structure_workplan_analysis from DynamoDB (for Step 3 completion)')
              setStructureWorkplanAnalysis(proposal.structure_workplan_analysis)
            }

            // Load uploaded draft files
            const draftFiles = proposal.uploaded_files?.['draft-proposal'] || []
            if (draftFiles.length > 0) {
              console.log('✅ Loaded draft-proposal files from DynamoDB:', draftFiles)
              setFormData(prev => ({
                ...prev,
                uploadedFiles: {
                  ...prev.uploadedFiles,
                  'draft-proposal': draftFiles
                }
              }))
            }
          }
        } catch (error) {
          console.log('⚠️ Error loading draft feedback data:', error)
        }
      }
    }

    loadDraftFeedback()
  }, [proposalId, currentStep])

  useEffect(() => {
    if (stepId) {
      if (stepId.startsWith('step-')) {
        const step = parseInt(stepId.replace('step-', ''))
        if (step >= 1 && step <= 4) {
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

  const handleSaveAndClose = async () => {
    if (!proposalId || isSavingDraft) {
      return
    }

    setIsSavingDraft(true)

    try {
      // Update proposal with current timestamp
      await proposalService.updateProposal(proposalId, {
        updated_at: new Date().toISOString(),
      })

      showSuccess('Proposal saved successfully', 'Your progress has been saved.')

      // Close modal and navigate to dashboard
      setShowExitModal(false)
      setPendingNavigation(null)

      setTimeout(() => {
        navigate('/dashboard')
      }, 500)
    } catch (error) {
      console.error('Failed to save proposal:', error)
      showError('Failed to save proposal', 'Please try again.')
      setIsSavingDraft(false)
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

    if (currentStep < 4) {
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

  const handleGenerateTemplate = async (
    selectedSections: string[],
    userComments: { [key: string]: string }
  ) => {
    console.log('🟢 Starting proposal template generation...')
    console.log('📋 Selected sections:', selectedSections)
    console.log('📋 User comments:', userComments)

    if (!proposalId || selectedSections.length === 0) {
      alert('Please select at least one section before generating template')
      return
    }

    setIsGeneratingDocument(true)

    try {
      // Save structure selection data
      setStructureSelectionData({ selectedSections, userComments })

      // TODO: Call API to generate proposal template
      // For now, simulate template generation
      console.log('🔄 Generating proposal template...')

      // Placeholder: In real implementation, call proposalService.generateProposalTemplate
      await new Promise(resolve => setTimeout(resolve, 2000))

      const mockTemplate = {
        sections: selectedSections.map(section => ({
          title: section,
          content: `Content for ${section}`,
          userComment: userComments[section] || '',
        })),
        generatedAt: new Date().toISOString(),
      }

      setProposalTemplate(mockTemplate)
      setIsGeneratingDocument(false)

      // Save to localStorage
      if (proposalId) {
        localStorage.setItem(`proposal_template_${proposalId}`, JSON.stringify(mockTemplate))
        localStorage.setItem(
          `proposal_structure_selection_${proposalId}`,
          JSON.stringify({ selectedSections, userComments })
        )
      }

      console.log('✅ Template generated successfully')
      proceedToNextStep()
    } catch (error: any) {
      console.error('❌ Template generation failed:', error)
      setIsGeneratingDocument(false)
      alert(`Generation failed: ${error.message || 'Unknown error'}`)
    }
  }

  const handleNextStep = async () => {
    console.log('🔵 handleNextStep called - Current step:', currentStep)

    // If on Step 1 and trying to go to Step 2, analyze Step 1 (RFP + Reference Proposals) AND Concept
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

      // If all analyses already exist, just proceed
      if (rfpAnalysis && conceptAnalysis) {
        console.log('✅ All analyses already complete, proceeding to next step')
        proceedToNextStep()
        return
      }

      // Start 3-step sequential analysis: RFP → Reference Proposals → Concept
      console.log('🟢 Starting 3-step sequential analysis...')
      setIsAnalyzingRFP(true)
      setAnalysisProgress({ step: 1, total: 3, message: 'Analyzing RFP...' })

      try {
        const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')

        // STEP 1: RFP Analysis ONLY
        if (!rfpAnalysis) {
          console.log('📡 Step 1/3: Starting RFP analysis...')
          const step1Result = await proposalService.analyzeStep1(proposalId!)

          console.log('📊 Step 1 (RFP) launched:', step1Result)

          // Poll for Step 1 completion (RFP only)
          await pollStep1Status(proposalService)
        }

        // STEP 2: Reference Proposals + Existing Work
        console.log('📡 Step 2/3: Starting Reference Proposals + Existing Work analysis...')
        
        // Check if there are documents to analyze
        const hasReferenceProposals = (formData.uploadedFiles['reference-proposals'] || []).length > 0
        const hasSupportingDocs = (formData.uploadedFiles['supporting-docs'] || []).length > 0
        
        let step2Message = 'Analyzing Reference Proposals & Existing Work...'
        if (!hasReferenceProposals && !hasSupportingDocs) {
          step2Message = 'Skipping optional analyses (no documents uploaded)...'
        } else if (!hasReferenceProposals) {
          step2Message = 'Analyzing Existing Work (no reference proposals)...'
        } else if (!hasSupportingDocs) {
          step2Message = 'Analyzing Reference Proposals (no existing work)...'
        }
        
        setAnalysisProgress({ step: 2, total: 3, message: step2Message })

        const step2Result = await proposalService.analyzeStep2(proposalId!)
        console.log('📊 Step 2 (Reference Proposals + Existing Work) launched:', step2Result)

        // Poll for Step 2 completion
        await pollStep2Status(proposalService)

        // STEP 3: Concept Analysis
        console.log('📡 Step 3/3: Starting Concept analysis...')
        setAnalysisProgress({ step: 3, total: 3, message: 'Analyzing Initial Concept...' })

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

        // All analyses complete!
        console.log('✅ All analyses completed!')
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

    // Step 2: Execute Step 3 analysis (Structure and Workplan) before proceeding
    if (currentStep === 2) {
      console.log('🔵 Step 2: Executing Structure and Workplan analysis...')
      
      // Check if analysis already exists
      if (structureWorkplanAnalysis) {
        console.log('✅ Structure and Workplan analysis already complete, proceeding')
        proceedToNextStep()
        return
      }

      setIsAnalyzingRFP(true)
      setAnalysisProgress({ 
        step: 1, 
        total: 1, 
        message: 'Generating Proposal Structure',
        description: 'Our AI is analyzing your RFP and concept evaluation to create a customized proposal structure with sections, guidance, and questions. This process uses advanced AI and may take up to 2 minutes.',
        steps: ['Analyzing RFP requirements and concept evaluation to generate tailored proposal structure']
      })

      try {
        const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
        
        const result = await proposalService.analyzeStep3(proposalId!)
        
        if (result.status === 'processing') {
          // Poll for completion
          await pollAnalysisStatus(
            () => proposalService.getStructureWorkplanStatus(proposalId!),
            statusResult => {
              if (statusResult.data) {
                setStructureWorkplanAnalysis(statusResult.data)
                localStorage.setItem(
                  `proposal_structure_workplan_${proposalId}`,
                  JSON.stringify(statusResult.data)
                )
              }
              return statusResult.data
            },
            'Structure Workplan'
          )
          
          setIsAnalyzingRFP(false)
          setAnalysisProgress(null)
          proceedToNextStep()
        } else if (result.status === 'completed') {
          // Already completed
          if (result.data) {
            setStructureWorkplanAnalysis(result.data)
            localStorage.setItem(
              `proposal_structure_workplan_${proposalId}`,
              JSON.stringify(result.data)
            )
          }
          setIsAnalyzingRFP(false)
          setAnalysisProgress(null)
          proceedToNextStep()
        } else {
          throw new Error('Failed to start structure and workplan analysis')
        }
      } catch (error: any) {
        console.error('❌ Structure and Workplan analysis failed:', error)
        setIsAnalyzingRFP(false)
        setAnalysisProgress(null)
        
        // Show detailed error message
        const errorMsg = error.response?.data?.detail || error.message || 'Unknown error'
        alert(`Structure and Workplan analysis failed:\n\n${errorMsg}\n\nPlease ensure Step 1 (RFP) and Step 2 (Concept) are completed.`)
      }

      return
    }

    // Step 2: Download document before proceeding
    if (currentStep === 2 && conceptDocument) {
      console.log('📥 Step 2: Downloading document before proceeding')
      await handleDownloadConceptDocument()
    }

    // Normal navigation for other steps
    console.log('➡️ Normal navigation to next step')
    proceedToNextStep()
  }

  // Helper function to poll Step 1 status (RFP ONLY)
  const pollStep1Status = async (proposalService: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 100 // 5 minutes at 3 second intervals

      const poll = async () => {
        try {
          attempts++
          const status = await proposalService.getStep1Status(proposalId!)

          console.log(`📊 Step 1 status (attempt ${attempts}):`, status.overall_status)
          console.log('   RFP:', status.rfp_analysis.status)

          // Update RFP state when completed
          if (status.rfp_analysis.status === 'completed' && status.rfp_analysis.data) {
            setRfpAnalysis(status.rfp_analysis.data)
          }

          // Check overall status (Step 1 = RFP only)
          if (status.overall_status === 'completed') {
            console.log('✅ Step 1 (RFP) completed!')
            resolve()
          } else if (status.overall_status === 'failed') {
            const errorMsg = status.rfp_analysis.error || 'Step 1 (RFP) analysis failed'
            reject(new Error(errorMsg))
          } else if (attempts >= maxAttempts) {
            reject(new Error('Step 1 (RFP) analysis timeout'))
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

  // Helper function to poll Step 2 combined status (Reference Proposals + Existing Work)
  const pollStep2Status = async (proposalService: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 100 // 5 minutes at 3 second intervals

      const poll = async () => {
        try {
          attempts++
          const status = await proposalService.getStep2Status(proposalId!)

          console.log(`📊 Step 2 combined status (attempt ${attempts}):`, status.overall_status)
          console.log('   Reference Proposals:', status.reference_proposals_analysis.status)
          console.log('   Existing Work:', status.existing_work_analysis.status)

          // Update individual states as they complete
          if (
            status.reference_proposals_analysis.status === 'completed' &&
            status.reference_proposals_analysis.data
          ) {
            setReferenceProposalsAnalysis(status.reference_proposals_analysis.data)
          }

          // Check overall status
          if (status.overall_status === 'completed') {
            console.log('✅ Step 2 analyses completed!')
            resolve()
          } else if (status.overall_status === 'failed') {
            const refError = status.reference_proposals_analysis.error
            const existingWorkError = status.existing_work_analysis.error
            const errorMsg = refError || existingWorkError || 'Step 2 analysis failed'
            reject(new Error(errorMsg))
          } else if (attempts >= maxAttempts) {
            reject(new Error('Step 2 analysis timeout'))
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

  // Helper function to poll analysis status (for Concept analysis)
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
    userComments?: { [key: string]: string }
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
      alert('Please select sections before generating')
      return
    }

    setIsGeneratingDocument(true)
    setGenerationProgressStep(1)

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
          // Add user comment if provided (only from Step 3 regeneration)
          user_comment: overrideData?.userComments?.[section.section] || '',
        }))

      // Mark all sections with selected flag
      const allSectionsWithSelection = allSections.map(section => ({
        ...section,
        selected: evaluationData.selectedSections.includes(section.section),
        user_comment: overrideData?.userComments?.[section.section] || '',
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
      setGenerationProgressStep(2)
      const result = await proposalService.generateConceptDocument(proposalId, conceptEvaluation)

      if (result.status === 'completed') {
        console.log('✅ Document generated successfully')
        setGenerationProgressStep(3)
        setConceptDocument(result.concept_document)
        setIsGeneratingDocument(false)
        setGenerationProgressStep(1) // Reset for next time
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
      setGenerationProgressStep(1) // Reset on error
      alert(`Generation failed: ${error.message || 'Unknown error'}`)
    }
  }

  const pollConceptDocumentStatus = async (isRegenerating = false) => {
    const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')

    let attempts = 0
    const maxAttempts = 60 // 3 minutes max

    const poll = async () => {
      attempts++

      // Update progress step based on polling attempts for better UX
      if (attempts === 2) {
        setGenerationProgressStep(2) // Move to step 2 after first check
      } else if (attempts === 4) {
        setGenerationProgressStep(3) // Move to step 3 after a few more checks
      }

      try {
        const status = await proposalService.getConceptDocumentStatus(proposalId!)

        if (status.status === 'completed') {
          setGenerationProgressStep(3) // Ensure we're at final step
          setConceptDocument(status.concept_document)
          setIsGeneratingDocument(false)
          setGenerationProgressStep(1) // Reset for next time
          // Only proceed to next step if not regenerating
          if (!isRegenerating) {
            proceedToNextStep()
          }
        } else if (status.status === 'failed') {
          setIsGeneratingDocument(false)
          setGenerationProgressStep(1) // Reset on failure
          alert(`Generation failed: ${status.error}`)
        } else if (attempts >= maxAttempts) {
          setIsGeneratingDocument(false)
          setGenerationProgressStep(1) // Reset on timeout
          alert('Generation timeout. Please try again.')
        } else {
          setTimeout(poll, 3000)
        }
      } catch (error) {
        setIsGeneratingDocument(false)
        setGenerationProgressStep(1) // Reset on error
        alert('Failed to check generation status')
      }
    }

    poll()
  }

  const handleConceptEvaluationChange = useCallback((data: {
    selectedSections: string[]
    userComments?: { [key: string]: string }
  }) => {
    setConceptEvaluationData(data)
  }, [])

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
    const stepProps = {
      formData,
      setFormData,
      proposalId,
      rfpAnalysis,
      conceptAnalysis,
      onConceptEvaluationChange: handleConceptEvaluationChange,
      conceptDocument,
      conceptEvaluationData,
      // Upload state setters for Step 1
      setIsUploadingRFP,
      setIsUploadingReference,
      setIsUploadingSupporting,
      setIsUploadingConcept,
      // Vectorization state setter for Step 1
      setIsVectorizingFiles,
    }

    switch (currentStep) {
      case 1:
        return (
          <Step1InformationConsolidation
            {...stepProps}
            onRfpDocumentChanged={() => {
              console.log('🔄 RFP Document changed - invalidating all downstream analyses')
              // Clear all analyses that depend on RFP
              setRfpAnalysis(null)
              setConceptAnalysis(null)
              setConceptDocument(null)
              setStructureWorkplanAnalysis(null)
              setProposalTemplate(null)
              setConceptEvaluationData(null)
              setDraftFeedbackAnalysis(null)
              // Clear localStorage
              if (proposalId) {
                localStorage.removeItem(`proposal_rfp_analysis_${proposalId}`)
                localStorage.removeItem(`proposal_concept_analysis_${proposalId}`)
                localStorage.removeItem(`proposal_concept_document_${proposalId}`)
                localStorage.removeItem(`proposal_structure_workplan_${proposalId}`)
                localStorage.removeItem(`proposal_template_${proposalId}`)
                localStorage.removeItem(`proposal_concept_evaluation_${proposalId}`)
              }
            }}
            onConceptDocumentChanged={() => {
              console.log('🔄 Concept Document changed - invalidating downstream analyses')
              // Clear analyses that depend on concept
              setConceptAnalysis(null)
              setConceptDocument(null)
              setStructureWorkplanAnalysis(null)
              setProposalTemplate(null)
              setConceptEvaluationData(null)
              // Clear localStorage
              if (proposalId) {
                localStorage.removeItem(`proposal_concept_analysis_${proposalId}`)
                localStorage.removeItem(`proposal_concept_document_${proposalId}`)
                localStorage.removeItem(`proposal_structure_workplan_${proposalId}`)
                localStorage.removeItem(`proposal_template_${proposalId}`)
                localStorage.removeItem(`proposal_concept_evaluation_${proposalId}`)
              }
            }}
          />
        )
      case 2:
        // Get current concept file name from formData
        const conceptFiles = formData.uploadedFiles['concept-document'] || []
        const currentConceptFileName = conceptFiles.length > 0
          ? (typeof conceptFiles[0] === 'string' ? conceptFiles[0] : conceptFiles[0]?.name)
          : undefined

        return (
          <Step2ConceptReview
            {...stepProps}
            conceptDocument={conceptDocument}
            proposalId={proposalId}
            onConceptAnalysisChanged={(newConceptAnalysis) => {
              // Called when concept analysis is regenerated (from Step2's internal handler)
              console.log('🔄 Concept analysis changed, updating state')
              setConceptAnalysis(newConceptAnalysis)
              // Clear downstream analyses that depend on concept
              setStructureWorkplanAnalysis(null)
              setProposalTemplate(null)
              setConceptEvaluationData(null)
              // Save to localStorage
              if (proposalId) {
                localStorage.setItem(
                  `proposal_concept_analysis_${proposalId}`,
                  JSON.stringify(newConceptAnalysis)
                )
                // Clear downstream localStorage items
                localStorage.removeItem(`proposal_structure_workplan_${proposalId}`)
                localStorage.removeItem(`proposal_template_${proposalId}`)
                localStorage.removeItem(`proposal_concept_evaluation_${proposalId}`)
              }
            }}
            onConceptDocumentChanged={(newDocument) => {
              // Called when concept document is generated or cleared (from Step2's internal handler)
              console.log('📄 Concept document changed:', newDocument ? 'new document' : 'cleared')
              setConceptDocument(newDocument)
              // Update localStorage
              if (proposalId) {
                if (newDocument) {
                  localStorage.setItem(
                    `proposal_concept_document_${proposalId}`,
                    JSON.stringify(newDocument)
                  )
                } else {
                  localStorage.removeItem(`proposal_concept_document_${proposalId}`)
                }
              }
            }}
            currentConceptFileName={currentConceptFileName}
          />
        )
      case 3:
        return (
          <Step3StructureWorkplan
            {...stepProps}
            proposalId={proposalId}
            structureWorkplanAnalysis={structureWorkplanAnalysis}
            onTemplateGenerated={async () => {
              const timestamp = new Date().toISOString()
              console.log('✅ Template generated, enabling Next button')
              setProposalTemplate({ generated: true, timestamp })

              // Save to DynamoDB for persistence across sessions
              if (proposalId) {
                try {
                  await proposalService.updateProposal(proposalId, {
                    proposal_template_generated: timestamp,
                  } as any)
                  console.log('💾 Saved proposal_template_generated to DynamoDB')
                } catch (error) {
                  console.error('❌ Failed to save template status to DynamoDB:', error)
                }
              }
            }}
          />
        )
      case 4:
        return (
          <Step4ProposalReview
            {...stepProps}
            proposalId={proposalId}
            isLoading={isLoadingStepData}
            uploadedDraftFiles={formData.uploadedFiles['draft-proposal'] as unknown as string[] || []}
            draftFeedbackAnalysis={draftFeedbackAnalysis?.draft_feedback_analysis || draftFeedbackAnalysis}
            onFeedbackAnalyzed={(analysis) => {
              console.log('✅ Draft feedback analysis received:', analysis)
              setDraftFeedbackAnalysis(analysis)
            }}
            onFilesChanged={(files) => {
              console.log('📄 Draft files changed:', files)
              setFormData(prev => ({
                ...prev,
                uploadedFiles: {
                  ...prev.uploadedFiles,
                  'draft-proposal': files as any
                }
              }))
            }}
          />
        )
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

        // Step 3 proceeds to next step
        // Step 4 is the final step - handled by Finish process button
        if (currentStep === 3) {
          console.log(`📥 Step ${currentStep}: Proceeding to next step`)
          proceedToNextStep()
        } else if (currentStep === 4) {
          // Final step - finish process
          console.log('🏁 Finishing process')
          if (proposalId) {
            try {
              await proposalService.updateProposalStatus(proposalId, 'completed')
              setProposalStatus('completed')
              showSuccess('Process Complete', 'Your proposal has been marked as completed!')
            } catch (error) {
              console.error('Error finishing process:', error)
              showError('Error', 'Failed to complete process. Please try again.')
            }
          }
        } else {
          handleNextStep()
        }
      }}
      disabled={
        // Step 3: Disable until template is generated
        (currentStep === 3 && !proposalTemplate) ||
        // Step 2: Disable until concept document is generated
        (currentStep === 2 && !conceptDocument) ||
        isAnalyzingRFP ||
        isGeneratingDocument ||
        (currentStep === 1 &&
          (!(formData.textInputs['proposal-title'] || '').trim() ||
            !formData.uploadedFiles['rfp-document'] ||
            formData.uploadedFiles['rfp-document'].length === 0 ||
            ((formData.textInputs['initial-concept'] || '').length < 100 &&
              (!formData.uploadedFiles['concept-document'] ||
                formData.uploadedFiles['concept-document'].length === 0)) ||
            // Disable if any uploads are in progress
            isUploadingRFP ||
            isUploadingReference ||
            isUploadingSupporting ||
            isUploadingConcept ||
            // Disable if files are being vectorized
            isVectorizingFiles))
      }
      title={
        currentStep === 1 && isVectorizingFiles
          ? 'Please wait for document vectorization to complete'
          : currentStep === 1 &&
            (isUploadingRFP || isUploadingReference || isUploadingSupporting || isUploadingConcept)
          ? 'Please wait for file uploads to complete'
          : currentStep === 1 &&
            (!(formData.textInputs['proposal-title'] || '').trim() ||
              !formData.uploadedFiles['rfp-document'] ||
              formData.uploadedFiles['rfp-document'].length === 0 ||
              ((formData.textInputs['initial-concept'] || '').length < 100 &&
                (!formData.uploadedFiles['concept-document'] ||
                  formData.uploadedFiles['concept-document'].length === 0)))
          ? 'Please provide a title, upload an RFP document, and provide an initial concept'
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
      ) : currentStep === 1 && isVectorizingFiles ? (
        <>
          <span className={styles.spinner}></span>
          Vectorizing documents...
        </>
      ) : currentStep === 4 ? (
        'Finish process'
      ) : currentStep === 3 && proposalTemplate ? (
        <>
          Continue to Proposal Review
          <ChevronRight size={16} />
        </>
      ) : currentStep === 3 ? (
        'Generate Template First'
      ) : currentStep === 2 ? (
        <>
          Continue to Structure & Workplan
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
                step: generationProgressStep,
                total: 3,
                message: 'Generating Enhanced Concept Document...',
                description:
                  'Our AI is creating comprehensive, donor-aligned content for your selected sections with detailed guidance and examples. This typically takes 3-5 minutes depending on the number of sections.',
                steps: [
                  'Analyzing RFP requirements and selected sections',
                  'Generating detailed narrative content with examples',
                  'Finalizing and validating concept document',
                ],
              }
            : analysisProgress
        }
      />
      <DraftConfirmationModal
        isOpen={showExitModal}
        proposalCode={proposalCode}
        onSaveAndClose={handleSaveAndClose}
        onKeepDraft={handleKeepDraft}
        onDeleteDraft={handleDeleteDraft}
        isSaving={isSavingDraft}
        isDeleting={isDeleting}
      />
      <ProposalLayout
        currentStep={currentStep}
        completedSteps={completedSteps}
        navigationButtons={navigationButtons}
        proposalCode={proposalCode}
        proposalId={proposalId}
        proposalStatus={proposalStatus}
        isLoadingProposal={isCreating}
        isLoadingStepData={isLoadingStepData}
        onNavigateAway={handleNavigateAway}
      >
        {renderCurrentStep()}
      </ProposalLayout>
    </>
  )
}
