import { query, exec } from '@/db'
import type { Reminder } from '@/types/reminders'
import { update } from './utils'
import '@/utils/dateExtensions'

export async function getReminder(id: string): Promise<Reminder | undefined> {
    const rows = await query<Reminder>('SELECT * FROM reminders WHERE id = ?', [id])
    return rows[0]
}

// Visible reminders: those still ahead of us. The hide rule keys off the
// occurrence, not the reminder date, so an overdue open-ended item (reminder
// past, occurrence still null) stays visible — that's exactly the one worth
// chasing. A reminder disappears only once its occurrence is strictly in the
// past (a released film the day after, a resolved email the day after).
// Non-fixed first, fixed beneath; within each, soonest date first.
export async function getVisibleReminders(): Promise<Reminder[]> {
    const today = new Date().isoDate()
    return query<Reminder>(
        `SELECT * FROM reminders
         WHERE deleted_at IS NULL
           AND (date_of_occurrence IS NULL OR date_of_occurrence >= ?)
         ORDER BY has_fixed_date_of_occurrence ASC,
                  CASE WHEN has_fixed_date_of_occurrence = 1 THEN date_of_occurrence ELSE date_of_reminder END ASC,
                  name`,
        [today],
    )
}

// The full index: every reminder, including resolved and past ones. Same
// ordering as the visible list (open first, then fixed; soonest date first).
export async function getAllReminders(): Promise<Reminder[]> {
    return query<Reminder>(
        `SELECT * FROM reminders
         WHERE deleted_at IS NULL
         ORDER BY has_fixed_date_of_occurrence ASC,
                  CASE WHEN has_fixed_date_of_occurrence = 1 THEN date_of_occurrence ELSE date_of_reminder END ASC,
                  name`,
    )
}

export async function createReminder(input: {
    name: string
    date_of_reminder: string
    date_of_occurrence?: string | null
    has_fixed_date_of_occurrence: boolean
    project_category_id?: string | null
}): Promise<void> {
    await exec(
        `INSERT INTO reminders
            (name, date_of_reminder, date_of_occurrence, has_fixed_date_of_occurrence, project_category_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
            input.name,
            input.date_of_reminder,
            input.date_of_occurrence ?? null,
            input.has_fixed_date_of_occurrence ? 1 : 0,
            input.project_category_id ?? null,
        ],
    )
}

export async function updateReminder(id: string, input: {
    name: string
    date_of_reminder: string
    date_of_occurrence?: string | null
    has_fixed_date_of_occurrence: boolean
    project_category_id?: string | null
}): Promise<void> {
    await update('reminders', ['name', 'date_of_reminder', 'date_of_occurrence', 'has_fixed_date_of_occurrence', 'project_category_id'], id, {
        name: input.name,
        date_of_reminder: input.date_of_reminder,
        date_of_occurrence: input.date_of_occurrence ?? null,
        has_fixed_date_of_occurrence: input.has_fixed_date_of_occurrence ? 1 : 0,
        project_category_id: input.project_category_id ?? null,
    })
}

// The open-ended-reminder equivalent of completing an objective: stamping the
// occurrence with today records that we've heard back. It stays visible today
// (today isn't strictly past), then drops off tomorrow.
export async function resolveReminder(id: string): Promise<void> {
    await exec('UPDATE reminders SET date_of_occurrence = ? WHERE id = ?', [new Date().isoDate(), id])
}

export async function unresolveReminder(id: string): Promise<void> {
    await exec('UPDATE reminders SET date_of_occurrence = NULL WHERE id = ?', [id])
}
