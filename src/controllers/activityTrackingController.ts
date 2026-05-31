import { defineController } from '@/router/defineController'
import { getTypeGroups } from '@/data/activities'
import { getInRange } from '@/data/activityOnDay'
import type { ActivityTypeGroup } from '@/types/activities'

type DayStats = { last_7_days: number; last_4_weeks: number }

type Data = {
    activityTypeGroups: ActivityTypeGroup[]
    dates: string[]
    timetable: Record<string, Record<string, boolean>>
    stats: Record<string, DayStats>
}

function isoDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function daysAgo(n: number): Date {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - n)
    return d
}

const load = async (): Promise<Data> => {
    const activityTypeGroups = await getTypeGroups()

    const dates: string[] = []
    for (let i = 6; i >= 0; i--) dates.push(isoDate(daysAgo(i)))

    const aWeekAgo = isoDate(daysAgo(7))
    const fiveWeeksAgo = isoDate(daysAgo(35))
    const today = isoDate(daysAgo(0))

    const rows = await getInRange(fiveWeeksAgo, today)

    const timetable: Record<string, Record<string, boolean>> = {}
    for (const date of dates) timetable[date] = {}
    for (const row of rows) {
        const day = timetable[row.date]
        if (day) day[row.activity_id] = true
    }

    const stats: Record<string, DayStats> = {}
    for (const group of activityTypeGroups) {
        for (const activity of group.activities) {
            stats[activity.id] = { last_7_days: 0, last_4_weeks: 0 }
        }
    }
    for (const row of rows) {
        const s = stats[row.activity_id]
        if (!s) continue
        if (row.date > aWeekAgo) s.last_7_days++
        else if (row.date > fiveWeeksAgo) s.last_4_weeks++
    }

    return { activityTypeGroups, dates, timetable, stats }
}

export default defineController<Data>(load)
