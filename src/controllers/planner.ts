import { defineController } from '@/router/defineController'
import type { ProjectCategory, Project, ProjectOnDayData } from '@/types/projects'
import type { Person } from '@/types/people'
import type { TimetableWindow } from '@/data/timetable'
import type { TimetableProjectCategories } from '@/types/events'
import { getAllProjectCategories } from '@/data/projectCategories'
import {
    getProjectsForPlanner,
    getToDoListProject,
    getToDoListProjectId,
    getActiveProjectsWithArea,
    getProjectCategoriesNested,
} from '@/data/projects'
import { getObjectivesByDueDate, type DueDateObjective } from '@/data/objectives'
import { getProjectOnDayData } from '@/data/projectOnDay'
import { getTimetableWindow } from '@/data/timetable'
import { getAllPeople } from '@/data/people'

type PlannerData = TimetableWindow & {
    projectCategories: ProjectCategory[]
    allProjects: Project[]
    toDoList: Project | null
    toDoListId: string | null
    dueDateObjectives: DueDateObjective[]
    projectOnDayData: ProjectOnDayData
    timetableProjectCategories: TimetableProjectCategories
    activeProjects: Project[]
    people: Person[]
    displayStart: string
}

export const plannerController = defineController<PlannerData>(async () => {
    const displayStart = new Date()
    displayStart.setHours(5, 0, 0, 0)
    const startYmd = displayStart.isoDate()

    const toDoListId = await getToDoListProjectId()

    const [
        projectCategories,
        allProjects,
        toDoList,
        dueDateObjectives,
        projectOnDayData,
        window,
        timetableProjectCategories,
        activeProjects,
        people,
    ] = await Promise.all([
        getAllProjectCategories(),
        getProjectsForPlanner(toDoListId),
        toDoListId ? getToDoListProject(toDoListId) : Promise.resolve(undefined),
        getObjectivesByDueDate(),
        getProjectOnDayData(startYmd),
        getTimetableWindow(displayStart.addDays(-7).isoDate(), displayStart.addDays(7).isoDate()),
        getProjectCategoriesNested(),
        getActiveProjectsWithArea(),
        getAllPeople(),
    ])

    return {
        ...window,
        projectCategories,
        allProjects,
        toDoList: toDoList ?? null,
        toDoListId,
        dueDateObjectives,
        projectOnDayData,
        timetableProjectCategories,
        activeProjects,
        people,
        displayStart: displayStart.toISOString(),
    }
})
