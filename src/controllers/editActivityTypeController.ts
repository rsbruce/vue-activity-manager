import { defineController } from '@/router/defineController'
import type { RouteLocationNormalized } from 'vue-router'
import { findById } from '@/data/activityTypes'
import type { ActivityType } from '@/types/activities'

type Data = { activityType: ActivityType | null }

const load = async (route: RouteLocationNormalized): Promise<Data> => {
    const id = route.params.id as string
    const activityType = await findById(id)
    return { activityType }
}

export default defineController<Data>(load)
