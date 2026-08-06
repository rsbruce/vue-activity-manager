const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// A rough, human-friendly gap: days, then weeks, months, years.
function relativeText(diffDays: number): string {
    if (diffDays === 0) return 'today'
    const n = Math.abs(diffDays)
    let value: number, unit: string
    if (n < 7) { value = n; unit = 'day' }
    else if (n < 30) { value = Math.round(n / 7); unit = 'week' }
    else if (n < 365) { value = Math.round(n / 30.44); unit = 'month' }
    else { value = Math.round(n / 365.25); unit = 'year' }
    return `${value} ${unit}${value === 1 ? '' : 's'} ${diffDays > 0 ? 'from now' : 'ago'}`
}

// Split a YYYY-MM-DD string into a date label and a human diff. The label is
// "10 Aug 2026" (year dropped when it's the current year), with the weekday
// prepended when the date is within 14 days either side of today ("Mon 10 Aug").
// The relative part is e.g. "2 days from now". Callers can render them together
// or lay them out separately.
export function formatDueDateParts(due: string | null): { label: string; relative: string } {
    if (!due) return { label: '', relative: '' }
    const [y, m, d] = due.split('-').map(Number)
    if (!y || !m || !d) return { label: due, relative: '' }
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const target = new Date(y, m - 1, d)
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000)
    const weekday = Math.abs(diffDays) <= 14 ? `${DAYS[target.getDay()]} ` : ''
    const label = `${weekday}${d} ${MONTHS[m - 1]}${y === now.getFullYear() ? '' : ' ' + y}`
    return { label, relative: relativeText(diffDays) }
}

// Combined form, e.g. "Mon 10 Aug (2 days from now)".
export function formatDueDate(due: string | null): string {
    const { label, relative } = formatDueDateParts(due)
    if (!label) return ''
    return relative ? `${label} (${relative})` : label
}
