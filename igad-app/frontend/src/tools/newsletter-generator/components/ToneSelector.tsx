import { TONE_OPTIONS } from '../types/newsletter'
import styles from '../pages/newsletterGenerator.module.css'

interface ToneSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ToneSelector({ value, onChange, disabled = false }: ToneSelectorProps) {
  return (
    <div className={styles.toneSelector}>
      {TONE_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          className={`${styles.toneOption} ${value === option.value ? styles.toneOptionSelected : ''}`}
          onClick={() => !disabled && onChange(option.value)}
          disabled={disabled}
          aria-pressed={value === option.value}
        >
          <div className={styles.toneOptionHeader}>
            <span className={styles.toneOptionLabel}>{option.label}</span>
            {value === option.value && (
              <span className={styles.toneOptionCheck}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M13.5 4.5L6 12L2.5 8.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </div>
          <p className={styles.toneOptionDescription}>{option.description}</p>
          <div className={styles.toneOptionExample}>
            <span className={styles.toneOptionExampleLabel}>Example:</span>
            <span className={styles.toneOptionExampleText}>&quot;{option.example}&quot;</span>
          </div>
        </button>
      ))}
    </div>
  )
}
