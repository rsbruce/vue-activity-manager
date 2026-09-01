import { query, exec } from '@/db'
import type { Task, Objective, Project } from '@/types/projects'
import { update, reorder } from './utils'

export async function getTask(id: string): Promise<Task | undefined> {
    const rows = await query<Task>('SELECT * FROM tasks WHERE id = ?', [id])
    const task = rows[0]
    if (!task) return undefined

    if (task.objective_id) {
        const objectives = await query<Objective>('SELECT * FROM objectives WHERE id = ?', [task.objective_id])
        const objective = objectives[0]
        if (objective) {
            if (objective.project_id) {
                const projects = await query<Project>('SELECT * FROM projects WHERE id = ?', [objective.project_id])
                const project = projects[0]
                if (project) {
                    project.objectives = await query<Objective>(
                        'SELECT * FROM objectives WHERE project_id = ? AND deleted_at IS NULL ORDER BY "order"',
                        [objective.project_id],
                    )
                    objective.project = project
                }
            }
            task.objective = objective
        }
    }

    return task
}

export async function createTask(input: { name: string; description?: string | null; objective_id: string }): Promise<void> {
    await exec(
        'INSERT INTO tasks (name, description, objective_id) VALUES (?, ?, ?)',
        [input.name, input.description ?? null, input.objective_id],
    )
}

export async function updateTask(id: string, input: { name: string; description?: string | null; objective_id?: string | null }): Promise<void> {
    await update('tasks', ['name', 'description', 'objective_id'], id, {
        name: input.name,
        description: input.description ?? null,
        objective_id: input.objective_id ?? null,
    })
}

export async function completeTask(id: string): Promise<void> {
    await exec('UPDATE tasks SET completed_at = unixepoch() WHERE id = ?', [id])
}

export async function uncompleteTask(id: string): Promise<void> {
    await exec('UPDATE tasks SET completed_at = NULL WHERE id = ?', [id])
}

// Set an exact completion time (unixepoch seconds), e.g. from a datetime picker.
export async function setTaskCompletedAt(id: string, seconds: number): Promise<void> {
    await exec('UPDATE tasks SET completed_at = ? WHERE id = ?', [seconds, id])
}

export async function reorderTasks(items: { id: string; order: number | null }[]): Promise<void> {
    await reorder('tasks', items)
}
