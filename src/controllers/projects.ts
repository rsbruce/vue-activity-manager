import type { RouteLocationNormalized } from 'vue-router'
import { defineController } from '@/router/defineController'
import type { ProjectCategory, Project, Objective, Task } from '@/types/projects'
import { getAllProjectCategories, getProjectCategory } from '@/data/projectCategories'
import { getProject, getToDoListProjectId } from '@/data/projects'
import { getObjective } from '@/data/objectives'
import { getTask } from '@/data/tasks'

// ── Project Categories ────────────────────────────────────────────────
export const categoriesIndexController = defineController<{ categories: ProjectCategory[] }>(
    async (): Promise<{ categories: ProjectCategory[] }> => {
        const categories = await getAllProjectCategories()
        return { categories }
    },
)

export const categoryShowController = defineController<{ category: ProjectCategory | undefined }>(
    async (route: RouteLocationNormalized): Promise<{ category: ProjectCategory | undefined }> => {
        const category = await getProjectCategory(route.params.id as string)
        return { category }
    },
)

export const categoryEditController = defineController<{ category: ProjectCategory | undefined }>(
    async (route: RouteLocationNormalized): Promise<{ category: ProjectCategory | undefined }> => {
        const category = await getProjectCategory(route.params.id as string)
        return { category }
    },
)

// ── Projects ──────────────────────────────────────────────────────────
export const projectShowController = defineController<{ project: Project | undefined }>(
    async (route: RouteLocationNormalized): Promise<{ project: Project | undefined }> => {
        const project = await getProject(route.params.id as string)
        return { project }
    },
)

type ProjectEditData = { project: Project | undefined; categories: ProjectCategory[]; toDoListProjectId: string | null }

export const projectEditController = defineController<ProjectEditData>(
    async (route: RouteLocationNormalized): Promise<ProjectEditData> => {
        const [project, categories, toDoListProjectId] = await Promise.all([
            getProject(route.params.id as string),
            getAllProjectCategories(),
            getToDoListProjectId(),
        ])
        return { project, categories, toDoListProjectId }
    },
)

// ── Objectives ────────────────────────────────────────────────────────
const loadObjective = async (route: RouteLocationNormalized): Promise<{ objective: Objective | undefined }> => {
    const objective = await getObjective(route.params.id as string)
    return { objective }
}

export const objectiveShowController = defineController<{ objective: Objective | undefined }>(loadObjective)
export const objectiveEditController = defineController<{ objective: Objective | undefined }>(loadObjective)

// ── Tasks ─────────────────────────────────────────────────────────────
const loadTask = async (route: RouteLocationNormalized): Promise<{ task: Task | undefined }> => {
    const task = await getTask(route.params.id as string)
    return { task }
}

export const taskShowController = defineController<{ task: Task | undefined }>(loadTask)
export const taskEditController = defineController<{ task: Task | undefined }>(loadTask)
