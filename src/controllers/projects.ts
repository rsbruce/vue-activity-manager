import type { RouteLocationNormalized } from 'vue-router'
import { defineController } from '@/router/defineController'
import type { ProjectCategory, Project, Objective, Task } from '@/types/projects'
import { getAllProjectCategories, getProjectCategory } from '@/data/projectCategories'
import { getObjective, getObjectivesByDueDate, getObjectivesCompletedInWeek, getCurrentObjectiveId, startOfWeek, type DueDateObjective, type CategorisedObjective } from '@/data/objectives'
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
    completedLastWeek: CategorisedObjective[]
    currentObjective: Objective | null
    activeProjects: Project[]
}

export const agendaController = defineController<AgendaData>(
    async (): Promise<AgendaData> => {
        const thisWeekStart = startOfWeek(new Date())
        // Last Monday: this week's Monday minus 7 days (date arithmetic, DST-safe).
        const lastWeekStart = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() - 7)
        const [categories, dueDateObjectives, completedThisWeek, completedLastWeek, currentObjectiveId, activeProjects] = await Promise.all([
            getAllProjectCategories(),
            getObjectivesByDueDate(),
            getObjectivesCompletedInWeek(thisWeekStart),
            getObjectivesCompletedInWeek(lastWeekStart),
            getCurrentObjectiveId(),
            getActiveProjectsWithArea(),
        ])
        // Treat a completed/deleted pointer as "none" so finishing it reverts to
        // the picker without needing to actively clear the pointer.
        const pointed = currentObjectiveId ? await getObjective(currentObjectiveId) : undefined
        const currentObjective = pointed && !pointed.completed_at && !pointed.deleted_at ? pointed : null
        return { categories, dueDateObjectives, completedThisWeek, completedLastWeek, currentObjective, activeProjects }
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
