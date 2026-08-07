import type { Person } from '@/types/people'

// A short attendee summary: the two most-seen people (by events_count) named,
// then a "+ N more" tail. Returns an em dash when there's nobody.
export function peopleSummary(people: Person[] | undefined): string {
    if (!people?.length) return '—'
    const sorted = [...people].sort((a, b) => (b.events_count || 0) - (a.events_count || 0))
    const named = sorted.slice(0, 2).map(p => `${p.firstname} ${p.lastname || ''}`.trim())
    const extra = sorted.length - 2
    if (extra > 0) return named.join(', ') + ` + ${extra} more`
    return named.join(', ')
}
