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

// An objective decorated with its project category (id + colour scheme) plus
// task-count / description meta, for grouping, theming, and CheckableItem.
export type CategorisedObjective = Objective & {
    color_scheme: string | null
    project_category_id: string | null
    total_tasks?: number
    incomplete_tasks?: number
}
export type DueDateObjective = CategorisedObjective

// Shared columns + joins for the objective-list queries below. The task counts
// and description flag feed CheckableItem (its task meta, and the checkbox that
// stays disabled while tasks remain).
const OBJECTIVE_LIST_SELECT = `
    objectives.*,
    pc.id AS project_category_id,
    pc.color_scheme AS color_scheme,
    (SELECT COUNT(*) FROM tasks t WHERE t.objective_id = objectives.id AND t.deleted_at IS NULL) AS total_tasks,
    (SELECT COUNT(*) FROM tasks t WHERE t.objective_id = objectives.id AND t.completed_at IS NULL AND t.deleted_at IS NULL) AS incomplete_tasks,
    (objectives.description IS NOT NULL AND trim(objectives.description) <> '') AS has_description`
const OBJECTIVE_LIST_FROM = `
    FROM objectives
    LEFT JOIN projects p ON p.id = objectives.project_id AND p.deleted_at IS NULL
    LEFT JOIN project_categories pc ON pc.id = p.project_category_id AND pc.deleted_at IS NULL`

// Incomplete, non-deleted objectives that have a due date, ordered by date so
// they can be grouped by day for the planner. Carries the objective's project
// category (id + colour scheme) for grouping and theming.
export async function getObjectivesByDueDate(): Promise<DueDateObjective[]> {
    return query<DueDateObjective>(
        `SELECT ${OBJECTIVE_LIST_SELECT} ${OBJECTIVE_LIST_FROM}
        WHERE objectives.due_date IS NOT NULL
            AND objectives.completed_at IS NULL
            AND objectives.deleted_at IS NULL
        ORDER BY objectives.due_date ASC, objectives."order", objectives.name`,
    )
}

// Monday 00:00 (local) of the week containing `date`.
export function startOfWeek(date: Date): Date {
    const daysSinceMonday = (date.getDay() + 6) % 7 // getDay(): Sun=0 … Sat=6
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday)
}

// Objectives completed during the week beginning `weekStart` (a Monday 00:00
// local), most recent first. Carries the project category for grouping/theming.
export async function getObjectivesCompletedInWeek(weekStart: Date): Promise<CategorisedObjective[]> {
    // Compare against completed_at (unixepoch seconds). weekEnd via date
    // arithmetic (not +7·86400) so it stays correct across a DST boundary.
    const start = Math.floor(weekStart.getTime() / 1000)
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7)
    const end = Math.floor(weekEnd.getTime() / 1000)

    return query<CategorisedObjective>(
        `SELECT ${OBJECTIVE_LIST_SELECT} ${OBJECTIVE_LIST_FROM}
        WHERE objectives.completed_at IS NOT NULL
            AND objectives.completed_at >= ?
            AND objectives.completed_at < ?
            AND objectives.deleted_at IS NULL
        ORDER BY objectives.completed_at DESC, objectives."order", objectives.name`,
        [start, end],
    )
}

export async function createObjective(input: { name: string; description?: string | null; project_id: string }): Promise<void> {
    await exec(
        'INSERT INTO objectives (name, description, project_id) VALUES (?, ?, ?)',
        [input.name, input.description ?? null, input.project_id],
    )
}

export async function updateObjective(id: string, input: { name: string; description?: string | null; project_id?: string | null; due_date?: string | null }): Promise<void> {
    await update('objectives', ['name', 'description', 'project_id', 'due_date'], id, {
        name: input.name,
        description: input.description ?? null,
        project_id: input.project_id ?? null,
        due_date: input.due_date ?? null,
    })
}

export async function completeObjective(id: string): Promise<void> {
    await exec('UPDATE objectives SET completed_at = unixepoch() WHERE id = ?', [id])
}

export async function uncompleteObjective(id: string): Promise<void> {
    await exec('UPDATE objectives SET completed_at = NULL WHERE id = ?', [id])
}

// Set an exact completion time (unixepoch seconds), e.g. from a datetime picker.
export async function setObjectiveCompletedAt(id: string, seconds: number): Promise<void> {
    await exec('UPDATE objectives SET completed_at = ? WHERE id = ?', [seconds, id])
}

export async function reorderObjectives(items: { id: string; order: number | null }[]): Promise<void> {
    await reorder('objectives', items)
}

export async function getIncompleteObjectivesForProject(projectId: string): Promise<Objective[]> {
    return query<Objective>(
        `SELECT * FROM objectives WHERE project_id = ? AND completed_at IS NULL AND deleted_at IS NULL ORDER BY "order", name`,
        [projectId],
    )
}

// ── Current objective (a logical singleton pointer, like to_do_list_project) ──
// Stored in its own one-row table so "only one current" survives sync: LWW on the
// single row resolves competing devices to one winner (a per-row boolean can't).
export async function getCurrentObjectiveId(): Promise<string | null> {
    const rows = await query<{ objective_id: string | null }>(
        `SELECT objective_id FROM current_objective WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`,
    )
    return rows[0]?.objective_id ?? null
}

export async function setCurrentObjective(objectiveId: string): Promise<void> {
    const rows = await query<{ id: string }>('SELECT id FROM current_objective WHERE deleted_at IS NULL LIMIT 1')
    if (rows[0]) {
        await exec('UPDATE current_objective SET objective_id = ? WHERE deleted_at IS NULL', [objectiveId])
    } else {
        await exec('INSERT INTO current_objective (objective_id) VALUES (?)', [objectiveId])
    }
}

export async function clearCurrentObjective(): Promise<void> {
    await exec('UPDATE current_objective SET objective_id = NULL WHERE deleted_at IS NULL')
}
