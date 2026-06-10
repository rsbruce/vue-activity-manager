export interface PeopleGroup {
    id: string
    name: string
    people?: Person[]
    member_count?: number
    deleted_at?: string | null
}

export interface Person {
    id: string
    firstname: string
    lastname: string | null
    dob: string | null
    deleted_at?: string | null
    events_count?: number
    events?: { id: string; name: string; start_datetime: string | null }[]
    groups?: { id: string; name: string }[]
    last_seen_date?: string | null
    next_event_id?: string | null
    next_event_date?: string | null
    next_event_name?: string | null
}
