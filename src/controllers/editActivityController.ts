import { defineController } from '@/router/defineController'
import type { RouteLocationNormalized } from 'vue-router'
import { findByIdWithType } from '@/data/activities'
import { getAll } from '@/data/activityTypes'
import type { ActivityType, ActivityWithType } from '@/types/activities'

type Data = {
    activity: ActivityWithType | null
    activityTypes: ActivityType[]
}

const load = async (route: RouteLocationNormalized): Promise<Data> => {
    const id = route.params.id as string
    const [activity, activityTypes] = await Promise.all([
        findByIdWithType(id),
        getAll(),
    ])
    return { activity, activityTypes }
}

export default defineController<Data>(load)
