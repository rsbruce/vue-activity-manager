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
import type { Reminder } from '@/types/reminders'
import { getVisibleReminders } from '@/data/reminders'

type PlannerData = {
    projectCategories: ProjectCategory[]
    toDoList: Project | null
    toDoListId: string | null
    nextEvents: Event[]
    reminders: Reminder[]
}

export const plannerController = defineController<PlannerData>(async () => {
    const toDoListId = await getToDoListProjectId()

    const [
        projectCategories,
        toDoList,
        nextEvents,
        reminders
    ] = await Promise.all([
        getAllProjectCategories(),
        toDoListId ? getToDoListProject(toDoListId) : Promise.resolve(undefined),
        getFutureEvents(10),
        getVisibleReminders()
    ])

    return {
        projectCategories,
        toDoList: toDoList ?? null,
        toDoListId,
        nextEvents,
        reminders
    }
})
