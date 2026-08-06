import { exec, query, transaction, insert } from '@/db'
import type { ProjectCategory, Project, Objective } from '@/types/projects'
import { update, reorder } from './utils'

const STATUS_SQL = `CASE WHEN completed_at IS NOT NULL THEN 'complete' WHEN active = 1 THEN 'active' ELSE 'upcoming' END`

export async function getAllProjectCategories(): Promise<ProjectCategory[]> {
    return query<ProjectCategory>(
        `SELECT pc.*,
            (SELECT COUNT(*) FROM projects
                WHERE projects.project_category_id = pc.id AND projects.deleted_at IS NULL
            ) as project_count
        FROM project_categories pc
        WHERE pc.deleted_at IS NULL
        ORDER BY pc."order"`,
    )
}

export async function getProjectCategory(id: string): Promise<ProjectCategory | undefined> {
    const rows = await query<ProjectCategory>('SELECT * FROM project_categories WHERE id = ?', [id])
    const category = rows[0]
    if (!category) return undefined

    const general = await query<{ project_id: string }>(
        'SELECT project_id FROM general_projects WHERE project_category_id = ? AND deleted_at IS NULL LIMIT 1',
        [id],
    )
    category.general_project_id = general[0]?.project_id ?? null

    const projects = await query<Project>(
        `SELECT *, ${STATUS_SQL} as status
        FROM projects
        WHERE project_category_id = ? AND deleted_at IS NULL
        ORDER BY "order"`,
        [id],
    )

    const projectIds = projects.map((p) => p.id)
    const objByProject = new Map<string, Objective[]>()
    if (projectIds.length) {
        const objectives = await query<Objective>(
            `SELECT * FROM objectives
            WHERE project_id IN (${projectIds.map(() => '?').join(', ')}) AND deleted_at IS NULL
            ORDER BY "order"`,
            projectIds,
        )
        for (const o of objectives) {
            const list = objByProject.get(o.project_id ?? '') ?? []
            list.push(o)
            objByProject.set(o.project_id ?? '', list)
        }
    }
    for (const p of projects) p.objectives = objByProject.get(p.id) ?? []

    category.projects = projects
    return category
}

export async function createProjectCategory(input: { name: string; color_scheme: string }): Promise<ProjectCategory | undefined> {
    const rows = await insert<ProjectCategory>(
        'INSERT INTO project_categories (name, color_scheme) VALUES (?, ?) RETURNING *',
        [input.name, input.color_scheme],
    )
    return rows[0]
}

export async function updateProjectCategory(id: string, input: { name: string; color_scheme: string; general_project_id: string | null }): Promise<void> {
    const txn = async () => {
        await update('project_categories', ['name', 'color_scheme'], id, input)

        // general_projects has no id column (its PK is project_id) and holds at
        // most one live row per category, so the id-keyed update helper can't be
        // used. Clear the category's current general project, then upsert the new
        // one keyed on the project_id PK. Removal is a soft delete so it syncs as
        // a tombstone; updated_at is bumped by the table's trigger.
        await exec(
            'UPDATE general_projects SET deleted_at = unixepoch() WHERE project_category_id = ? AND deleted_at IS NULL',
            [id],
        )

        if (input.general_project_id !== null) {
            await exec(
                `INSERT INTO general_projects (project_id, project_category_id) VALUES (?, ?)
                 ON CONFLICT(project_id) DO UPDATE SET project_category_id = excluded.project_category_id, deleted_at = NULL`,
                [input.general_project_id, id],
            )
        }
    }

    await transaction(txn)
}

export async function reorderProjectCategories(items: { id: string; order: number | null }[]): Promise<void> {
    await reorder('project_categories', items)
}
