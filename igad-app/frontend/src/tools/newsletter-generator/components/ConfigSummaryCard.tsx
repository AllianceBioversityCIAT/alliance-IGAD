/**
 * ConfigSummaryCard
 *
 * Displays a read-only summary of Step 1 configuration.
 * Used in Step 2 to show the current newsletter settings.
 */

import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  AUDIENCE_OPTIONS,
  TONE_OPTIONS,
  LENGTH_OPTIONS,
  FREQUENCY_OPTIONS,
} from '../types/newsletter'
import styles from './ConfigSummaryCard.module.css'

interface ConfigSummaryCardProps {
  newsletterCode: string
  targetAudience: string[]
  tonePreset: string
  lengthPreference: string
  frequency: string
}

export function ConfigSummaryCard({
  newsletterCode,
  targetAudience,
  tonePreset,
  lengthPreference,
  frequency,
}: ConfigSummaryCardProps) {
  // Get display labels from options
  const audienceLabels = targetAudience
    .map(id => AUDIENCE_OPTIONS.find(opt => opt.id === id)?.label)
    .filter(Boolean)

  const toneLabel = TONE_OPTIONS.find(opt => opt.value === tonePreset)?.label ?? tonePreset
  const lengthOption = LENGTH_OPTIONS.find(opt => opt.value === lengthPreference)
  const lengthLabel = lengthOption?.label ?? lengthPreference
  const frequencyLabel = FREQUENCY_OPTIONS.find(opt => opt.value === frequency)?.label ?? frequency

  return (
    <div className={styles.configSummary}>
      <div className={styles.header}>
        <h3 className={styles.title}>Configuration Summary</h3>
        <Link to={`/newsletter-generator/${newsletterCode}/step-1`} className={styles.editLink}>
          <ArrowLeft size={14} />
          Edit in Step 1
        </Link>
      </div>

      <div className={styles.configGrid}>
        {/* Audience */}
        <div className={styles.configItem}>
          <span className={styles.configLabel}>Target Audience</span>
          <div className={styles.configValue}>
            {audienceLabels.length > 0 ? (
              <div className={styles.audienceBadges}>
                {audienceLabels.map((label, i) => (
                  <span key={i} className={styles.audienceBadge}>
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <span className={styles.configEmpty}>Not set</span>
            )}
          </div>
        </div>

        {/* Tone */}
        <div className={styles.configItem}>
          <span className={styles.configLabel}>Writing Tone</span>
          <span className={styles.configValue}>{toneLabel}</span>
        </div>

        {/* Length */}
        <div className={styles.configItem}>
          <span className={styles.configLabel}>Content Length</span>
          <span className={styles.configValue}>{lengthLabel}</span>
        </div>

        {/* Frequency */}
        <div className={styles.configItem}>
          <span className={styles.configLabel}>Frequency</span>
          <span className={styles.configValue}>{frequencyLabel}</span>
        </div>
      </div>
    </div>
  )
}
