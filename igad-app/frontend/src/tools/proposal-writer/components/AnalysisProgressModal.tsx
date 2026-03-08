import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  FileSearch,
  Library,
  Lightbulb,
  PenTool,
  LayoutTemplate,
  MessageSquare,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import styles from './AnalysisProgressModal.module.css'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProgressPhase {
  label: string
  weight: number // 0-100, all phases should sum to 100
  estimatedSeconds: number
  icon?: 'file-search' | 'library' | 'lightbulb' | 'pen-tool' | 'layout-template' | 'message-square'
  contextMessages: string[]
}

export interface ProgressConfig {
  title: string
  phases: ProgressPhase[]
  tips?: string[]
}

interface AnalysisProgressModalProps {
  isOpen: boolean
  config?: ProgressConfig | null
  /** Current completed step (1-indexed). 0 = no steps completed yet. */
  completedStep: number
  /** Error info for in-modal error display */
  error?: { message: string; phase?: number } | null
  onRetry?: () => void
  onKeepWaiting?: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTEXT_MESSAGE_INTERVAL = 7000 // 7s between message rotations
const TIP_INTERVAL = 12000 // 12s between tip rotations

const DEFAULT_TIPS = [
  'Reference proposals help the AI identify winning patterns from past successes',
  'The AI cross-references your concept with RFP evaluation criteria',
  'Detailed concept sections lead to stronger proposal templates',
  'AI feedback focuses on donor alignment and competitive positioning',
  'Your existing work documents help the AI build on proven approaches',
]

const PHASE_ICONS = {
  'file-search': FileSearch,
  'library': Library,
  'lightbulb': Lightbulb,
  'pen-tool': PenTool,
  'layout-template': LayoutTemplate,
  'message-square': MessageSquare,
} as const

// ─── Pre-built configs for each operation ────────────────────────────────────

export const PROGRESS_CONFIGS = {
  step1Analysis: {
    title: 'Analyzing Your Proposal',
    phases: [
      {
        label: 'RFP Analysis',
        weight: 25,
        estimatedSeconds: 25,
        icon: 'file-search' as const,
        contextMessages: [
          'Extracting key requirements and evaluation criteria...',
          'Identifying budget constraints and timeline expectations...',
          'Mapping donor priorities and strategic objectives...',
        ],
      },
      {
        label: 'Reference Proposals & Existing Work',
        weight: 45,
        estimatedSeconds: 35,
        icon: 'library' as const,
        contextMessages: [
          'Reading through your reference proposals...',
          'Extracting winning patterns and successful approaches...',
          'Identifying reusable methodologies from past work...',
        ],
      },
      {
        label: 'Initial Concept',
        weight: 30,
        estimatedSeconds: 25,
        icon: 'lightbulb' as const,
        contextMessages: [
          'Evaluating concept alignment with RFP requirements...',
          'Assessing target population and geographic fit...',
          'Generating strategic recommendations...',
        ],
      },
    ],
    tips: DEFAULT_TIPS,
  },

  conceptRegeneration: {
    title: 'Regenerating Concept Analysis',
    phases: [
      {
        label: 'Analyzing Alignment',
        weight: 50,
        estimatedSeconds: 40,
        icon: 'lightbulb' as const,
        contextMessages: [
          'Analyzing concept note and RFP alignment...',
          'Evaluating thematic relevance to donor priorities...',
        ],
      },
      {
        label: 'Generating Assessment',
        weight: 50,
        estimatedSeconds: 40,
        icon: 'message-square' as const,
        contextMessages: [
          'Generating fit assessment and improvement areas...',
          'Preparing strategic recommendations...',
        ],
      },
    ],
    tips: DEFAULT_TIPS,
  },

  conceptDocGeneration: {
    title: 'Generating Enhanced Concept Document',
    phases: [
      {
        label: 'Analyzing & Drafting',
        weight: 40,
        estimatedSeconds: 60,
        icon: 'lightbulb' as const,
        contextMessages: [
          'Analyzing selected sections for improvement...',
          'Incorporating your feedback and comments...',
        ],
      },
      {
        label: 'Generating Content',
        weight: 40,
        estimatedSeconds: 90,
        icon: 'pen-tool' as const,
        contextMessages: [
          'Generating detailed narrative with donor-aligned language...',
          'Building evidence-based arguments for each section...',
        ],
      },
      {
        label: 'Finalizing Document',
        weight: 20,
        estimatedSeconds: 30,
        icon: 'pen-tool' as const,
        contextMessages: [
          'Ensuring consistency across all sections...',
          'Finalizing and validating concept document...',
        ],
      },
    ],
    tips: DEFAULT_TIPS,
  },

  structureWorkplan: {
    title: 'Generating Proposal Structure',
    phases: [
      {
        label: 'Generating Structure',
        weight: 100,
        estimatedSeconds: 120,
        icon: 'layout-template' as const,
        contextMessages: [
          'Mapping RFP requirements to proposal sections...',
          'Incorporating insights from reference proposals...',
          'Drafting executive summary and project rationale...',
          'Building workplan with realistic timelines...',
          'Generating budget narrative and resource allocation...',
          'Finalizing cross-references between sections...',
        ],
      },
    ],
    tips: DEFAULT_TIPS,
  },

  templateGeneration: {
    title: 'Generating Proposal Template',
    phases: [
      {
        label: 'Generating Template',
        weight: 100,
        estimatedSeconds: 180,
        icon: 'pen-tool' as const,
        contextMessages: [
          'Mapping RFP requirements to proposal sections...',
          'Incorporating insights from reference proposals...',
          'Drafting executive summary and project rationale...',
          'Building workplan with realistic timelines...',
          'Generating budget narrative and resource allocation...',
          'Finalizing cross-references between sections...',
        ],
      },
    ],
    tips: DEFAULT_TIPS,
  },

  draftFeedback: {
    title: 'Analyzing Draft Proposal',
    phases: [
      {
        label: 'Extracting Content',
        weight: 30,
        estimatedSeconds: 20,
        icon: 'file-search' as const,
        contextMessages: [
          'Extracting content from your draft document...',
          'Parsing document structure and sections...',
        ],
      },
      {
        label: 'Analyzing & Generating Feedback',
        weight: 70,
        estimatedSeconds: 70,
        icon: 'message-square' as const,
        contextMessages: [
          'Comparing each section against RFP criteria...',
          'Identifying gaps and improvement opportunities...',
          'Generating actionable feedback per section...',
        ],
      },
    ],
    tips: DEFAULT_TIPS,
  },

  proposalDocGeneration: {
    title: 'Refining Your Proposal',
    phases: [
      {
        label: 'Initiating AI Refinement',
        weight: 10,
        estimatedSeconds: 10,
        icon: 'lightbulb' as const,
        contextMessages: [
          'Sending selected sections and comments to AI...',
          'Preparing refinement instructions...',
        ],
      },
      {
        label: 'AI Refinement in Progress',
        weight: 70,
        estimatedSeconds: 150,
        icon: 'pen-tool' as const,
        contextMessages: [
          'AI is refining your proposal sections...',
          'Incorporating your feedback and comments...',
          'Building evidence-based arguments for each section...',
          'Ensuring consistency across all sections...',
        ],
      },
      {
        label: 'Processing Document',
        weight: 15,
        estimatedSeconds: 10,
        icon: 'layout-template' as const,
        contextMessages: [
          'Processing refined document...',
          'Preparing document for download...',
        ],
      },
      {
        label: 'Generating DOCX',
        weight: 5,
        estimatedSeconds: 5,
        icon: 'pen-tool' as const,
        contextMessages: ['Generating DOCX file for download...'],
      },
    ],
    tips: DEFAULT_TIPS,
  },

  preparingDraft: {
    title: 'Preparing Draft for Review',
    phases: [
      {
        label: 'Transferring Content',
        weight: 60,
        estimatedSeconds: 10,
        icon: 'pen-tool' as const,
        contextMessages: ['Transferring AI-generated content...'],
      },
      {
        label: 'Setting Up',
        weight: 40,
        estimatedSeconds: 5,
        icon: 'layout-template' as const,
        contextMessages: ['Setting up for analysis...'],
      },
    ],
  },

  resuming: {
    title: 'Reconnecting to Your Analysis',
    phases: [
      {
        label: 'Resuming',
        weight: 100,
        estimatedSeconds: 30,
        icon: 'lightbulb' as const,
        contextMessages: [
          'We detected an analysis in progress...',
          'Reconnecting to your running analysis...',
        ],
      },
    ],
    tips: DEFAULT_TIPS,
  },
} satisfies Record<string, ProgressConfig>

// ─── Component ───────────────────────────────────────────────────────────────

const AnalysisProgressModal: React.FC<AnalysisProgressModalProps> = ({
  isOpen,
  config,
  completedStep,
  error,
  onRetry,
  onKeepWaiting,
}) => {
  const [contextMsgIndex, setContextMsgIndex] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)
  const [isContextFading, setIsContextFading] = useState(false)
  const [smoothProgress, setSmoothProgress] = useState(0)
  const [phaseDurations, setPhaseDurations] = useState<Record<number, number>>({})

  const startTimeRef = useRef<number>(Date.now())
  const phaseStartTimeRef = useRef<number>(Date.now())
  const animFrameRef = useRef<number>(0)

  // Reset state when modal opens or config changes
  useEffect(() => {
    if (isOpen && config) {
      startTimeRef.current = Date.now()
      phaseStartTimeRef.current = Date.now()
      setContextMsgIndex(0)
      setTipIndex(0)
      setSmoothProgress(0)
      setPhaseDurations({})
    }
  }, [isOpen, config?.title])

  // Track phase start time when completedStep changes
  useEffect(() => {
    if (completedStep > 0) {
      // Record duration of the completed phase
      const elapsed = (Date.now() - phaseStartTimeRef.current) / 1000
      setPhaseDurations(prev => ({ ...prev, [completedStep - 1]: elapsed }))
    }
    phaseStartTimeRef.current = Date.now()
  }, [completedStep])

  // Smooth progress animation
  useEffect(() => {
    if (!isOpen || !config) return

    const phases = config.phases
    const animate = () => {
      const now = Date.now()

      // Calculate completed weight
      let completedWeight = 0
      for (let i = 0; i < completedStep && i < phases.length; i++) {
        completedWeight += phases[i].weight
      }

      // Calculate current phase progress
      const activePhaseIndex = Math.min(completedStep, phases.length - 1)
      const activePhase = phases[activePhaseIndex]

      if (completedStep < phases.length && activePhase) {
        const phaseElapsed = (now - phaseStartTimeRef.current) / 1000
        const phaseRatio = Math.min(phaseElapsed / activePhase.estimatedSeconds, 0.85)
        const eased = 1 - Math.pow(1 - phaseRatio, 2) // ease-out
        completedWeight += activePhase.weight * eased
      } else if (completedStep >= phases.length) {
        // All phases done
        completedWeight = 100
      }

      setSmoothProgress(Math.min(completedWeight, 100))
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isOpen, config, completedStep])

  // Context message rotation
  useEffect(() => {
    if (!isOpen || !config) return
    const activePhaseIndex = Math.min(completedStep, config.phases.length - 1)
    const msgs = config.phases[activePhaseIndex]?.contextMessages || []
    if (msgs.length <= 1) return

    setContextMsgIndex(0)
    const interval = setInterval(() => {
      setIsContextFading(true)
      setTimeout(() => {
        setContextMsgIndex(prev => (prev + 1) % msgs.length)
        setIsContextFading(false)
      }, 300)
    }, CONTEXT_MESSAGE_INTERVAL)

    return () => clearInterval(interval)
  }, [isOpen, config, completedStep])

  // Tip rotation
  useEffect(() => {
    if (!isOpen || !config?.tips?.length) return
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % (config.tips?.length || 1))
    }, TIP_INTERVAL)
    return () => clearInterval(interval)
  }, [isOpen, config?.tips])

  const timeRemaining = useMemo(() => {
    if (!config) return ''
    const phases = config.phases

    // Sum remaining estimated time
    let remaining = 0
    for (let i = completedStep; i < phases.length; i++) {
      if (i === completedStep) {
        // Current phase: subtract elapsed
        const elapsed = (Date.now() - phaseStartTimeRef.current) / 1000
        remaining += Math.max(phases[i].estimatedSeconds - elapsed, 0)
      } else {
        remaining += phases[i].estimatedSeconds
      }
    }

    if (remaining <= 0) return 'Finishing up...'
    if (remaining < 60) return `~${Math.ceil(remaining)}s remaining`
    return `~${Math.ceil(remaining / 60)}m remaining`
  }, [config, completedStep, smoothProgress])

  const getPhaseIcon = useCallback((iconName?: string) => {
    const IconComponent = iconName ? PHASE_ICONS[iconName as keyof typeof PHASE_ICONS] : null
    return IconComponent || Lightbulb
  }, [])

  if (!isOpen || !config) return null

  const phases = config.phases
  const activePhaseIndex = Math.min(completedStep, phases.length - 1)
  const activePhase = phases[activePhaseIndex]
  const ActiveIcon = getPhaseIcon(activePhase?.icon)
  const currentContextMsg = activePhase?.contextMessages[contextMsgIndex % (activePhase?.contextMessages.length || 1)] || ''
  const tips = config.tips || []
  const currentTip = tips.length > 0 ? tips[tipIndex % tips.length] : ''
  const allDone = completedStep >= phases.length

  // Error state
  if (error) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.errorIconContainer}>
            <AlertTriangle size={32} className={styles.errorIcon} />
          </div>
          <h2 className={styles.title}>Taking Longer Than Expected</h2>
          <p className={styles.description}>
            {error.message || 'The analysis is still running on our servers. This can happen with larger documents.'}
          </p>
          <div className={styles.errorActions}>
            {onKeepWaiting && (
              <button className={styles.keepWaitingButton} onClick={onKeepWaiting}>
                Keep Waiting
              </button>
            )}
            {onRetry && (
              <button className={styles.retryButton} onClick={onRetry}>
                Retry Analysis
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Phase Icon */}
        <div className={styles.iconContainer}>
          <div className={styles.iconCircle}>
            <ActiveIcon size={28} className={styles.phaseIcon} />
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2 className={styles.title}>{config.title}</h2>
        <p className={styles.subtitle}>
          {allDone
            ? 'Finishing up...'
            : `Step ${completedStep + 1} of ${phases.length} · ${timeRemaining}`}
        </p>

        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${smoothProgress}%` }}
          />
          <span className={styles.progressPercent}>{Math.round(smoothProgress)}%</span>
        </div>

        {/* Currently Activity Box */}
        <div className={styles.activityBox}>
          <div className={styles.activityDot} />
          <span className={`${styles.activityText} ${isContextFading ? styles.activityFading : ''}`}>
            {currentContextMsg}
          </span>
        </div>

        {/* Steps List */}
        <div className={styles.steps}>
          {phases.map((phase, index) => {
            const isCompleted = index < completedStep
            const isActive = index === completedStep && !allDone
            const duration = phaseDurations[index]
            const PhaseStepIcon = getPhaseIcon(phase.icon)

            return (
              <div
                key={phase.label}
                className={`${styles.step} ${isCompleted ? styles.stepCompleted : ''} ${isActive ? styles.stepActive : ''}`}
              >
                <div className={styles.stepIcon}>
                  {isCompleted ? (
                    <Check size={14} />
                  ) : isActive ? (
                    <Loader2 size={14} className={styles.spinIcon} />
                  ) : (
                    <PhaseStepIcon size={14} />
                  )}
                </div>
                <span className={styles.stepText}>{phase.label}</span>
                {isCompleted && duration !== undefined && (
                  <span className={styles.stepDuration}>{Math.round(duration)}s</span>
                )}
                {isActive && <span className={styles.stepDuration}>...</span>}
              </div>
            )
          })}
        </div>

        {/* Educational Tip */}
        {currentTip && (
          <div className={styles.tipBox}>
            <Lightbulb size={14} className={styles.tipIcon} />
            <span className={styles.tipText}>{currentTip}</span>
          </div>
        )}

        {/* Footer */}
        <p className={styles.footer}>Your analysis is running securely on our servers</p>
      </div>
    </div>
  )
}

export default AnalysisProgressModal
