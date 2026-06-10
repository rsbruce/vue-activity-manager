import { query } from '@/db'
import type {
    TimetableData,
    CalendarData,
    HabitTable,
    TimetableEvent,
} from '@/types/events'
import { getActiveProjectsWithArea } from './projects'

export type TimetableWindow = {
    timetable: TimetableData
    calendar: CalendarData
    eventsArr: Record<string, TimetableEvent>
    habitTable: HabitTable
}

type EventRow = {
    id: string
    name: string
    start_datetime: string
    end_datetime: string
    project_id: string | null
    color_scheme: string | null
}

/**
 * All timetable data for a date window: events positioned on the hourly grid and
 * calendar (coloured by their project's category), plus the habit table.
 * `startYmd`/`endYmd` are inclusive 'YYYY-MM-DD' bounds.
 */
export async function getTimetableWindow(startYmd: string, endYmd: string): Promise<TimetableWindow> {
    // Compare on the date portion so mixed datetime separators ('T' vs space) don't matter.
    const events = await query<EventRow>(
        `SELECT events.id, events.name, events.start_datetime, events.end_datetime,
            events.project_id,
            project_categories.color_scheme as color_scheme
        FROM events
        LEFT JOIN projects ON projects.id = events.project_id
        LEFT JOIN project_categories ON project_categories.id = projects.project_category_id
        WHERE events.deleted_at IS NULL
            AND substr(events.start_datetime, 1, 10) BETWEEN ? AND ?
        ORDER BY events.start_datetime`,
        [startYmd, endYmd]
    )

    const attendees = await query<{ event_id: string; person_id: string }>(
        `SELECT person_at_event.event_id, person_at_event.person_id
        FROM person_at_event
        INNER JOIN events ON events.id = person_at_event.event_id
        WHERE person_at_event.deleted_at IS NULL
            AND events.deleted_at IS NULL
            AND substr(events.start_datetime, 1, 10) BETWEEN ? AND ?`,
        [startYmd, endYmd]
    )

    const timetable: TimetableData = {}
    const calendar: CalendarData = {}
    const eventsArr: Record<string, TimetableEvent> = {}

    for (const row of events) {
        const start = new Date(row.start_datetime)
        const end = new Date(row.end_datetime)
        const dateStr = start.isoDate()
        const hour = start.getHours()
        const startMinutesPastHour = start.getMinutes()
        const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
        const colorScheme = row.color_scheme ?? null

        if (!timetable[dateStr]) timetable[dateStr] = {}
        if (!timetable[dateStr][hour]) timetable[dateStr][hour] = {}
        timetable[dateStr][hour][row.id] = {
            startMinutesPastHour,
            name: row.name,
            colorScheme,
            durationMinutes,
            projectId: row.project_id,
        }

        if (!calendar[dateStr]) calendar[dateStr] = {}
        calendar[dateStr][row.id] = {
            startMinutesPastHour,
            name: row.name,
            colorScheme,
            durationMinutes,
            projectId: row.project_id,
            id: row.id,
            startTime: start.isoTime(),
            endTime: end.isoTime(),
        }

        eventsArr[row.id] = {
            id: row.id,
            name: row.name,
            start_datetime: row.start_datetime,
            end_datetime: row.end_datetime,
            project_id: row.project_id,
            attendee_ids: [],
        }
    }

    for (const a of attendees) {
        eventsArr[a.event_id]?.attendee_ids.push(a.person_id)
    }

    // Habit bars: counts per day split into positive / negative activity types.
    const habitRows = await query<{ date: string; is_negative: number | null; count: number }>(
        `SELECT activity_on_day.date as date,
            activity_types.is_negative as is_negative,
            COUNT(*) as count
        FROM activity_on_day
        INNER JOIN activities ON activities.id = activity_on_day.activity_id
        INNER JOIN activity_types ON activity_types.id = activities.activity_type_id
        WHERE activity_on_day.deleted_at IS NULL
            AND activities.deleted_at IS NULL
            AND activity_types.deleted_at IS NULL
            AND activity_on_day.date BETWEEN ? AND ?
        GROUP BY activity_on_day.date, activity_types.is_negative`,
        [startYmd, endYmd]
    )

    const habitTable: HabitTable = {}
    for (const row of habitRows) {
        const bucket = row.is_negative ? 'negative' : 'positive'
        const day = (habitTable[row.date] ??= {})
        day[bucket] = (day[bucket] ?? 0) + row.count
    }

    return { timetable, calendar, eventsArr, habitTable }
}

export type SummaryResult = {
    // areaName -> projectName -> 'YYYY-MM-DD' -> minutes
    summaryTable: Record<string, Record<string, Record<string, number>>>
    summaryColorSchemes: Record<string, string>
}

type WorkEventRow = {
    project_id: string
    start_datetime: string
    end_datetime: string
    project_name: string
    area_name: string | null
    color_scheme: string | null
}

/** Minutes worked per project per day over the last 29 days, grouped by project area. */
export async function getSummary(): Promise<SummaryResult> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const windowStart = today.addDays(-28).isoDate()

    const activeProjects = await getActiveProjectsWithArea()

    const workEvents = await query<WorkEventRow>(
        `SELECT events.project_id, events.start_datetime, events.end_datetime,
            projects.name as project_name,
            project_categories.name as area_name,
            project_categories.color_scheme as color_scheme
        FROM events
        INNER JOIN projects ON projects.id = events.project_id
        LEFT JOIN project_categories ON project_categories.id = projects.project_category_id
        WHERE events.project_id IS NOT NULL
            AND events.deleted_at IS NULL
            AND substr(events.start_datetime, 1, 10) >= ?
            AND (project_categories.id IS NULL OR project_categories.deleted_at IS NULL)`,
        [windowStart]
    )

    // Projects to display = active projects ∪ projects with recent work.
    type Proj = { name: string; area: string; colorScheme: string }
    const projects = new Map<string, Proj>()
    const colorSchemes: Record<string, string> = { Life: 'green' }

    const register = (id: string, name: string, area: string | null, scheme: string | null) => {
        const areaName = area ?? 'Life'
        const colorScheme = scheme ?? 'green'
        projects.set(id, { name, area: areaName, colorScheme })
        colorSchemes[areaName] = colorScheme
    }

    for (const p of activeProjects) {
        register(p.id, p.name, p.area_name ?? null, p.color_scheme ?? null)
    }
    for (const w of workEvents) {
        register(w.project_id, w.project_name, w.area_name, w.color_scheme)
    }

    // Sum minutes keyed by `${projectId}.${date}`.
    const durations = new Map<string, number>()
    for (const w of workEvents) {
        const start = new Date(w.start_datetime)
        const end = new Date(w.end_datetime)
        const key = `${w.project_id}.${start.isoDate()}`
        const mins = Math.round((end.getTime() - start.getTime()) / 60000)
        durations.set(key, (durations.get(key) ?? 0) + mins)
    }

    const dates: string[] = []
    for (let i = 28; i >= 0; i--) dates.push(today.addDays(-i).isoDate())

    const summaryTable: SummaryResult['summaryTable'] = {}
    for (const [id, proj] of projects) {
        const area = (summaryTable[proj.area] ??= {})
        const row: Record<string, number> = {}
        for (const date of dates) {
            row[date] = durations.get(`${id}.${date}`) ?? 0
        }
        area[proj.name] = row
    }

    return { summaryTable, summaryColorSchemes: colorSchemes }
}
