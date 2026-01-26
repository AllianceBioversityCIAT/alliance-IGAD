import styles from '../pages/newsletterGenerator.module.css'

interface SliderOption {
  value: string
  label: string
}

interface DiscreteSliderProps {
  options: readonly SliderOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  showSelected?: boolean
}

export function DiscreteSlider({
  options,
  value,
  onChange,
  disabled = false,
  showSelected = true,
}: DiscreteSliderProps) {
  const selectedIndex = options.findIndex((opt) => opt.value === value)
  const fillPercentage = options.length > 1 ? (selectedIndex / (options.length - 1)) * 100 : 0

  const handleDotClick = (optionValue: string) => {
    if (!disabled) {
      onChange(optionValue)
    }
  }

  const selectedLabel = options.find((opt) => opt.value === value)?.label || ''

  return (
    <div className={styles.discreteSlider}>
      {/* Labels above the slider */}
      <div className={styles.discreteSliderLabels}>
        {options.map((option, index) => (
          <span
            key={option.value}
            className={`${styles.discreteSliderLabel} ${
              index <= selectedIndex ? styles.discreteSliderLabelActive : ''
            }`}
          >
            {option.label}
          </span>
        ))}
      </div>

      {/* Slider track with dots */}
      <div
        className={styles.discreteSliderTrack}
        role="slider"
        aria-valuenow={selectedIndex}
        aria-valuemin={0}
        aria-valuemax={options.length - 1}
        aria-label="Select option"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            const nextIndex = Math.min(selectedIndex + 1, options.length - 1)
            onChange(options[nextIndex].value)
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            const prevIndex = Math.max(selectedIndex - 1, 0)
            onChange(options[prevIndex].value)
          }
        }}
      >
        {/* Fill bar */}
        <div className={styles.discreteSliderFill} style={{ width: `${fillPercentage}%` }} />

        {/* Dots */}
        <div className={styles.discreteSliderDots}>
          {options.map((option, index) => (
            <div
              key={option.value}
              className={`${styles.discreteSliderDot} ${
                index <= selectedIndex ? styles.discreteSliderDotActive : ''
              } ${index === selectedIndex ? styles.discreteSliderDotSelected : ''}`}
              onClick={() => handleDotClick(option.value)}
            />
          ))}
        </div>
      </div>

      {/* Selected value display */}
      {showSelected && (
        <div className={styles.discreteSliderSelected}>Selected: {selectedLabel}</div>
      )}
    </div>
  )
}
