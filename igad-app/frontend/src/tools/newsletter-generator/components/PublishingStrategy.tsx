/**
 * PublishingStrategy Component
 *
 * Main orchestrator combining frequency presets + schedule preview + advanced editor.
 * Implements a two-tier system with progressive disclosure.
 */

import { useState, useCallback, useMemo } from 'react'
import { Check } from 'lucide-react'
import type { PublishingSchedule, ScheduleRule } from '../types/newsletter'
import { FREQUENCY_OPTIONS, SCHEDULE_PRESETS } from '../types/newsletter'
import { SchedulePreview } from './SchedulePreview'
import { AdvancedScheduleEditor } from './AdvancedScheduleEditor'
import styles from '../pages/newsletterGenerator.module.css'

interface PublishingStrategyProps {
  value: string // conceptualFrequency
  schedule?: PublishingSchedule
  onChange: (frequency: string, schedule: PublishingSchedule) => void
  disabled?: boolean
}

export function PublishingStrategy({
  value,
  schedule,
  onChange,
  disabled = false,
}: PublishingStrategyProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  // Current schedule rule (first rule or default)
  const currentRule = useMemo(() => {
    if (schedule?.scheduleRules?.[0]) {
      return schedule.scheduleRules[0]
    }
    return SCHEDULE_PRESETS[value] || SCHEDULE_PRESETS.weekly
  }, [schedule, value])

  // Determine if current schedule differs from preset
  const isCustomized = useMemo(() => {
    if (!schedule || value === 'custom') {
      return false
    }

    const preset = SCHEDULE_PRESETS[value]
    if (!preset) {
      return false
    }

    const rule = schedule.scheduleRules[0]
    if (!rule) {
      return false
    }

    // Compare relevant fields
    if (rule.intervalType !== preset.intervalType) {
      return true
    }
    if (rule.intervalAmount !== preset.intervalAmount) {
      return true
    }
    if (rule.hour !== preset.hour) {
      return true
    }
    if (rule.minute !== preset.minute) {
      return true
    }

    // Compare weekdays
    const ruleWeekdays = rule.weekdays?.sort().join(',') || ''
    const presetWeekdays = preset.weekdays?.sort().join(',') || ''
    if (ruleWeekdays !== presetWeekdays) {
      return true
    }

    // Compare day of month
    if (rule.dayOfMonth !== preset.dayOfMonth) {
      return true
    }

    return false
  }, [schedule, value])

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (frequencyValue: string) => {
      if (disabled) {
        return
      }

      const presetRule = SCHEDULE_PRESETS[frequencyValue]
      if (!presetRule) {
        return
      }

      const newSchedule: PublishingSchedule = {
        conceptualFrequency: frequencyValue as PublishingSchedule['conceptualFrequency'],
        scheduleRules: [{ ...presetRule }],
      }

      onChange(frequencyValue, newSchedule)

      // Close advanced editor when selecting a preset
      setIsAdvancedOpen(false)
    },
    [disabled, onChange]
  )

  // Handle advanced schedule changes
  const handleRuleChange = useCallback(
    (newRule: ScheduleRule) => {
      const newSchedule: PublishingSchedule = {
        conceptualFrequency: 'custom',
        scheduleRules: [newRule],
      }

      onChange('custom', newSchedule)
    },
    [onChange]
  )

  // Toggle advanced editor
  const handleToggleAdvanced = useCallback(() => {
    setIsAdvancedOpen(prev => !prev)
  }, [])

  return (
    <div className={styles.publishingStrategy}>
      {/* Tier 1: Quick Presets */}
      <div className={styles.optionCards}>
        {FREQUENCY_OPTIONS.map(option => {
          const isSelected = value === option.value
          const showCustomizedBadge = isSelected && isCustomized

          return (
            <button
              key={option.value}
              type="button"
              className={`${styles.optionCard} ${isSelected ? styles.optionCardSelected : ''}`}
              onClick={() => handlePresetSelect(option.value)}
              disabled={disabled}
              aria-pressed={isSelected}
            >
              <div className={styles.optionCardHeader}>
                <span className={styles.optionCardLabel}>
                  {option.label}
                  {showCustomizedBadge && (
                    <span className={styles.customizedBadge}>Customized</span>
                  )}
                </span>
                <span className={styles.optionCardMeta}>{option.description}</span>
              </div>
              <p className={styles.optionCardDetail}>{option.detail}</p>
              <div className={styles.optionCardFocus}>
                <span className={styles.optionCardFocusLabel}>Content focus:</span>
                <span>{option.contentFocus}</span>
              </div>
              {isSelected && (
                <div className={styles.optionCardCheck}>
                  <Check size={16} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Schedule Preview */}
      <SchedulePreview rule={currentRule} />

      {/* Tier 2: Advanced Editor */}
      <AdvancedScheduleEditor
        rule={currentRule}
        onChange={handleRuleChange}
        isOpen={isAdvancedOpen}
        onToggle={handleToggleAdvanced}
        disabled={disabled}
      />
    </div>
  )
}
