import { query, exec, transaction, insert } from '@/db'
import type { Event } from '@/types/events'
import type { Person } from '@/types/people'
import { update } from './utils'

const columns = ['firstname', 'lastname', 'dob']

export async function getAllPeople(): Promise<Person[]>
{
    // "Now" as a local wall-clock string matching how start_datetime is stored
    // (YYYY-MM-DDTHH:mm), so the past/future comparisons below sort correctly.
    // Bound to each of the four placeholders — without it they were NULL, which
    // made last-seen / next-event always resolve to nothing.
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

    const people = await query<Person>(`
        SELECT people.*, 
        (SELECT count(*) 
            FROM events 
            INNER JOIN person_at_event on person_at_event.event_id = events.id 
            WHERE people.id = person_at_event.person_id 
            AND events.deleted_at IS NULL 
            AND person_at_event.deleted_at IS NULL
        ) as events_count, 
        (SELECT MAX(events.start_datetime) 
            FROM person_at_event 
            INNER JOIN events on events.id = person_at_event.event_id 
            WHERE person_at_event.person_id = people.id 
            AND events.start_datetime < ? 
            AND person_at_event.deleted_at IS NULL
        ) as last_seen_date, 
        (SELECT events.id 
            FROM person_at_event 
            INNER JOIN events on events.id = person_at_event.event_id 
            WHERE person_at_event.person_id = people.id 
            AND events.start_datetime >= ? 
            AND person_at_event.deleted_at IS NULL 
            ORDER BY events.start_datetime ASC 
            LIMIT 1
        ) as next_event_id, 
        (SELECT events.start_datetime 
            FROM person_at_event 
            INNER JOIN events on events.id = person_at_event.event_id 
            WHERE person_at_event.person_id = people.id 
            AND events.start_datetime >= ? 
            AND person_at_event.deleted_at IS NULL 
            ORDER BY events.start_datetime ASC 
            LIMIT 1
        ) as next_event_date, 
        (SELECT events.name 
            FROM person_at_event 
            INNER JOIN events on events.id = person_at_event.event_id 
            WHERE person_at_event.person_id = people.id 
            AND events.start_datetime >= ? 
            AND person_at_event.deleted_at IS NULL 
            ORDER BY events.start_datetime ASC 
            LIMIT 1
        ) as next_event_name 
        FROM people WHERE people.deleted_at IS NULL ORDER BY events_count DESC
    `, [nowStr, nowStr, nowStr, nowStr])

    return people
}

export async function createPerson(input: {
    firstname: string, lastname: string, dob?: Date
}): Promise<Event | undefined>
{
    const rows = await insert<Event>(
        'INSERT INTO people (firstname, lastname, dob) VALUES (?, ?, ?) RETURNING *',
        [input.firstname, input.lastname, input.dob?.isoDate()]
    )

    const person = rows[0];

    return person;
}

export async function getPerson(id: string): Promise<Person | undefined> {
    const rows = await query<Person>(
        'SELECT * FROM people WHERE id = ? AND deleted_at IS NULL',
        [id]
    )

    const person = rows[0]
    if (!person) return undefined

    person.events = await query<{ id: string; name: string; start_datetime: string | null }>(
        `SELECT events.id, events.name, events.start_datetime
        FROM events INNER JOIN person_at_event ON person_at_event.event_id = events.id
            WHERE person_at_event.person_id = ?
            AND events.deleted_at IS NULL
            AND person_at_event.deleted_at IS NULL
            ORDER BY events.start_datetime DESC
        `, [id]
    )

    person.groups = await query<{ id: string; name: string }>(
        `SELECT people_groups.id, people_groups.name
        FROM people_groups INNER JOIN person_in_group ON person_in_group.people_group_id = people_groups.id
            WHERE person_in_group.person_id = ?
            AND people_groups.deleted_at IS NULL
            AND person_in_group.deleted_at IS NULL
            ORDER BY people_groups.name
        `, [id]
    )

    if (person.dob) {
        person.dob = (new Date(person.dob)).isoDate()
    }

    return person
}

export async function updatePerson(id: string, data: Record<string, unknown>): Promise<void> {
    await update('people', columns, id, data)
}
