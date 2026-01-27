/**
 * AdvancedScheduleEditor Component
 *
 * Expandable editor with interval, weekday, and time controls.
 */

import { useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ScheduleRule } from '../types/newsletter'
import { WeekdayChipGroup } from './WeekdayChipGroup'
import { TimeSelector } from './TimeSelector'
import { INTERVAL_TYPE_LABELS, validateScheduleRule } from '../utils/scheduleCalculator'
import styles from '../pages/newsletterGenerator.module.css'

interface AdvancedScheduleEditorProps {
  rule: ScheduleRule
  onChange: (rule: ScheduleRule) => void
  isOpen: boolean
  onToggle: () => void
  disabled?: boolean
}

export function AdvancedScheduleEditor({
  rule,
  onChange,
  isOpen,
  onToggle,
  disabled = false,
}: AdvancedScheduleEditorProps) {
  const firstInputRef = useRef<HTMLInputElement>(null)
  const errors = validateScheduleRule(rule)

  // Focus first input when editor opens
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      firstInputRef.current.focus()
    }
  }, [isOpen])

  const handleIntervalAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 1) {
      onChange({ ...rule, intervalAmount: value })
    }
  }

  const handleIntervalTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as ScheduleRule['intervalType']
    const updatedRule: ScheduleRule = {
      ...rule,
      intervalType: newType,
    }

    // Reset weekdays/dayOfMonth based on interval type
    if (newType === 'months') {
      updatedRule.weekdays = undefined
      updatedRule.dayOfMonth = rule.dayOfMonth || 1
    } else {
      updatedRule.dayOfMonth = undefined
      updatedRule.weekdays = rule.weekdays || [1] // Default to Monday
    }

    onChange(updatedRule)
  }

  const handleWeekdaysChange = (days: number[]) => {
    onChange({ ...rule, weekdays: days })
  }

  const handleDayOfMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10)
    onChange({ ...rule, dayOfMonth: value })
  }

  const handleTimeChange = (hour: number, minute: number) => {
    onChange({ ...rule, hour, minute })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }

  const showWeekdaySelector = rule.intervalType === 'days' || rule.intervalType === 'weeks'
  const showDayOfMonthSelector = rule.intervalType === 'months'

  return (
    <div className={styles.advancedScheduleEditor}>
      <button
        type="button"
        className={styles.advancedScheduleToggle}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-controls="advanced-schedule-content"
        disabled={disabled}
      >
        <span>Customize schedule...</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div
          id="advanced-schedule-content"
          className={styles.advancedScheduleContent}
          role="region"
          aria-label="Advanced schedule options"
        >
          {/* Interval Row */}
          <div className={styles.scheduleRow}>
            <label className={styles.scheduleLabel}>Every</label>
            <div className={styles.intervalSelector}>
              <input
                ref={firstInputRef}
                type="number"
                className={styles.intervalInput}
                value={rule.intervalAmount}
                onChange={handleIntervalAmountChange}
                min={1}
                max={rule.intervalType === 'days' ? 365 : rule.intervalType === 'weeks' ? 52 : 12}
                disabled={disabled}
                aria-label="Interval amount"
              />
              <select
                className={styles.intervalSelect}
                value={rule.intervalType}
                onChange={handleIntervalTypeChange}
                disabled={disabled}
                aria-label="Interval type"
              >
                {Object.entries(INTERVAL_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weekday Selector (for days/weeks) */}
          {showWeekdaySelector && (
            <div className={styles.scheduleRow}>
              <label className={styles.scheduleLabel}>On</label>
              <WeekdayChipGroup
                selectedDays={rule.weekdays || []}
                onChange={handleWeekdaysChange}
                disabled={disabled}
              />
            </div>
          )}

          {/* Day of Month Selector (for months) */}
          {showDayOfMonthSelector && (
            <div className={styles.scheduleRow}>
              <label className={styles.scheduleLabel}>On the</label>
              <select
                className={styles.dayOfMonthSelect}
                value={rule.dayOfMonth || 1}
                onChange={handleDayOfMonthChange}
                disabled={disabled}
                aria-label="Day of month"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {getOrdinal(day)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Selector */}
          <div className={styles.scheduleRow}>
            <label className={styles.scheduleLabel}>At</label>
            <TimeSelector
              hour={rule.hour}
              minute={rule.minute}
              onChange={handleTimeChange}
              disabled={disabled}
            />
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className={styles.scheduleErrors} role="alert">
              {errors.map((error, index) => (
                <p key={index} className={styles.scheduleError}>
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}
