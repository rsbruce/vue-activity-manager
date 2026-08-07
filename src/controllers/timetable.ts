import { defineController } from '@/router/defineController'
import { getTimetableWindow, getSummary, type TimetableWindow, type SummaryResult } from '@/data/timetable'
import { getActiveProjectsWithArea, getProjectCategoriesNested } from '@/data/projects'
import { getAllPeople } from '@/data/people'
import type { Person } from '@/types/people'
import type { Project } from '@/types/projects'
import type { TimetableProjectCategories } from '@/types/events'

type TimetablePageData = TimetableWindow & SummaryResult & {
    people: Person[]
    projectCategories: TimetableProjectCategories
    activeProjects: Project[]
    displayStart: string
    weeks: number
}

export const timetableController = defineController<TimetablePageData>(async () => {
    const displayStart = new Date()
    displayStart.setHours(5, 0, 0, 0)

    const [window, summary, people, projectCategories, activeProjects] = await Promise.all([
        getTimetableWindow(displayStart.addDays(-7).isoDate(), displayStart.addDays(35).isoDate()),
        getSummary(),
        getAllPeople(),
        getProjectCategoriesNested(),
        getActiveProjectsWithArea(),
    ])

    return {
        ...window,
        ...summary,
        people,
        projectCategories,
        activeProjects,
        displayStart: displayStart.toISOString(),
        weeks: 4,
    }
})
