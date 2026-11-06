import { query, exec, transaction } from '@/db'

// Thought Threads: a chronological run of free-text thoughts attached to any of
// the four task-hierarchy entities. An entity links to its thread through its own
// *_has_thought_thread table (thought_threads ← link → entity).
export type ThoughtEntity = 'project_category' | 'project' | 'objective' | 'task'

export type Thought = {
    id: string
    thought_thread_id: string
    title: string | null
    body: string
    created_at: number
    updated_at: number
}

// Fixed table/column names per entity (never user input, so safe to interpolate).
const LINKS: Record<ThoughtEntity, { table: string; column: string }> = {
    project_category: { table: 'project_category_has_thought_thread', column: 'project_category_id' },
    project: { table: 'project_has_thought_thread', column: 'project_id' },
    objective: { table: 'objective_has_thought_thread', column: 'objective_id' },
    task: { table: 'task_has_thought_thread', column: 'task_id' },
}

// Same id shape as the schema default: 32 lowercase hex chars.
const newId = () => crypto.randomUUID().replace(/-/g, '')

// Thoughts across every live thread linked to the entity, oldest first. Normally
// there's one thread, but two devices can each create one offline before syncing;
// reading across all linked threads means neither device's thoughts are lost.
export async function getThoughts(entity: ThoughtEntity, entityId: string): Promise<Thought[]> {
    const { table, column } = LINKS[entity]
    return query<Thought>(
        `SELECT i.id, i.thought_thread_id, i.title, i.body, i.created_at, i.updated_at
         FROM thought_thread_items i
         JOIN thought_threads t ON t.id = i.thought_thread_id AND t.deleted_at IS NULL
         JOIN "${table}" l ON l.thought_thread_id = t.id AND l.deleted_at IS NULL
         WHERE l."${column}" = ? AND i.deleted_at IS NULL
         ORDER BY i.created_at ASC, i.id ASC`,
        [entityId],
    )
}

// Adds a thought, creating the entity's thread (and its link) on first use. New
// thoughts go to the oldest linked thread so the choice is stable across devices.
export async function createThought(
    entity: ThoughtEntity,
    entityId: string,
    input: { title: string | null; body: string },
): Promise<void> {
    const { table, column } = LINKS[entity]
    await transaction(async () => {
        const linked = await query<{ thought_thread_id: string }>(
            `SELECT l.thought_thread_id
             FROM "${table}" l
             JOIN thought_threads t ON t.id = l.thought_thread_id AND t.deleted_at IS NULL
             WHERE l."${column}" = ? AND l.deleted_at IS NULL
             ORDER BY l.created_at ASC, l.thought_thread_id ASC
             LIMIT 1`,
            [entityId],
        )
        let threadId = linked[0]?.thought_thread_id
        if (!threadId) {
            threadId = newId()
            await exec('INSERT INTO thought_threads (id) VALUES (?)', [threadId])
            await exec(`INSERT INTO "${table}" ("${column}", thought_thread_id) VALUES (?, ?)`, [entityId, threadId])
        }
        await exec('INSERT INTO thought_thread_items (id, thought_thread_id, title, body) VALUES (?, ?, ?, ?)', [
            newId(), threadId, input.title, input.body,
        ])
    })
}

export async function updateThought(id: string, input: { title: string | null; body: string }): Promise<void> {
    await exec('UPDATE thought_thread_items SET title = ?, body = ? WHERE id = ?', [input.title, input.body, id])
}

// Soft delete, so the removal syncs to other devices as a tombstone.
export async function deleteThought(id: string): Promise<void> {
    await exec('UPDATE thought_thread_items SET deleted_at = unixepoch() WHERE id = ?', [id])
}
