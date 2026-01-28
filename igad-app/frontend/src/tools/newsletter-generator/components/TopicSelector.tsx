/**
 * TopicSelector
 *
 * Allows users to select information types for newsletter content.
 * Groups topics by category and shows relevance based on target audience.
 */

import { Check, Star } from 'lucide-react'
import {
  INFORMATION_TYPES,
  CATEGORY_CONFIG,
  getRelevanceLevel,
  getRecommendedTopics,
  type InformationCategory,
  type RelevanceLevel,
} from '../types/newsletter'
import styles from './TopicSelector.module.css'

interface TopicSelectorProps {
  selectedTopics: string[]
  onTopicChange: (topics: string[]) => void
  targetAudience: string[]
  disabled?: boolean
}

export function TopicSelector({
  selectedTopics,
  onTopicChange,
  targetAudience,
  disabled = false,
}: TopicSelectorProps) {
  // Get recommended topics based on audience
  const recommendedTopics = getRecommendedTopics(targetAudience)

  // Group topics by category
  const topicsByCategory = INFORMATION_TYPES.reduce(
    (acc, topic) => {
      if (!acc[topic.category]) {
        acc[topic.category] = []
      }
      acc[topic.category].push(topic)
      return acc
    },
    {} as Record<InformationCategory, typeof INFORMATION_TYPES>
  )

  // Toggle topic selection
  const handleToggle = (topicId: string) => {
    if (disabled) {
      return
    }

    const newTopics = selectedTopics.includes(topicId)
      ? selectedTopics.filter(id => id !== topicId)
      : [...selectedTopics, topicId]

    onTopicChange(newTopics)
  }

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent, topicId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle(topicId)
    }
  }

  // Render relevance stars
  const renderRelevance = (level: RelevanceLevel) => {
    const starConfigs = {
      high: { filled: 3, color: styles.relevanceHigh },
      medium: { filled: 2, color: styles.relevanceMedium },
      low: { filled: 1, color: styles.relevanceLow },
    }

    const config = starConfigs[level]

    return (
      <span className={`${styles.relevanceStars} ${config.color}`} title={`${level} relevance`}>
        {[1, 2, 3].map(i => (
          <Star key={i} size={12} fill={i <= config.filled ? 'currentColor' : 'none'} />
        ))}
      </span>
    )
  }

  // Render topic item
  const renderTopicItem = (topicId: string, showRelevance = true) => {
    const topic = INFORMATION_TYPES.find(t => t.id === topicId)
    if (!topic) {
      return null
    }

    const isSelected = selectedTopics.includes(topicId)
    const relevance = getRelevanceLevel(topic, targetAudience)
    const categoryConfig = CATEGORY_CONFIG[topic.category]

    return (
      <div
        key={topicId}
        className={`${styles.topicItem} ${isSelected ? styles.topicItemSelected : ''} ${disabled ? styles.topicItemDisabled : ''}`}
        role="checkbox"
        aria-checked={isSelected}
        tabIndex={disabled ? -1 : 0}
        onClick={() => handleToggle(topicId)}
        onKeyDown={e => handleKeyDown(e, topicId)}
      >
        <div className={styles.topicToggle}>{isSelected && <Check size={14} />}</div>

        <div className={styles.topicInfo}>
          <span className={styles.topicName}>{topic.name}</span>
          <span className={styles.topicDescription}>{topic.description}</span>
        </div>

        <div className={styles.topicMeta}>
          <span
            className={styles.topicBadge}
            style={{
              backgroundColor: categoryConfig.bgColor,
              color: categoryConfig.color,
            }}
          >
            {categoryConfig.label}
          </span>
          {showRelevance && targetAudience.length > 0 && renderRelevance(relevance)}
        </div>
      </div>
    )
  }

  const categories: InformationCategory[] = ['news', 'insights', 'opportunities', 'resources']

  return (
    <div className={styles.topicSelector}>
      {/* Recommendations Section */}
      {recommendedTopics.length > 0 && (
        <div className={styles.recommendedSection}>
          <h4 className={styles.recommendedTitle}>
            <Star size={16} fill="currentColor" />
            Recommended for your audience
          </h4>
          <div className={styles.topicList}>
            {recommendedTopics.map(id => renderTopicItem(id, false))}
          </div>
        </div>
      )}

      {/* All Topics by Category */}
      {categories.map(category => {
        const topics = topicsByCategory[category]
        if (!topics || topics.length === 0) {
          return null
        }

        const categoryConfig = CATEGORY_CONFIG[category]

        return (
          <div key={category} className={styles.categorySection}>
            <h4 className={styles.categoryTitle} style={{ color: categoryConfig.color }}>
              <span
                className={styles.categoryDot}
                style={{ backgroundColor: categoryConfig.color }}
              />
              {categoryConfig.label}
            </h4>
            <div className={styles.topicList}>{topics.map(topic => renderTopicItem(topic.id))}</div>
          </div>
        )
      })}

      {/* Selection Counter */}
      <div className={styles.selectionCounter}>
        <span className={styles.selectionCount}>
          {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
        </span>
        {selectedTopics.length === 0 && (
          <span className={styles.selectionHint}>Select at least 1 topic to continue</span>
        )}
      </div>
    </div>
  )
}
