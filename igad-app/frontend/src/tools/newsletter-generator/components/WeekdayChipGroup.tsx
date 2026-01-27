/**
 * WeekdayChipGroup Component
 *
 * Multi-select chips for weekday selection (Mon-Sun).
 */

import { WEEKDAY_LABELS } from '../utils/scheduleCalculator'
import styles from '../pages/newsletterGenerator.module.css'

interface WeekdayChipGroupProps {
  selectedDays: number[]
  onChange: (days: number[]) => void
  disabled?: boolean
}

export function WeekdayChipGroup({
  selectedDays,
  onChange,
  disabled = false,
}: WeekdayChipGroupProps) {
  const handleToggle = (dayValue: number) => {
    if (disabled) {
      return
    }

    const newDays = selectedDays.includes(dayValue)
      ? selectedDays.filter(d => d !== dayValue)
      : [...selectedDays, dayValue].sort((a, b) => a - b)

    onChange(newDays)
  }

  const handleKeyDown = (e: React.KeyboardEvent, dayValue: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle(dayValue)
    }
  }

  return (
    <div className={styles.weekdayChipGroup} role="group" aria-label="Select weekdays">
      {WEEKDAY_LABELS.map(day => {
        const isSelected = selectedDays.includes(day.value)
        return (
          <button
            key={day.value}
            type="button"
            className={`${styles.weekdayChip} ${isSelected ? styles.weekdayChipSelected : ''}`}
            onClick={() => handleToggle(day.value)}
            onKeyDown={e => handleKeyDown(e, day.value)}
            disabled={disabled}
            aria-checked={isSelected}
            aria-label={day.fullLabel}
            role="checkbox"
          >
            {day.label}
          </button>
        )
      })}
    </div>
  )
}
