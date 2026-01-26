import { Check } from 'lucide-react'
import styles from '../pages/newsletterGenerator.module.css'

interface AudienceOption {
  id: string
  label: string
}

interface AudienceCheckboxGroupProps {
  options: readonly AudienceOption[]
  selectedValues: string[]
  onChange: (selectedValues: string[]) => void
  disabled?: boolean
}

export function AudienceCheckboxGroup({
  options,
  selectedValues,
  onChange,
  disabled = false,
}: AudienceCheckboxGroupProps) {
  const handleToggle = (optionId: string) => {
    if (disabled) return

    const isSelected = selectedValues.includes(optionId)
    if (isSelected) {
      onChange(selectedValues.filter((id) => id !== optionId))
    } else {
      onChange([...selectedValues, optionId])
    }
  }

  return (
    <div className={styles.audienceList}>
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.id)
        return (
          <div
            key={option.id}
            className={`${styles.audienceItem} ${isSelected ? styles.audienceItemSelected : ''} ${disabled ? styles.audienceItemDisabled : ''}`}
            onClick={() => handleToggle(option.id)}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleToggle(option.id)
              }
            }}
          >
            <div className={styles.audienceCheckbox}>
              {isSelected && <Check size={14} strokeWidth={3} />}
            </div>
            <span className={styles.audienceLabel}>{option.label}</span>
          </div>
        )
      })}
    </div>
  )
}
