import { query, exec, transaction } from '@/db'
import type { Event } from '@/types/events'
import type { Person } from '@/types/people'

export async function getAllPeople(): Promise<Person[]>
{
    const people = await query<Person>(
        `SELECT 
            people.*,
            (SELECT COUNT(*) FROM events 
                INNER JOIN person_at_event ON person_at_event.event_id = events.id 
                WHERE people.id = person_at_event.person_id 
                AND events.deleted_at IS NULL
                AND people.deleted_at IS NULL
            ) as events_count
        FROM people WHERE people.deleted_at IS NULL
        `)

    return people
}