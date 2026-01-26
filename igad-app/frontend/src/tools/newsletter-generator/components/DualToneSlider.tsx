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
  return (
    <div className={styles.toneSliderContainer}>
      {/* Professional ←→ Casual */}
      <div className={styles.sliderGroup}>
        <div className={styles.sliderLabels}>
          <span>Professional</span>
          <span>Casual</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={professionalValue}
          onChange={(e) => onProfessionalChange(Number(e.target.value))}
          className={styles.slider}
          disabled={disabled}
          aria-label="Professional to Casual tone"
        />
      </div>

      {/* Technical ←→ Approachable */}
      <div className={styles.sliderGroup}>
        <div className={styles.sliderLabels}>
          <span>Technical</span>
          <span>Approachable</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={technicalValue}
          onChange={(e) => onTechnicalChange(Number(e.target.value))}
          className={styles.slider}
          disabled={disabled}
          aria-label="Technical to Approachable tone"
        />
      </div>
    </div>
  )
}
