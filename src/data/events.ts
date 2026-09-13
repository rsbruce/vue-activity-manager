import { query, exec, transaction } from '@/db'
import type { Event } from '@/types/events'
import type { Person } from '@/types/people'
import { update } from './utils'

const columns = [
    'name',
    'start_datetime',
    'end_datetime',
    'project_id'
]

export async function createEvent(input: {
    name: string, project_id?: string, start_datetime: string, end_datetime: string, person_ids: string[]
}): Promise<Event | undefined>
{
    // Wrapped in a transaction so the write persists (saveToStore on web) even
    // when there are no attendees — otherwise an attendee-less event's INSERT,
    // issued via the read path (query, for RETURNING), is never saved.
    let event: Event | undefined
    await transaction(async () => {
        const rows = await query<Event>(
            'INSERT INTO events (name, project_id, start_datetime, end_datetime) VALUES (?, ?, ?, ?) RETURNING *',
            [input.name, input.project_id ?? null, input.start_datetime, input.end_datetime]
        )

        event = rows[0]

        if (input.person_ids && event) {
            for (let i = 0; i < input.person_ids.length; i++) {
                await exec('INSERT INTO person_at_event (person_id, event_id) VALUES (?, ?)',
                    [input.person_ids[i], event.id]
                )
            }
        }
    })

    return event;
}

// Create `weeks` copies of an event at weekly intervals (the original is NOT
// counted). Dates are shifted by whole calendar days so the wall-clock time
// survives a DST boundary; everything is written in one transaction so it's
// all-or-nothing and fires a single sync.
export async function replicateEvent(input: {
    name: string
    project_id: string | null
    start_datetime: string
    end_datetime: string
    person_ids: string[]
    weeks: number
}): Promise<void> {
    // 'YYYY-MM-DDTHH:mm' -> same time, `days` calendar days later.
    const shift = (dt: string, days: number): string => {
        const [y, m, d] = dt.slice(0, 10).split('-').map(Number)
        return new Date(y!, m! - 1, d! + days).isoDate() + dt.slice(10)
    }

    await transaction(async () => {
        for (let k = 1; k <= input.weeks; k++) {
            const rows = await query<Event>(
                'INSERT INTO events (name, project_id, start_datetime, end_datetime) VALUES (?, ?, ?, ?) RETURNING *',
                [input.name, input.project_id, shift(input.start_datetime, 7 * k), shift(input.end_datetime, 7 * k)],
            )
            const event = rows[0]
            if (!event) continue
            for (const pid of input.person_ids) {
                await exec('INSERT INTO person_at_event (person_id, event_id) VALUES (?, ?)', [pid, event.id])
            }
        }
    })
}

// Attach attendees to the given events in place, each carrying that person's
// total (non-deleted) events_count. Queries all attendee records and attaches
// only those whose event is in the passed set. Shared by the event-list queries.
async function attachPeople(events: Event[]): Promise<void> {
    const eventsById: Record<string, Event> = {}
    events.forEach(event => eventsById[event.id] = event)

    const peopleAtEventRecords = await query<Person & {event_id: string}>(
        `SELECT
            people.*,
            person_at_event.event_id as event_id,
            (SELECT COUNT(*) FROM events
                INNER JOIN person_at_event ON person_at_event.event_id = events.id
                WHERE people.id = person_at_event.person_id
                AND events.deleted_at IS NULL
                AND people.deleted_at IS NULL
            ) as events_count
        FROM people INNER JOIN person_at_event ON person_at_event.person_id = people.id
            WHERE people.deleted_at IS NULL
            AND person_at_event.deleted_at IS NULL
        `
    )
    peopleAtEventRecords.forEach((record) => {
        const event = eventsById[record.event_id]
        if (!event) return

        if (!event.people) {
            event.people = []
        }

        event.people.push(record as Person)
    })
}

export async function getAllEventsWithPeople(): Promise<Event[]> {
    const events = await query<Event>(
        'SELECT * FROM events WHERE project_id IS NULL AND deleted_at IS NULL ORDER BY start_datetime DESC',
    )
    await attachPeople(events)
    return events
}

export async function getFutureEvents(number = 0): Promise<Event[]> {
    const nowStr = new Date().isoDateTime()

    // Both plain and work events; work events carry their project category's
    // colour_scheme so the planner can theme them.
    const events = await query<Event>(
        `SELECT events.*, pc.color_scheme AS color_scheme
        FROM events
        LEFT JOIN projects p ON p.id = events.project_id AND p.deleted_at IS NULL
        LEFT JOIN project_categories pc ON pc.id = p.project_category_id AND pc.deleted_at IS NULL
        WHERE events.deleted_at IS NULL AND events.start_datetime > ?
        ORDER BY events.start_datetime LIMIT ?`,
        [nowStr, number]
    )
    await attachPeople(events)
    return events
}

export async function getEventWithPeople(id: string): Promise<Event | undefined> {
    const rows = await query<Event>(
        'SELECT * FROM events WHERE id = ? AND deleted_at IS NULL',
        [id]
    )

    const event = rows[0]
    if (!event) return undefined

    const people = await query<Person>(
        `SELECT people.*
        FROM people INNER JOIN person_at_event ON person_at_event.person_id = people.id 
            WHERE person_at_event.event_id = ?
            AND people.deleted_at IS NULL
            AND person_at_event.deleted_at IS NULL
        `, [id]
    )

    event.people = people

    return event
}

// Work events for a project whose (local) date falls within [start, end]
// inclusive — start/end are YYYY-MM-DD. Ordered chronologically, for timesheets.
export async function getProjectEventsInRange(projectId: string, start: string, end: string): Promise<Event[]> {
    return query<Event>(
        `SELECT * FROM events
         WHERE project_id = ? AND deleted_at IS NULL
           AND substr(start_datetime, 1, 10) >= ? AND substr(start_datetime, 1, 10) <= ?
         ORDER BY start_datetime`,
        [projectId, start, end],
    )
}

export async function getEvent(id: string): Promise<Event | undefined> {
    const events = await query<Event>(
        'SELECT * FROM events WHERE id = ? AND deleted_at IS NULL',
        [id]
    )
    return events[0]
}

export async function updateEvent(id: string, data: Record<string, unknown>, personIds?: string[]): Promise<void> {
    const txn = async () => {
        await update('events', columns, id, data)
        if (personIds !== undefined) {
            await updateAttendees(id, personIds)
        }
    }

    await transaction(txn)
}

export async function updateAttendees(eventId: string, personIds: string[]): Promise<void> {
    // Soft-delete attendees no longer present. With no attendees, remove them all
    // (a bare `NOT IN ()` is invalid SQL).
    if (personIds.length) {
        await exec(`UPDATE person_at_event SET deleted_at = unixepoch() WHERE event_id = ? AND person_id NOT IN (${personIds.map(() => '?').join(', ')})`, [eventId, ...personIds])
    } else {
        await exec('UPDATE person_at_event SET deleted_at = unixepoch() WHERE event_id = ?', [eventId])
    }

    for(let i=0; i < personIds.length; i++) {
        await exec(`INSERT INTO person_at_event (person_id, event_id, deleted_at) 
            VALUES (?, ?, NULL) 
            ON CONFLICT(person_id, event_id) 
            DO UPDATE SET deleted_at = NULL
        `, [personIds[i], eventId])
    }
}