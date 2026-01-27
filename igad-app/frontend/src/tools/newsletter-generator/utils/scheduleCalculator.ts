/**
 * Schedule Calculator Utility
 *
 * Calculates next N scheduled runs from a schedule rule.
 */

import type { ScheduleRule } from '../types/newsletter'

/**
 * Calculate the next N scheduled dates based on a schedule rule.
 *
 * @param rule - The schedule rule configuration
 * @param count - Number of dates to calculate
 * @param startFrom - Starting date (defaults to now)
 * @returns Array of Date objects for the next scheduled runs
 */
export function calculateNextRuns(
  rule: ScheduleRule,
  count: number = 3,
  startFrom: Date = new Date()
): Date[] {
  const results: Date[] = []
  let currentDate = new Date(startFrom)

  // Reset time to start of day for consistent calculation
  currentDate.setHours(0, 0, 0, 0)

  while (results.length < count) {
    const nextDate = findNextOccurrence(rule, currentDate)
    if (nextDate) {
      results.push(nextDate)
      // Move to next day to find subsequent occurrences
      currentDate = new Date(nextDate)
      currentDate.setDate(currentDate.getDate() + 1)
    } else {
      break
    }
  }

  return results
}

/**
 * Find the next occurrence based on the rule starting from a given date.
 */
function findNextOccurrence(rule: ScheduleRule, from: Date): Date | null {
  const now = new Date()
  const candidate = new Date(from)
  const maxIterations = 365 * 2 // Prevent infinite loops

  for (let i = 0; i < maxIterations; i++) {
    if (isMatchingDay(rule, candidate)) {
      // Set the time
      const result = new Date(candidate)
      result.setHours(rule.hour, rule.minute, 0, 0)

      // Only return if it's in the future
      if (result > now) {
        return result
      }
    }

    // Move to next day
    candidate.setDate(candidate.getDate() + 1)
  }

  return null
}

/**
 * Check if a given date matches the schedule rule's day criteria.
 */
function isMatchingDay(rule: ScheduleRule, date: Date): boolean {
  switch (rule.intervalType) {
    case 'days':
      // For daily, check if the weekday is in the allowed list
      if (rule.weekdays && rule.weekdays.length > 0) {
        const dayOfWeek = date.getDay()
        return rule.weekdays.includes(dayOfWeek)
      }
      return true

    case 'weeks':
      // For weekly, check if it's the right weekday
      if (rule.weekdays && rule.weekdays.length > 0) {
        const dayOfWeek = date.getDay()
        return rule.weekdays.includes(dayOfWeek)
      }
      return date.getDay() === 1 // Default to Monday

    case 'months': {
      // For monthly, check if it's the right day of month
      const targetDay = rule.dayOfMonth || 1
      const dayOfMonth = date.getDate()

      // Handle end of month edge case
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      if (targetDay > lastDayOfMonth) {
        return dayOfMonth === lastDayOfMonth
      }

      if (dayOfMonth !== targetDay) {
        return false
      }

      // For quarterly (intervalAmount = 3), check if it's the right month
      if (rule.intervalAmount === 3) {
        const month = date.getMonth()
        // Quarterly: Jan, Apr, Jul, Oct (0, 3, 6, 9)
        return month % 3 === 0
      }

      return true
    }

    default:
      return false
  }
}

/**
 * Format a date for display in the schedule preview.
 */
export function formatScheduleDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
  return date.toLocaleDateString('en-US', options)
}

/**
 * Format time for display (12-hour format).
 */
export function formatScheduleTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  const displayMinute = minute.toString().padStart(2, '0')
  return `${displayHour}:${displayMinute} ${period}`
}

/**
 * Convert 12-hour format to 24-hour format.
 */
export function to24Hour(hour12: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') {
    return hour12 === 12 ? 0 : hour12
  } else {
    return hour12 === 12 ? 12 : hour12 + 12
  }
}

/**
 * Convert 24-hour format to 12-hour format.
 */
export function to12Hour(hour24: number): { hour: number; period: 'AM' | 'PM' } {
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM'
  const hour = hour24 % 12 || 12
  return { hour, period }
}

/**
 * Weekday labels for display.
 */
export const WEEKDAY_LABELS = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
]

/**
 * Minute options for the time selector.
 */
export const MINUTE_OPTIONS = [0, 15, 30, 45]

/**
 * Hour options for the time selector (1-12).
 */
export const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/**
 * Interval type labels for display.
 */
export const INTERVAL_TYPE_LABELS = {
  days: 'Day(s)',
  weeks: 'Week(s)',
  months: 'Month(s)',
}

/**
 * Validate a schedule rule.
 */
export function validateScheduleRule(rule: ScheduleRule): string[] {
  const errors: string[] = []

  // Validate interval amount
  if (rule.intervalType === 'days' && (rule.intervalAmount < 1 || rule.intervalAmount > 365)) {
    errors.push('Days interval must be between 1 and 365')
  }
  if (rule.intervalType === 'weeks' && (rule.intervalAmount < 1 || rule.intervalAmount > 52)) {
    errors.push('Weeks interval must be between 1 and 52')
  }
  if (rule.intervalType === 'months' && (rule.intervalAmount < 1 || rule.intervalAmount > 12)) {
    errors.push('Months interval must be between 1 and 12')
  }

  // Validate weekdays for daily/weekly
  if (
    (rule.intervalType === 'days' || rule.intervalType === 'weeks') &&
    (!rule.weekdays || rule.weekdays.length === 0)
  ) {
    errors.push('At least one weekday must be selected')
  }

  // Validate day of month for monthly
  if (rule.intervalType === 'months') {
    if (rule.dayOfMonth && (rule.dayOfMonth < 1 || rule.dayOfMonth > 31)) {
      errors.push('Day of month must be between 1 and 31')
    }
  }

  // Validate time
  if (rule.hour < 0 || rule.hour > 23) {
    errors.push('Hour must be between 0 and 23')
  }
  if (![0, 15, 30, 45].includes(rule.minute)) {
    errors.push('Minute must be 0, 15, 30, or 45')
  }

  return errors
}
