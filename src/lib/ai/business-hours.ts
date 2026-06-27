import type { BusinessHoursConfig } from '@/types/ai'

/**
 * Check whether the current moment falls within the configured
 * business hours. Returns `true` when:
 *   - business hours are disabled (always active), OR
 *   - the current time in the configured timezone is within the
 *     start/end window for today's weekday.
 */
export function isWithinBusinessHours(config: BusinessHoursConfig): boolean {
  if (!config.enabled) return true

  const tz = config.timezone || 'Africa/Lagos'
  const now = new Date()

  // Use Intl to get the weekday + time in the configured timezone.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const weekday = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() || ''
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
  const currentMinutes = hour * 60 + minute

  const daySchedule = config.schedule[weekday]
  if (!daySchedule) return false // Day is off (null or missing)

  const [startH, startM] = daySchedule.start.split(':').map(Number)
  const [endH, endM] = daySchedule.end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}
