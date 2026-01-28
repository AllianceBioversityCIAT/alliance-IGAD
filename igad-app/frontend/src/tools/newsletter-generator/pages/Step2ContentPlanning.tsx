/**
 * Step2ContentPlanning
 *
 * Newsletter Generator Step 2: Content Planning
 * Allows users to select information types and retrieve content from Knowledge Base.
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
  Search,
  ExternalLink,
  FileText,
  Calendar,
} from 'lucide-react'
import { NewsletterLayout } from '../components/NewsletterLayout'
import { ConfigSummaryCard } from '../components/ConfigSummaryCard'
import { TopicSelector } from '../components/TopicSelector'
import { RetrievalProgress } from '../components/RetrievalProgress'
import { useNewsletter } from '../hooks/useNewsletter'
import { newsletterService, type TopicsData } from '../services/newsletterService'
import { useToast } from '@/shared/hooks/useToast'
import { DEFAULT_NEWSLETTER_CONFIG, INFORMATION_TYPES, CATEGORY_CONFIG } from '../types/newsletter'
import styles from './newsletterGenerator.module.css'
import step2Styles from './Step2ContentPlanning.module.css'

const POLLING_INTERVAL = 2000 // 2 seconds
const POLLING_TIMEOUT = 300000 // 5 minutes

// Helper to parse and extract readable content from Knowledge Base chunks
interface ParsedChunkContent {
  title?: string
  description?: string
  sourceName?: string
  sourceType?: string
  sourceUrl?: string
  articleUrl?: string
  publishedAt?: string
  rawText?: string
}

function parseChunkContent(content: string): ParsedChunkContent {
  // Try to parse as JSON
  try {
    let cleanContent = content.trim()

    // The Knowledge Base returns escaped JSON where backslashes precede various characters
    // We need to carefully unescape while preserving valid JSON escape sequences

    // Check first character code - backslash is char code 92
    const firstCharCode = cleanContent.charCodeAt(0)
    const hasEscapedStart = firstCharCode === 92 // backslash

    if (hasEscapedStart) {
      // The content is "double escaped" - remove the outer layer of escaping
      // Remove ALL single backslashes that aren't followed by valid JSON escape chars
      // Valid JSON escapes: " \ / b f n r t u
      // First, protect double backslashes temporarily
      const PLACEHOLDER = '___DOUBLE_BACKSLASH___'
      cleanContent = cleanContent
        .replace(/\\\\/g, PLACEHOLDER)
        // Remove backslashes before non-escape characters
        .replace(/\\([^"bfnrtu\\])/g, '$1')
        // Restore double backslashes as single
        .replace(new RegExp(PLACEHOLDER, 'g'), '\\')
    }

    // Check if it looks like JSON after cleanup
    if (!cleanContent.startsWith('{')) {
      return { rawText: content }
    }

    const parsed = JSON.parse(cleanContent)
    return {
      title: parsed.title || parsed.name,
      description: parsed.description || parsed.summary || parsed.text || parsed.body,
      sourceName: parsed.sourceName || parsed.source_name || parsed.source,
      sourceType: parsed.sourceType || parsed.source_type || parsed.type,
      sourceUrl: parsed.sourceUrl || parsed.source_url,
      articleUrl: parsed.articleUrl || parsed.article_url || parsed.url || parsed.link,
      publishedAt: parsed.publishedAt || parsed.published_at || parsed.date || parsed.pubDate,
    }
  } catch {
    // Not JSON or invalid JSON, treat as plain text
    return {
      rawText: content,
    }
  }
}

function formatPublishedDate(dateStr: string | undefined): string | null {
  if (!dateStr) {
    return null
  }
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return null
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return null
  }
}

function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) {
    return ''
  }
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength).trim() + '...'
}

export function Step2ContentPlanning() {
  const { newsletterCode } = useParams<{ newsletterCode: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  // Newsletter hook for config data
  const { newsletter, isLoading, isSaving, updateConfig } = useNewsletter({
    newsletterCode,
    autoSaveDelay: 500,
  })

  // Local state for topics
  const [topicsData, setTopicsData] = useState<TopicsData | null>(null)
  const [isLoadingTopics, setIsLoadingTopics] = useState(true)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [isTriggering, setIsTriggering] = useState(false)

  // Polling state
  const [isPolling, setIsPolling] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingStartTimeRef = useRef<number | null>(null)

  // Extract config values
  const targetAudience = newsletter?.target_audience ?? DEFAULT_NEWSLETTER_CONFIG.target_audience
  const tonePreset =
    newsletter?.tone_preset ?? DEFAULT_NEWSLETTER_CONFIG.tone_preset ?? 'industry_insight'
  const lengthPreference =
    newsletter?.length_preference ?? DEFAULT_NEWSLETTER_CONFIG.length_preference
  const frequency = newsletter?.frequency ?? DEFAULT_NEWSLETTER_CONFIG.frequency

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Load topics data on mount
  useEffect(() => {
    if (!newsletterCode) {
      return
    }

    const loadTopics = async () => {
      try {
        setIsLoadingTopics(true)
        const data = await newsletterService.getTopics(newsletterCode)
        setTopicsData(data)
        setSelectedTopics(data.selected_types || [])

        // If retrieval is in progress, start polling
        if (data.retrieval_status === 'processing') {
          startPolling()
        }
      } catch {
        showError('Failed to load content settings')
      } finally {
        setIsLoadingTopics(false)
      }
    }

    loadTopics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsletterCode])

  // Polling functions - stopPolling defined first since startPolling depends on it
  const stopPolling = useCallback(() => {
    setIsPolling(false)
    pollingStartTimeRef.current = null

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      return
    }

    setIsPolling(true)
    pollingStartTimeRef.current = Date.now()

    pollingIntervalRef.current = setInterval(async () => {
      if (!newsletterCode) {
        return
      }

      // Check timeout
      if (
        pollingStartTimeRef.current &&
        Date.now() - pollingStartTimeRef.current > POLLING_TIMEOUT
      ) {
        stopPolling()
        showError('Content retrieval timed out', 'Please try again.')
        setTopicsData(prev =>
          prev
            ? {
                ...prev,
                retrieval_status: 'failed',
                retrieval_error: 'Retrieval timed out after 5 minutes',
              }
            : null
        )
        return
      }

      try {
        const status = await newsletterService.getRetrievalStatus(newsletterCode)
        setTopicsData(status)

        if (status.retrieval_status === 'completed' || status.retrieval_status === 'failed') {
          stopPolling()

          if (status.retrieval_status === 'completed') {
            showSuccess(`Retrieved ${status.total_chunks_retrieved} content chunks`)
          }
        }
      } catch {
        // Continue polling on transient errors
      }
    }, POLLING_INTERVAL)
  }, [newsletterCode, showError, showSuccess, stopPolling])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  // Handle topic selection change
  const handleTopicChange = async (topics: string[]) => {
    setSelectedTopics(topics)

    if (!newsletterCode) {
      return
    }

    try {
      await newsletterService.saveTopics(newsletterCode, topics)
    } catch {
      showError('Failed to save topic selection')
    }
  }

  // Trigger content retrieval
  const handleRetrieveContent = async () => {
    if (!newsletterCode || selectedTopics.length === 0) {
      return
    }

    setIsTriggering(true)

    try {
      // Save topics first
      await newsletterService.saveTopics(newsletterCode, selectedTopics)

      // Trigger retrieval
      const result = await newsletterService.triggerContentRetrieval(newsletterCode, selectedTopics)

      if (result.success) {
        // Update local state
        setTopicsData(prev => ({
          ...prev!,
          selected_types: selectedTopics,
          retrieval_status: result.retrieval_status as TopicsData['retrieval_status'],
          total_chunks_retrieved: result.total_chunks_retrieved || 0,
          retrieval_started_at: result.retrieval_started_at,
          retrieval_completed_at: result.retrieval_completed_at,
          retrieval_error: undefined,
        }))

        // If still processing, start polling
        if (result.retrieval_status === 'processing') {
          startPolling()
        } else if (result.retrieval_status === 'completed') {
          // Refresh full data
          const fullData = await newsletterService.getRetrievalStatus(newsletterCode)
          setTopicsData(fullData)
          showSuccess(`Retrieved ${fullData.total_chunks_retrieved} content chunks`)
        }
      } else {
        setTopicsData(prev => ({
          ...prev!,
          retrieval_status: 'failed',
          retrieval_error: result.retrieval_error || 'Unknown error',
        }))
        showError('Content retrieval failed')
      }
    } catch {
      showError('Failed to start content retrieval')
      setTopicsData(prev =>
        prev
          ? {
              ...prev,
              retrieval_status: 'failed',
              retrieval_error: 'Network error. Please try again.',
            }
          : null
      )
    } finally {
      setIsTriggering(false)
    }
  }

  // Config change detection
  const configChanged = useMemo(() => {
    if (!topicsData?.retrieval_config || !newsletter) {
      return false
    }

    const saved = topicsData.retrieval_config
    return (
      saved.tone_preset !== newsletter.tone_preset ||
      saved.frequency !== newsletter.frequency ||
      saved.length_preference !== newsletter.length_preference ||
      JSON.stringify([...(saved.target_audience || [])].sort()) !==
        JSON.stringify([...(newsletter.target_audience || [])].sort())
    )
  }, [topicsData, newsletter])

  // Calculate completed steps
  const completedSteps: number[] = []
  if (newsletter?.current_step && newsletter.current_step > 1) {
    completedSteps.push(1)
  }

  // Check if can proceed
  const canProceed = useMemo(() => {
    return (
      selectedTopics.length > 0 &&
      topicsData?.retrieval_status === 'completed' &&
      (topicsData?.total_chunks_retrieved ?? 0) > 0 &&
      !configChanged
    )
  }, [selectedTopics, topicsData, configChanged])

  // Navigation handlers
  const handlePrevious = () => {
    navigate(`/newsletter-generator/${newsletterCode}/step-1`)
  }

  const handleNext = () => {
    updateConfig({ current_step: 3 })
    navigate(`/newsletter-generator/${newsletterCode}/step-3`)
  }

  // Navigation buttons
  const navigationButtons = [
    <button
      key="previous"
      className={`${styles.navButton} ${styles.navButtonSecondary}`}
      onClick={handlePrevious}
      disabled={isLoading}
    >
      <ChevronLeft size={18} />
      Previous
    </button>,
    <button
      key="next"
      className={`${styles.navButton} ${styles.navButtonPrimary}`}
      onClick={handleNext}
      disabled={!canProceed || isLoading}
    >
      Next
      <ChevronRight size={18} />
    </button>,
  ]

  // Get retrieval status for display
  const retrievalStatus = topicsData?.retrieval_status ?? 'pending'
  const isRetrieving = retrievalStatus === 'processing' || isTriggering || isPolling

  return (
    <NewsletterLayout
      currentStep={2}
      completedSteps={completedSteps}
      navigationButtons={navigationButtons}
      newsletterCode={newsletter?.newsletterCode}
      newsletterId={newsletter?.id}
      newsletterStatus={newsletter?.status}
      isLoadingNewsletter={isLoading}
      isLoadingStepData={isLoading || isLoadingTopics}
    >
      <div className={styles.stepContentWrapper}>
        {/* Info Card */}
        <div className={styles.infoCard}>
          <div className={styles.infoCardTitle}>
            <Info
              size={18}
              style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }}
            />
            Content Planning
          </div>
          <p className={styles.infoCardDescription}>
            Select the types of information you want to include in your newsletter. Based on your
            selections, we&apos;ll retrieve relevant content from our knowledge base to help
            generate your newsletter outline.
          </p>
        </div>

        {/* Config Summary */}
        {newsletterCode && (
          <ConfigSummaryCard
            newsletterCode={newsletterCode}
            targetAudience={targetAudience}
            tonePreset={tonePreset}
            lengthPreference={lengthPreference}
            frequency={frequency}
          />
        )}

        {/* Config Change Warning */}
        {configChanged && topicsData?.retrieval_status === 'completed' && (
          <div className={step2Styles.configWarning}>
            <AlertTriangle size={20} />
            <div className={step2Styles.configWarningContent}>
              <span className={step2Styles.configWarningTitle}>Configuration Changed</span>
              <span className={step2Styles.configWarningText}>
                Your Step 1 settings have changed since content was last retrieved. Please
                re-retrieve content to ensure it matches your current configuration.
              </span>
            </div>
          </div>
        )}

        {/* Topic Selection Card */}
        <div className={styles.formCard}>
          <h3 className={styles.formCardTitle}>Select Information Types</h3>
          <p className={styles.formCardDescription}>
            Choose the topics you want to include. Topics are sorted by relevance to your target
            audience.
          </p>
          <TopicSelector
            selectedTopics={selectedTopics}
            onTopicChange={handleTopicChange}
            targetAudience={targetAudience}
            disabled={isRetrieving}
          />
        </div>

        {/* Retrieval Section */}
        <div className={styles.formCard}>
          <h3 className={styles.formCardTitle}>Content Retrieval</h3>
          <p className={styles.formCardDescription}>
            Retrieve relevant content from our knowledge base based on your selected topics.
          </p>

          <RetrievalProgress
            status={isTriggering ? 'processing' : retrievalStatus}
            chunksRetrieved={topicsData?.total_chunks_retrieved ?? 0}
            error={topicsData?.retrieval_error}
            onRetry={retrievalStatus === 'completed' ? handleRetrieveContent : undefined}
          />

          {/* Retrieve Button */}
          {(retrievalStatus === 'pending' || retrievalStatus === 'failed' || configChanged) && (
            <button
              className={step2Styles.retrieveButton}
              onClick={handleRetrieveContent}
              disabled={selectedTopics.length === 0 || isRetrieving}
            >
              <Search size={18} />
              {configChanged ? 'Re-retrieve Content' : 'Retrieve Content'}
            </button>
          )}
        </div>

        {/* Retrieved Content Preview */}
        {retrievalStatus === 'completed' &&
          topicsData?.retrieved_content &&
          topicsData.retrieved_content.length > 0 && (
            <div className={styles.formCard}>
              <h3 className={styles.formCardTitle}>Retrieved Content Preview</h3>
              <p className={styles.formCardDescription}>
                Preview of content that will be used to generate your newsletter outline.
              </p>
              <div className={step2Styles.contentPreview}>
                {topicsData.retrieved_content.slice(0, 5).map((chunk, index) => {
                  const topic = INFORMATION_TYPES.find(t => t.id === chunk.topic_id)
                  const categoryConfig = topic ? CATEGORY_CONFIG[topic.category] : null
                  const parsed = parseChunkContent(chunk.content)

                  return (
                    <div key={chunk.chunk_id || index} className={step2Styles.contentChunk}>
                      <div className={step2Styles.chunkHeader}>
                        {categoryConfig && (
                          <span
                            className={step2Styles.chunkBadge}
                            style={{
                              backgroundColor: categoryConfig.bgColor,
                              color: categoryConfig.color,
                            }}
                          >
                            {topic?.name || chunk.topic_id}
                          </span>
                        )}
                        <span className={step2Styles.chunkScore}>
                          {Math.round(Number(chunk.score) * 100)}% match
                        </span>
                      </div>

                      {/* Source info and date */}
                      {(parsed.sourceName || parsed.sourceType || parsed.publishedAt) && (
                        <div className={step2Styles.chunkMeta}>
                          <div className={step2Styles.chunkSource}>
                            <FileText size={14} className={step2Styles.chunkSourceIcon} />
                            {parsed.sourceName && (
                              <span className={step2Styles.chunkSourceName}>
                                {parsed.sourceName}
                              </span>
                            )}
                            {parsed.sourceType && (
                              <span className={step2Styles.chunkSourceType}>
                                {parsed.sourceType}
                              </span>
                            )}
                          </div>
                          {formatPublishedDate(parsed.publishedAt) && (
                            <div className={step2Styles.chunkDate}>
                              <Calendar size={14} className={step2Styles.chunkDateIcon} />
                              <span className={step2Styles.chunkDateText}>
                                {formatPublishedDate(parsed.publishedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Title */}
                      {parsed.title && (
                        <h4 className={step2Styles.chunkTitle}>
                          {truncateText(parsed.title, 100)}
                        </h4>
                      )}

                      {/* Description */}
                      {parsed.description && (
                        <p className={step2Styles.chunkDescription}>
                          {truncateText(parsed.description, 250)}
                        </p>
                      )}

                      {/* Raw text fallback */}
                      {parsed.rawText && (
                        <p className={step2Styles.chunkContent}>
                          {truncateText(parsed.rawText, 300)}
                        </p>
                      )}

                      {/* Link to source */}
                      {(parsed.articleUrl || parsed.sourceUrl) && (
                        <a
                          href={parsed.articleUrl || parsed.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={step2Styles.chunkLink}
                        >
                          <ExternalLink size={12} />
                          View source
                        </a>
                      )}
                    </div>
                  )
                })}
                {topicsData.retrieved_content.length > 5 && (
                  <div className={step2Styles.moreContent}>
                    +{topicsData.retrieved_content.length - 5} more content chunks
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Auto-save indicator */}
        {isSaving && (
          <div style={{ textAlign: 'center', color: '#717182', fontSize: '13px' }}>
            Saving changes...
          </div>
        )}
      </div>
    </NewsletterLayout>
  )
}
