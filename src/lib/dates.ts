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
