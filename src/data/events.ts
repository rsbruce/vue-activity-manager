import { query, exec, transaction } from '@/db'
import type { Event } from '@/types/events'
import type { Person } from '@/types/people'

export async function createEvent(input: {
    name: string, project_id?: string, start_datetime: string, end_datetime: string, person_ids: string[]
}): Promise<Event | undefined>
{
    const rows = await query<Event>(
        'INSERT INTO events (name, project_id, start_datetime, end_datetime) VALUES (?, ?, ?, ?) RETURNING *',
        [input.name, input.project_id ?? null, input.start_datetime, input.end_datetime]
    )

    const event = rows[0];

    if(input.person_ids && event) {
        for (let i=0; i < input.person_ids.length; i++) {
            await exec('INSERT INTO person_at_event (person_id, event_id) VALUES (?, ?)',
                [input.person_ids[i], event.id]
            )
        }
    }

    return event;
}

export async function getAllEventsWithPeople(): Promise<Event[]> {
    const events = await query<Event>(
        'SELECT * FROM events WHERE project_id IS NULL AND deleted_at IS NULL ORDER BY start_datetime DESC',
    )

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

export async function getEvent(id: string): Promise<Event | undefined> {
    const events = await query<Event>(
        'SELECT * FROM events WHERE id = ? AND deleted_at IS NULL',
        [id]
    )
    return events[0]
}