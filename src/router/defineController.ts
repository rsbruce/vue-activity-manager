import {reactive} from 'vue'
import type { NavigationGuard, RouteLocationNormalized } from 'vue-router'

let activeRefresh: (() => Promise<void>) | null = null

export interface Controller<Data extends object> {
    data: Data
    beforeEnter: NavigationGuard
    refresh: () => Promise<void>
    props: () => Data
}

export function defineController<Data extends object>(
    load: (route: RouteLocationNormalized) => Promise<Data>
): Controller<Data> {
    const data = reactive({}) as Data
    let lastRoute: RouteLocationNormalized | null = null

    const apply = (next: Data) => {
        for (const k of Object.keys(data)) {
            delete (data as Record<string, unknown>)[k]
        }
        Object.assign(data, next)
    }

    const refresh = async () => {
        if (lastRoute) {
            apply(await load(lastRoute))
        }
    }

    const beforeEnter: NavigationGuard = async(to) => {
        lastRoute = to
        apply(await load(to))
        activeRefresh = refresh
    }

    const props = () => ({...data})

    return {data, beforeEnter, refresh, props}
}

export async function refreshCurrent(): Promise<void> {
    if(activeRefresh) {
        await activeRefresh()
    }
}