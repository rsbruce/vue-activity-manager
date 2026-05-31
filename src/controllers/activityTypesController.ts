import { defineController } from '@/router/defineController'
import { getAllWithTrashed } from '@/data/activityTypes'
import type { ActivityType } from '@/types/activities'

type Data = { activityTypes: ActivityType[] }

const load = async (): Promise<Data> => {
    const activityTypes = await getAllWithTrashed()
    return { activityTypes }
}

export default defineController<Data>(load)
