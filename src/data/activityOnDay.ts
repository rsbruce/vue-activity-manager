import { query, exec } from '@/db'
import type { ActivityOnDay } from '@/types/activities'

export async function toggle(activityId: string, date: string): Promise<boolean> {
  const rows = await query<{ deleted_at: number | null }>(
    'SELECT deleted_at FROM activity_on_day WHERE activity_id = ? AND date = ?',
    [activityId, date],
  )
  const existing = rows[0]
  if (!existing) {
    await exec(
      'INSERT INTO activity_on_day (activity_id, date) VALUES (?, ?)',
      [activityId, date],
    )
    return true
  }
  const wasActive = existing.deleted_at === null
  await exec(
    `UPDATE activity_on_day SET deleted_at = ${wasActive ? 'unixepoch()' : 'NULL'}
     WHERE activity_id = ? AND date = ?`,
    [activityId, date],
  )
  return !wasActive
}

export async function exists(activityId: string, date: string): Promise<boolean> {
  const rows = await query(
    'SELECT 1 FROM activity_on_day WHERE activity_id = ? AND date = ? AND deleted_at IS NULL',
    [activityId, date],
  )
  return rows.length > 0
}

export function getInRange(from: string, to: string): Promise<ActivityOnDay[]> {
  return query<ActivityOnDay>(
    `SELECT * FROM activity_on_day
     WHERE date >= ? AND date <= ? AND deleted_at IS NULL
     ORDER BY date, activity_id`,
    [from, to],
  )
}

export async function countInRange(
  activityId: string,
  from: string,
  to: string,
): Promise<number> {
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM activity_on_day
     WHERE activity_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL`,
    [activityId, from, to],
  )
  return rows[0]?.n ?? 0
}
