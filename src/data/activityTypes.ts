import { query, exec } from '@/db'
import type { ActivityType } from '@/types/activities'

export function getAll(): Promise<ActivityType[]> {
  return query<ActivityType>(
    'SELECT * FROM activity_types WHERE deleted_at IS NULL ORDER BY name',
  )
}

export function getAllWithTrashed(): Promise<ActivityType[]> {
  return query<ActivityType>('SELECT * FROM activity_types ORDER BY name')
}

export async function findById(id: string): Promise<ActivityType | null> {
  const rows = await query<ActivityType>(
    'SELECT * FROM activity_types WHERE id = ?',
    [id],
  )
  return rows[0] ?? null
}

export async function create(input: {
  name: string
  theme: string
  is_negative?: boolean | null
}): Promise<ActivityType|undefined> {
  const rows = await query<ActivityType>(
    'INSERT INTO activity_types (name, theme, is_negative) VALUES (?, ?, ?) RETURNING *',
    [input.name, input.theme, input.is_negative ?? null],
  )
  return rows[0]
}

export async function update(
  id: string,
  input: { name?: string; theme?: string; is_negative?: boolean | null },
): Promise<void> {
  const sets: string[] = []
  const params: unknown[] = []
  if (input.name !== undefined) {
    sets.push('name = ?')
    params.push(input.name)
  }
  if (input.theme !== undefined) {
    sets.push('theme = ?')
    params.push(input.theme)
  }
  if (input.is_negative !== undefined) {
    sets.push('is_negative = ?')
    params.push(input.is_negative)
  }
  if (sets.length === 0) return
  params.push(id)
  await exec(`UPDATE activity_types SET ${sets.join(', ')} WHERE id = ?`, params)
}

export async function trash(id: string): Promise<void> {
  await exec(
    'UPDATE activity_types SET deleted_at = unixepoch() WHERE id = ?',
    [id],
  )
}

export async function restore(id: string): Promise<void> {
  await exec('UPDATE activity_types SET deleted_at = NULL WHERE id = ?', [id])
}
