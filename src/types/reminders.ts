// Something the user is waiting on from others and expects to wait at least a
// day for. date_of_reminder (always set) is when they expect to hear back;
// date_of_occurrence (nullable) is when it actually happens/happened. A fixed
// date (film release) advertises its occurrence up front; an open-ended one
// (an unanswered email) leaves it null until resolved. Dates are YYYY-MM-DD.
export type Reminder = {
    id: string
    name: string
    date_of_occurrence: string | null
    date_of_reminder: string
    has_fixed_date_of_occurrence: number // 0 | 1 (SQLite boolean)
    project_category_id: string | null
    created_at: number | null
    updated_at: number | null
    deleted_at: number | null
}
