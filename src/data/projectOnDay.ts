import { query, exec } from '@/db'
import type { ProjectOnDayData } from '@/types/projects'

/** Scheduled projects per day from `startYmd` onward, keyed date -> project_id. */
export async function getProjectOnDayData(startYmd: string): Promise<ProjectOnDayData> {
    const rows = await query<{ project_id: string; date: string }>(
        'SELECT project_id, date FROM project_on_day WHERE date >= ? AND deleted_at IS NULL',
        [startYmd],
    )

    const data: ProjectOnDayData = {}
    for (const row of rows) {
        const day = (data[row.date] ??= {})
        day[row.project_id] = { project_id: row.project_id }
    }
    return data
}

export async function addProjectOnDay(projectId: string, dateYmd: string): Promise<void> {
    await exec(
        `INSERT INTO project_on_day (project_id, date, deleted_at)
            VALUES (?, ?, NULL)
            ON CONFLICT(project_id, date)
            DO UPDATE SET deleted_at = NULL`,
        [projectId, dateYmd],
    )
}

export async function removeProjectOnDay(projectId: string, dateYmd: string): Promise<void> {
    await exec(
        'UPDATE project_on_day SET deleted_at = unixepoch() WHERE project_id = ? AND date = ?',
        [projectId, dateYmd],
    )
}
