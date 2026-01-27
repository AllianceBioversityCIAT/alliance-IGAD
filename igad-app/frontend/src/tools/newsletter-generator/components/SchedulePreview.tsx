/**
 * SchedulePreview Component
 *
 * Shows "Next 3 scheduled runs" with dates calculated from current schedule.
 */

import { useMemo } from 'react'
import { Calendar } from 'lucide-react'
import type { ScheduleRule } from '../types/newsletter'
import {
  calculateNextRuns,
  formatScheduleDate,
  formatScheduleTime,
} from '../utils/scheduleCalculator'
import styles from '../pages/newsletterGenerator.module.css'

interface SchedulePreviewProps {
  rule: ScheduleRule
}

export function SchedulePreview({ rule }: SchedulePreviewProps) {
  const nextRuns = useMemo(() => {
    return calculateNextRuns(rule, 3)
  }, [rule])

  const timeDisplay = formatScheduleTime(rule.hour, rule.minute)

  if (nextRuns.length === 0) {
    return (
      <div className={styles.schedulePreview} aria-live="polite">
        <div className={styles.schedulePreviewHeader}>
          <Calendar size={16} className={styles.schedulePreviewIcon} />
          <span className={styles.schedulePreviewTitle}>Schedule Preview</span>
        </div>
        <p className={styles.schedulePreviewEmpty}>
          Unable to calculate scheduled dates. Please check your settings.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.schedulePreview} aria-live="polite">
      <div className={styles.schedulePreviewHeader}>
        <Calendar size={16} className={styles.schedulePreviewIcon} />
        <span className={styles.schedulePreviewTitle}>Next scheduled runs</span>
      </div>
      <div className={styles.schedulePreviewDates}>
        {nextRuns.map((date, index) => (
          <span key={index} className={styles.schedulePreviewDate}>
            {formatScheduleDate(date)}
            {index < nextRuns.length - 1 && (
              <span className={styles.schedulePreviewSeparator}>,</span>
            )}
          </span>
        ))}
        <span className={styles.schedulePreviewTime}>at {timeDisplay}</span>
      </div>
    </div>
  )
}
