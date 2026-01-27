/**
 * TimeSelector Component
 *
 * Hour:Minute selector with 12-hour format (AM/PM).
 */

import { HOUR_OPTIONS, MINUTE_OPTIONS, to12Hour, to24Hour } from '../utils/scheduleCalculator'
import styles from '../pages/newsletterGenerator.module.css'

interface TimeSelectorProps {
  hour: number // 24-hour format (0-23)
  minute: number
  onChange: (hour: number, minute: number) => void
  disabled?: boolean
}

export function TimeSelector({ hour, minute, onChange, disabled = false }: TimeSelectorProps) {
  const { hour: displayHour, period } = to12Hour(hour)

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour12 = parseInt(e.target.value, 10)
    const newHour24 = to24Hour(newHour12, period)
    onChange(newHour24, minute)
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = parseInt(e.target.value, 10)
    onChange(hour, newMinute)
  }

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriod = e.target.value as 'AM' | 'PM'
    const newHour24 = to24Hour(displayHour, newPeriod)
    onChange(newHour24, minute)
  }

  return (
    <div className={styles.timeSelector} role="group" aria-label="Select time">
      <select
        className={styles.timeSelectorHour}
        value={displayHour}
        onChange={handleHourChange}
        disabled={disabled}
        aria-label="Hour"
      >
        {HOUR_OPTIONS.map(h => (
          <option key={h} value={h}>
            {h.toString().padStart(2, '0')}
          </option>
        ))}
      </select>

      <span className={styles.timeSelectorColon}>:</span>

      <select
        className={styles.timeSelectorMinute}
        value={minute}
        onChange={handleMinuteChange}
        disabled={disabled}
        aria-label="Minute"
      >
        {MINUTE_OPTIONS.map(m => (
          <option key={m} value={m}>
            {m.toString().padStart(2, '0')}
          </option>
        ))}
      </select>

      <select
        className={styles.timeSelectorPeriod}
        value={period}
        onChange={handlePeriodChange}
        disabled={disabled}
        aria-label="AM/PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}
