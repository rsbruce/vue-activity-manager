import { query, exec, insert } from '@/db'
import type {
  Activity,
  ActivityType,
  ActivityTypeGroup,
  ActivityWithType,
} from '@/types/activities'

export function getAll(): Promise<Activity[]> {
  return query<Activity>(
    'SELECT * FROM activities WHERE deleted_at IS NULL ORDER BY name',
  )
}

export async function findById(id: string): Promise<Activity | null> {
  const rows = await query<Activity>('SELECT * FROM activities WHERE id = ?', [id])
  return rows[0] ?? null
}

export async function findByIdWithType(id: string): Promise<ActivityWithType | null> {
  const activities = await query<Activity>(
    'SELECT * FROM activities WHERE id = ?',
    [id],
  )
  const activity = activities[0]
  if (!activity) return null
  const types = await query<ActivityType>(
    'SELECT * FROM activity_types WHERE id = ?',
    [activity.activity_type_id],
  )
  return { ...activity, activityType: types[0] ?? null }
}

export async function getTypeGroups(): Promise<ActivityTypeGroup[]> {
  const types = await query<ActivityType>(
    'SELECT * FROM activity_types WHERE deleted_at IS NULL ORDER BY name',
  )
  const activities = await query<Activity>(
    'SELECT * FROM activities WHERE deleted_at IS NULL ORDER BY name',
  )
  const byType = new Map<string, Activity[]>()
  for (const a of activities) {
    const list = byType.get(a.activity_type_id) ?? []
    list.push(a)
    byType.set(a.activity_type_id, list)
  }
  return types.map((t) => ({
    activityType: t,
    activities: byType.get(t.id) ?? [],
  }))
}

export async function create(input: {
  name: string
  activity_type_id: string
}): Promise<Activity | undefined> {
  const rows = await insert<Activity>(
    'INSERT INTO activities (name, activity_type_id) VALUES (?, ?) RETURNING *',
    [input.name, input.activity_type_id],
  )
  return rows[0]
}

export async function update(
  id: string,
  input: { name?: string; activity_type_id?: string },
): Promise<void> {
  const sets: string[] = []
  const params: unknown[] = []
  if (input.name !== undefined) {
    sets.push('name = ?')
    params.push(input.name)
  }
  if (input.activity_type_id !== undefined) {
    sets.push('activity_type_id = ?')
    params.push(input.activity_type_id)
  }
  if (sets.length === 0) return
  params.push(id)
  await exec(`UPDATE activities SET ${sets.join(', ')} WHERE id = ?`, params)
}

export async function destroy(id: string): Promise<void> {
  await exec('UPDATE activities SET deleted_at = unixepoch() WHERE id = ?', [id])
}

export async function restore(id: string): Promise<void> {
  await exec('UPDATE activities SET deleted_at = NULL WHERE id = ?', [id])
}
