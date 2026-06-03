import { query, exec, transaction } from '@/db'
import type { Event } from '@/types/events'
import type { Person } from '@/types/people'

export async function getAllPeople(): Promise<Person[]>
{
    // const people = await query<Person>(
    //     `SELECT 
    //         people.*,
    //         (SELECT COUNT(*) FROM events 
    //             INNER JOIN person_at_event ON person_at_event.event_id = events.id 
    //             WHERE people.id = person_at_event.person_id 
    //             AND events.deleted_at IS NULL
    //             AND people.deleted_at IS NULL
    //         ) as events_count
    //     FROM people WHERE people.deleted_at IS NULL
    //     `)

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
    `)

    return people
}