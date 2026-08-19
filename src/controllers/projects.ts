import type { RouteLocationNormalized } from 'vue-router'
import { defineController } from '@/router/defineController'
import type { ProjectCategory, Project, Objective, Task } from '@/types/projects'
import { getAllProjectCategories, getProjectCategory } from '@/data/projectCategories'
import { getObjective, getObjectivesByDueDate, getObjectivesCompletedInWeek, startOfWeek, type DueDateObjective, type CategorisedObjective } from '@/data/objectives'
import { getProject, getToDoListProjectId, getActiveProjectsWithArea, getProjectsForPlanner } from '@/data/projects'
import { getTask } from '@/data/tasks'


// ── Project Categories ────────────────────────────────────────────────
type CategoriesIndexData = {
    categories: ProjectCategory[]
    projects: Project[]
    toDoListProjectId: string | null
}

export const categoriesIndexController = defineController<CategoriesIndexData>(
    async (): Promise<CategoriesIndexData> => {
        const [categories, projects, toDoListProjectId] = await Promise.all([
            getAllProjectCategories(),
            getProjectsForPlanner(null),
            getToDoListProjectId(),
        ])
        return { categories, projects, toDoListProjectId }
    },
)

// ── Agenda ────────────────────────────────────────────────────────────
type AgendaData = {
    categories: ProjectCategory[]
    dueDateObjectives: DueDateObjective[]
    completedThisWeek: CategorisedObjective[]
}

export const agendaController = defineController<AgendaData>(
    async (): Promise<AgendaData> => {
        const [categories, dueDateObjectives, completedThisWeek] = await Promise.all([
            getAllProjectCategories(),
            getObjectivesByDueDate(),
            getObjectivesCompletedInWeek(startOfWeek(new Date())),
        ])
        return { categories, dueDateObjectives, completedThisWeek }
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

type ProjectEditData = { project: Project | undefined; categories: ProjectCategory[] }

export const projectEditController = defineController<ProjectEditData>(
    async (route: RouteLocationNormalized): Promise<ProjectEditData> => {
        const [project, categories] = await Promise.all([
            getProject(route.params.id as string),
            getAllProjectCategories(),
        ])
        return { project, categories }
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
