import { FREQUENCY_OPTIONS } from '../types/newsletter'
import styles from '../pages/newsletterGenerator.module.css'

interface FrequencySelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function FrequencySelector({ value, onChange, disabled = false }: FrequencySelectorProps) {
  return (
    <div className={styles.optionCards}>
      {FREQUENCY_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          className={`${styles.optionCard} ${value === option.value ? styles.optionCardSelected : ''}`}
          onClick={() => !disabled && onChange(option.value)}
          disabled={disabled}
          aria-pressed={value === option.value}
        >
          <div className={styles.optionCardHeader}>
            <span className={styles.optionCardLabel}>{option.label}</span>
            <span className={styles.optionCardMeta}>{option.description}</span>
          </div>
          <p className={styles.optionCardDetail}>{option.detail}</p>
          <div className={styles.optionCardFocus}>
            <span className={styles.optionCardFocusLabel}>Content focus:</span>
            <span>{option.contentFocus}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
