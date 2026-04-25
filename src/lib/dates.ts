/** Format a Date as YYYY-MM-DD using the browser's local timezone. */
export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Return a new Date that is `days` calendar days after `date`. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Generate an array of YYYY-MM-DD strings starting at `start` for `count` days. */
export function generateDateRange(start: Date, count: number): string[] {
  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    dates.push(toDateString(addDays(start, i)))
  }
  return dates
}

/** Generate an array of YYYY-MM-DD strings going backward from `start` for `count` days. */
export function generateBackwardDateRange(start: Date, count: number): string[] {
  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    dates.push(toDateString(addDays(start, -i)))
  }
  return dates
}

/**
 * Return the YYYY-MM-DD string `offset` days away from `dateStr`.
 * `offset` may be negative (previous day) or positive (next day).
 * The input is parsed in local time so DST transitions don't shift the result.
 */
export function getAdjacentDate(dateStr: string, offset: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + offset)
  return toDateString(date)
}

/**
 * Number of whole calendar days between two YYYY-MM-DD strings, in local time.
 * Returns `to - from` so a future `to` yields a positive number.
 */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const a = new Date(fy, fm - 1, fd).getTime()
  const b = new Date(ty, tm - 1, td).getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}
