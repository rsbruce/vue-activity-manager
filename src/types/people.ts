export interface PeopleGroup {
    id: string
    name: string
    people?: Person[]
}

export interface Person {
    id: string
    firstname: string
    lastname: string | null
    dob: string | null
    events_count?: number
    events?: { id: string; name: string; date: string }[]
    last_seen_date?: string | null
    next_event_id?: string | null
    next_event_date?: string | null
    next_event_name?: string | null
}
