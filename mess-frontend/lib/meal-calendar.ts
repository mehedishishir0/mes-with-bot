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

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function monthBounds(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(endDay).padStart(2, '0')}`,
  }
}

type MealValue = { count: number; lunchCount?: number | null; dinnerCount?: number | null }

export function resolveMealCount({ manual, planned, date, autoStart, today }: {
  manual?: MealValue
  planned?: MealValue
  date: string
  autoStart: string
  today: string
}): { count: number; lunchCount: number; dinnerCount: number; unassignedCount: number; source: 'manual' | 'planned' | 'automatic' } {
  const saved = manual ?? planned
  if (saved) {
    const source = manual ? 'manual' : 'planned'
    if (saved.lunchCount != null && saved.dinnerCount != null) {
      return { count: saved.lunchCount + saved.dinnerCount, lunchCount: saved.lunchCount, dinnerCount: saved.dinnerCount, unassignedCount: 0, source }
    }
    // Older records contain only a daily total. One or three meals cannot be assigned to a sitting safely.
    const lunchCount = saved.count === 2 ? 1 : 0
    const dinnerCount = saved.count === 2 ? 1 : 0
    return { count: saved.count, lunchCount, dinnerCount, unassignedCount: saved.count - lunchCount - dinnerCount, source }
  }
  // If member has not voted or has no manual/planned entry, meal count defaults to 0
  return { count: 0, lunchCount: 0, dinnerCount: 0, unassignedCount: 0, source: 'automatic' }
}
