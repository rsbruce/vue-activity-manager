import { defineController } from '@/router/defineController'
import type { ProjectCategory, Project } from '@/types/projects'
import { getAllProjectCategories } from '@/data/projectCategories'
import {
    getToDoListProject,
    getToDoListProjectId,
} from '@/data/projects'
import { getObjectivesByDueDate, type DueDateObjective } from '@/data/objectives'
import type { Event } from '@/types/events'
import { getFutureEvents } from '@/data/events'

type PlannerData = {
    projectCategories: ProjectCategory[]
    toDoList: Project | null
    toDoListId: string | null
    dueDateObjectives: DueDateObjective[],
    nextEvents: Event[]
}

export const plannerController = defineController<PlannerData>(async () => {
    const toDoListId = await getToDoListProjectId()

    const [
        projectCategories,
        toDoList,
        dueDateObjectives,
        nextEvents
    ] = await Promise.all([
        getAllProjectCategories(),
        toDoListId ? getToDoListProject(toDoListId) : Promise.resolve(undefined),
        getObjectivesByDueDate(),
        getFutureEvents(4)
    ])

    return {
        projectCategories,
        toDoList: toDoList ?? null,
        toDoListId,
        dueDateObjectives,
        nextEvents
    }
})
