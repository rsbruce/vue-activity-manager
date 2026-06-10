import type { Person } from './people'

export type Event = {
    id: string;
    name: string;
    start_datetime: string | null;
    end_datetime: string | null;
    before_notes: string | null;
    after_notes: string | null;
    project_id: string | null;
    objective_id: string | null;
    deleted_at: string | null;
    people?: Person[];
    project?: { id: string; name: string };
    objective?: { id: string; name: string };
}

// ── Timetable view types ──────────────────────────────────────────────

export type TimetableCell = {
    startMinutesPastHour: number
    name: string
    colorScheme: string | null
    durationMinutes: number
    projectId: string | null
}

export type CalendarEntry = TimetableCell & {
    id: string
    startTime: string
    endTime: string
}

// date -> hour -> eventId -> cell
export type TimetableData = Record<string, Record<number, Record<string, TimetableCell>>>
// date -> eventId -> entry
export type CalendarData = Record<string, Record<string, CalendarEntry>>
// date -> 'positive' | 'negative' -> count
export type HabitTable = Record<string, Record<string, number>>

// eventId -> minimal event for navigation / attendee lookup
export type TimetableEvent = {
    id: string
    name: string
    start_datetime: string
    end_datetime: string
    project_id: string | null
    attendee_ids: string[]
}

// category id -> category with its projects (project-only; objectives intentionally dropped)
export type TimetableProjectCategories = Record<string, {
    id: string
    name: string
    color_scheme: string
    order: number | null
    projects: Record<string, { id: string; name: string }>
}>

export type TimetableModalInitial = {
    eventId: string | null
    itemType: 'event' | 'work' | null
    name: string
    projectId: string | null
    startDatetime: string
    endDatetime: string
    attendeeIds: string[]
}