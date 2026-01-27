import styles from '../pages/newsletterGenerator.module.css'

interface DualToneSliderProps {
  professionalValue: number
  technicalValue: number
  onProfessionalChange: (value: number) => void
  onTechnicalChange: (value: number) => void
  disabled?: boolean
}

export function DualToneSlider({
  professionalValue,
  technicalValue,
  onProfessionalChange,
  onTechnicalChange,
  disabled = false,
}: DualToneSliderProps) {
  // Calculate fill percentage for visual feedback
  const getSliderStyle = (value: number) => ({
    background: `linear-gradient(to right, #166534 0%, #166534 ${value}%, #ececf0 ${value}%, #ececf0 100%)`,
  })

  return (
    <div className={styles.toneSliderContainer}>
      {/* Professional ←→ Casual */}
      <div className={styles.sliderGroup}>
        <div className={styles.sliderLabels}>
          <span className={professionalValue <= 50 ? styles.sliderLabelActive : ''}>
            Professional
          </span>
          <span className={professionalValue > 50 ? styles.sliderLabelActive : ''}>Casual</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={professionalValue}
          onChange={e => onProfessionalChange(Number(e.target.value))}
          className={styles.slider}
          style={getSliderStyle(professionalValue)}
          disabled={disabled}
          aria-label="Professional to Casual tone"
        />
      </div>

      {/* Technical ←→ Approachable */}
      <div className={styles.sliderGroup}>
        <div className={styles.sliderLabels}>
          <span className={technicalValue <= 50 ? styles.sliderLabelActive : ''}>Technical</span>
          <span className={technicalValue > 50 ? styles.sliderLabelActive : ''}>Approachable</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={technicalValue}
          onChange={e => onTechnicalChange(Number(e.target.value))}
          className={styles.slider}
          style={getSliderStyle(technicalValue)}
          disabled={disabled}
          aria-label="Technical to Approachable tone"
        />
      </div>
    </div>
  )
}
