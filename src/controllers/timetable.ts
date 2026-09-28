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

// Window start comes from ?start=YYYY-MM-DD (the timetable writes it when you
// navigate off today); absent/invalid falls back to today. Anchored at 05:00 so
// the day's grid starts at a sensible hour.
function windowStart(startParam: unknown): Date {
    const d = typeof startParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startParam)
        ? new Date(`${startParam}T05:00:00`)
        : new Date()
    d.setHours(5, 0, 0, 0)
    return d
}

export const timetableController = defineController<TimetablePageData>(async (route) => {
    const displayStart = windowStart(route.query.start)

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
