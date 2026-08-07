import { defineController } from '@/router/defineController'
import type { ProjectCategory, Project } from '@/types/projects'
import { getAllProjectCategories } from '@/data/projectCategories'
import {
    getToDoListProject,
    getToDoListProjectId,
} from '@/data/projects'
import { getObjectivesByDueDate, type DueDateObjective } from '@/data/objectives'

type PlannerData = {
    projectCategories: ProjectCategory[]
    toDoList: Project | null
    toDoListId: string | null
    dueDateObjectives: DueDateObjective[]
}

export const plannerController = defineController<PlannerData>(async () => {
    const toDoListId = await getToDoListProjectId()

    const [
        projectCategories,
        toDoList,
        dueDateObjectives,
    ] = await Promise.all([
        getAllProjectCategories(),
        toDoListId ? getToDoListProject(toDoListId) : Promise.resolve(undefined),
        getObjectivesByDueDate(),
    ])

    return {
        projectCategories,
        toDoList: toDoList ?? null,
        toDoListId,
        dueDateObjectives,
    }
})
