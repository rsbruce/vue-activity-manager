import { defineController } from "@/router/defineController";
import type { RouteLocationNormalized } from "vue-router";
import { getTypeGroups } from '@/data/activities'
import type { ActivityTypeGroup } from "@/types/activities";

const load = async(route: RouteLocationNormalized): Promise<{activityTypeGroups: ActivityTypeGroup[]}> => {
    let activityTypeGroups = await getTypeGroups()
    return { activityTypeGroups }
}

export default defineController<{activityTypeGroups: ActivityTypeGroup[]}>(load)