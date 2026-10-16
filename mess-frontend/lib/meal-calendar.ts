export function dhakaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function isBotVoteLocked(mealType: 'lunch' | 'dinner', date: string, now = new Date()) {
  if (date !== dhakaToday(now)) return true
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute >= (mealType === 'lunch' ? 10 : 15) * 60
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

type MealValue = { count: number; lunchCount?: number | null; dinnerCount?: number | null }

export function resolveMealCount({ manual }: {
  manual?: MealValue
}): { count: number; lunchCount: number; dinnerCount: number; unassignedCount: number; source: 'manual' | 'automatic' } {
  if (manual) {
    if (manual.lunchCount != null && manual.dinnerCount != null) {
      return { count: manual.lunchCount + manual.dinnerCount, lunchCount: manual.lunchCount, dinnerCount: manual.dinnerCount, unassignedCount: 0, source: 'manual' }
    }
    // Older records contain only a daily total. One or three meals cannot be assigned to a sitting safely.
    const lunchCount = manual.count === 2 ? 1 : 0
    const dinnerCount = manual.count === 2 ? 1 : 0
    return { count: manual.count, lunchCount, dinnerCount, unassignedCount: manual.count - lunchCount - dinnerCount, source: 'manual' }
  }
  // Without a vote or manual entry, both meals are 0.
  return { count: 0, lunchCount: 0, dinnerCount: 0, unassignedCount: 0, source: 'automatic' }
}
