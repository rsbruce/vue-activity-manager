import { query, exec, insert } from '@/db'
import type { Project, Objective, Task, ProjectStatus } from '@/types/projects'
import type { TimetableProjectCategories } from '@/types/events'
import { update, reorder } from './utils'

const STATUS_SQL = `CASE WHEN completed_at IS NOT NULL THEN 'complete' WHEN active = 1 THEN 'active' ELSE 'upcoming' END`

/** Reverse of the derived `status`: map a status to the stored columns.
 * `completed_at` is a Unix epoch (seconds), matching the integer schema. */
export function statusToFields(status: string): { active: number; completed_at: number | null } {
    if (status === 'complete') return { active: 0, completed_at: Math.floor(Date.now() / 1000) }
    if (status === 'upcoming') return { active: 0, completed_at: null }
    return { active: 1, completed_at: null }
}

const hasDescription = (d: string | null) => !!(d && d.trim())

/**
 * Active, non-completed projects with their project-area name and colour scheme.
 * Used to seed the timetable summary (so zero-hour projects still show) and for
 * colour lookups.
 */
export async function getActiveProjectsWithArea(): Promise<Project[]> {
    return query<Project>(
        `SELECT projects.*,
            project_categories.name as area_name,
            project_categories.color_scheme as color_scheme
        FROM projects
        LEFT JOIN project_categories ON project_categories.id = projects.project_category_id
        WHERE projects.active = 1
            AND projects.completed_at IS NULL
            AND projects.deleted_at IS NULL
            AND (project_categories.id IS NULL OR project_categories.deleted_at IS NULL)
        ORDER BY project_categories.name, projects.name`
    )
}

/**
 * All project categories with their (non-deleted) projects, nested for the
 * timetable modal's area → project picker. Objectives are intentionally dropped.
 */
export async function getProjectCategoriesNested(): Promise<TimetableProjectCategories> {
    const rows = await query<{
        id: string
        name: string
        color_scheme: string
        order: number | null
        project_id: string | null
        project_name: string | null
    }>(
        `SELECT pc.id, pc.name, pc.color_scheme, pc."order" as "order",
            p.id as project_id, p.name as project_name
        FROM project_categories pc
        LEFT JOIN projects p
            ON p.project_category_id = pc.id
            AND p.deleted_at IS NULL
        WHERE pc.deleted_at IS NULL
        ORDER BY pc."order", pc.name, p.name`
    )

    const cats: TimetableProjectCategories = {}
    for (const r of rows) {
        const cat = (cats[r.id] ??= { id: r.id, name: r.name, color_scheme: r.color_scheme, order: r.order, projects: {} })
        if (r.project_id) {
            cat.projects[r.project_id] = { id: r.project_id, name: r.project_name ?? '' }
        }
    }
    return cats
}

/** Load a project's objectives (each with their tasks), for show pages. */
async function loadObjectivesWithTasks(projectIds: string[]): Promise<Map<string, Objective[]>> {
    const byProject = new Map<string, Objective[]>()
    if (!projectIds.length) return byProject

    const placeholders = projectIds.map(() => '?').join(', ')
    const objectives = await query<Objective>(
        `SELECT * FROM objectives WHERE project_id IN (${placeholders}) AND deleted_at IS NULL ORDER BY "order"`,
        projectIds,
    )
    const objIds = objectives.map((o) => o.id)
    const tasksByObjective = new Map<string, Task[]>()
    if (objIds.length) {
        const tasks = await query<Task>(
            `SELECT * FROM tasks WHERE objective_id IN (${objIds.map(() => '?').join(', ')}) AND deleted_at IS NULL ORDER BY "order"`,
            objIds,
        )
        for (const t of tasks) {
            t.has_description = hasDescription(t.description)
            const list = tasksByObjective.get(t.objective_id ?? '') ?? []
            list.push(t)
            tasksByObjective.set(t.objective_id ?? '', list)
        }
    }
    for (const o of objectives) {
        o.tasks = tasksByObjective.get(o.id) ?? []
        o.has_description = hasDescription(o.description)
        const list = byProject.get(o.project_id ?? '') ?? []
        list.push(o)
        byProject.set(o.project_id ?? '', list)
    }
    return byProject
}

export async function getProject(id: string): Promise<Project | undefined> {
    const rows = await query<Project>(
        `SELECT *, ${STATUS_SQL} as status FROM projects WHERE id = ?`,
        [id],
    )
    const project = rows[0]
    if (!project) return undefined

    if (project.project_category_id) {
        const areas = await query<Project['project_area']>(
            'SELECT * FROM project_categories WHERE id = ?',
            [project.project_category_id],
        )
        project.project_area = areas[0]
    }

    const objectivesByProject = await loadObjectivesWithTasks([id])
    project.objectives = objectivesByProject.get(id) ?? []

    return project
}

export async function createProject(input: {
    name: string
    description?: string | null
    status: string
    project_category_id: string
    set_as_to_do_list?: boolean
}): Promise<Project | undefined> {
    const fields = statusToFields(input.status)
    const rows = await insert<Project>(
        `INSERT INTO projects (name, description, active, completed_at, project_category_id)
            VALUES (?, ?, ?, ?, ?) RETURNING *`,
        [input.name, input.description ?? null, fields.active, fields.completed_at, input.project_category_id],
    )
    const project = rows[0]
    if (project && input.set_as_to_do_list) {
        await setToDoListProject(project.id)
    }
    return project
}

export async function updateProject(id: string, input: {
    name: string
    description?: string | null
    status: string
    project_category_id: string
    set_as_to_do_list?: boolean
}): Promise<void> {
    await update('projects', ['name', 'description', 'active', 'completed_at', 'project_category_id'], id, {
        name: input.name,
        description: input.description ?? null,
        project_category_id: input.project_category_id,
        ...statusToFields(input.status),
    })
    if (input.set_as_to_do_list) {
        await setToDoListProject(id)
    }
}

export async function updateProjectStatus(id: string, status: ProjectStatus | string): Promise<void> {
    await update('projects', ['active', 'completed_at'], id, statusToFields(status))
}

export async function reorderProjects(items: { id: string; order: number | null }[]): Promise<void> {
    await reorder('projects', items)
}

export async function getToDoListProjectId(): Promise<string | null> {
    const rows = await query<{ to_do_list_project_id: string | null }>(
        'SELECT to_do_list_project_id FROM to_do_list_project LIMIT 1',
    )
    return rows[0]?.to_do_list_project_id ?? null
}

export async function setToDoListProject(projectId: string): Promise<void> {
    const rows = await query<{ id: string }>('SELECT id FROM to_do_list_project LIMIT 1')
    if (rows[0]) {
        await exec('UPDATE to_do_list_project SET to_do_list_project_id = ? WHERE id = ?', [projectId, rows[0].id])
    } else {
        await exec('INSERT INTO to_do_list_project (to_do_list_project_id) VALUES (?)', [projectId])
    }
}

export async function clearToDoListProject(): Promise<void> {
    await exec('UPDATE to_do_list_project SET to_do_list_project_id = NULL')
}

/** All non-deleted projects in non-deleted categories (optionally excluding one),
 * each with objectives→tasks + derived status. For the Planner. */
export async function getProjectsForPlanner(excludeId: string | null): Promise<Project[]> {
    const projects = await query<Project>(
        `SELECT *, ${STATUS_SQL} as status
        FROM projects
        WHERE deleted_at IS NULL
            AND project_category_id IN (SELECT id FROM project_categories WHERE deleted_at IS NULL)
            ${excludeId ? 'AND id != ?' : ''}
        ORDER BY "order"`,
        excludeId ? [excludeId] : [],
    )
    const byProject = await loadObjectivesWithTasks(projects.map((p) => p.id))
    for (const p of projects) p.objectives = byProject.get(p.id) ?? []
    return projects
}

/** The to-do-list project with objectives that are incomplete or completed today
 * (each with their tasks). */
export async function getToDoListProject(id: string): Promise<Project | undefined> {
    const rows = await query<Project>(
        `SELECT *, ${STATUS_SQL} as status FROM projects WHERE id = ? AND deleted_at IS NULL`,
        [id],
    )
    const project = rows[0]
    if (!project) return undefined

    const todayStartUnix = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
    const objectives = await query<Objective>(
        `SELECT * FROM objectives
        WHERE project_id = ? AND deleted_at IS NULL
            AND (completed_at IS NULL OR completed_at > ?)
        ORDER BY "order"`,
        [id, todayStartUnix],
    )

    const objIds = objectives.map((o) => o.id)
    const tasksByObjective = new Map<string, Task[]>()
    if (objIds.length) {
        const tasks = await query<Task>(
            `SELECT * FROM tasks WHERE objective_id IN (${objIds.map(() => '?').join(', ')}) AND deleted_at IS NULL ORDER BY "order"`,
            objIds,
        )
        for (const t of tasks) {
            t.has_description = hasDescription(t.description)
            const list = tasksByObjective.get(t.objective_id ?? '') ?? []
            list.push(t)
            tasksByObjective.set(t.objective_id ?? '', list)
        }
    }
    for (const o of objectives) {
        o.tasks = tasksByObjective.get(o.id) ?? []
        o.has_description = hasDescription(o.description)
    }
    project.objectives = objectives
    return project
}
