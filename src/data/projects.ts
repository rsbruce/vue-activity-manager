import { query } from '@/db'
import type { Project } from '@/types/projects'
import type { TimetableProjectCategories } from '@/types/events'

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
