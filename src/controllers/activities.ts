import { defineController } from '@/router/defineController'
import type { RouteLocationNormalized } from 'vue-router'
import { getTypeGroups, findByIdWithType } from '@/data/activities'
import { getInRange } from '@/data/activityOnDay'
import { getAll, getAllWithTrashed, findById } from '@/data/activityTypes'
import type { ActivityType, ActivityTypeGroup, ActivityWithType } from '@/types/activities'

// ── Activities index (edit) ───────────────────────────────────────────
export const activitiesIndexController = defineController<{ activityTypeGroups: ActivityTypeGroup[] }>(
    async (): Promise<{ activityTypeGroups: ActivityTypeGroup[] }> => {
        const activityTypeGroups = await getTypeGroups()
        return { activityTypeGroups }
    },
)

// ── Activity tracking ─────────────────────────────────────────────────
type DayStats = { last_7_days: number; last_4_weeks: number }

type TrackingData = {
    activityTypeGroups: ActivityTypeGroup[]
    dates: string[]
    timetable: Record<string, Record<string, boolean>>
    stats: Record<string, DayStats>
}

export const activityTrackingController = defineController<TrackingData>(async (): Promise<TrackingData> => {
    const activityTypeGroups = await getTypeGroups()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dates: string[] = []
    for (let i = 6; i >= 0; i--) dates.push(today.addDays(-i).isoDate())

    const aWeekAgo = today.addDays(-7).isoDate()
    const fiveWeeksAgo = today.addDays(-35).isoDate()
    const todayStr = today.isoDate()

    const rows = await getInRange(fiveWeeksAgo, todayStr)

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
})

// ── Activity types ────────────────────────────────────────────────────
export const activityTypesController = defineController<{ activityTypes: ActivityType[] }>(
    async (): Promise<{ activityTypes: ActivityType[] }> => {
        const activityTypes = await getAllWithTrashed()
        return { activityTypes }
    },
)

// ── Edit activity ─────────────────────────────────────────────────────
type EditActivityData = {
    activity: ActivityWithType | null
    activityTypes: ActivityType[]
}

export const editActivityController = defineController<EditActivityData>(
    async (route: RouteLocationNormalized): Promise<EditActivityData> => {
        const id = route.params.id as string
        const [activity, activityTypes] = await Promise.all([
            findByIdWithType(id),
            getAll(),
        ])
        return { activity, activityTypes }
    },
)

// ── Edit activity type ────────────────────────────────────────────────
export const editActivityTypeController = defineController<{ activityType: ActivityType | null }>(
    async (route: RouteLocationNormalized): Promise<{ activityType: ActivityType | null }> => {
        const id = route.params.id as string
        const activityType = await findById(id)
        return { activityType }
    },
)
