import { query, exec } from '@/db'
import type { Objective, Project, ProjectCategory, Task } from '@/types/projects'
import { update, reorder } from './utils'

const STATUS_SQL = `CASE WHEN completed_at IS NOT NULL THEN 'complete' WHEN active = 1 THEN 'active' ELSE 'upcoming' END`
const hasDescription = (d: string | null) => !!(d && d.trim())

export async function getObjective(id: string): Promise<Objective | undefined> {
    const rows = await query<Objective>('SELECT * FROM objectives WHERE id = ?', [id])
    const objective = rows[0]
    if (!objective) return undefined

    const tasks = await query<Task>(
        'SELECT * FROM tasks WHERE objective_id = ? AND deleted_at IS NULL ORDER BY "order"',
        [id],
    )
    tasks.forEach((t) => (t.has_description = hasDescription(t.description)))
    objective.tasks = tasks

    if (objective.project_id) {
        const projects = await query<Project>(
            `SELECT *, ${STATUS_SQL} as status FROM projects WHERE id = ?`,
            [objective.project_id],
        )
        const project = projects[0]
        if (project) {
            if (project.project_category_id) {
                const areas = await query<ProjectCategory>('SELECT * FROM project_categories WHERE id = ?', [project.project_category_id])
                const area = areas[0]
                if (area) {
                    area.projects = await query<Project>(
                        'SELECT * FROM projects WHERE project_category_id = ? AND deleted_at IS NULL ORDER BY "order"',
                        [project.project_category_id],
                    )
                    project.project_area = area
                }
            }
            objective.project = project
        }
    }

    return objective
}

export async function createObjective(input: { name: string; description?: string | null; project_id: string }): Promise<void> {
    await exec(
        'INSERT INTO objectives (name, description, project_id) VALUES (?, ?, ?)',
        [input.name, input.description ?? null, input.project_id],
    )
}

export async function updateObjective(id: string, input: { name: string; description?: string | null; project_id?: string | null }): Promise<void> {
    await update('objectives', ['name', 'description', 'project_id'], id, {
        name: input.name,
        description: input.description ?? null,
        project_id: input.project_id ?? null,
    })
}

export async function completeObjective(id: string): Promise<void> {
    await exec('UPDATE objectives SET completed_at = unixepoch() WHERE id = ?', [id])
}

export async function uncompleteObjective(id: string): Promise<void> {
    await exec('UPDATE objectives SET completed_at = NULL WHERE id = ?', [id])
}

export async function reorderObjectives(items: { id: string; order: number | null }[]): Promise<void> {
    await reorder('objectives', items)
}
