<script setup lang="ts">
import type { ActivityTypeGroup } from '@/types/activities'
import { toggle } from '@/data/activityOnDay'
import { refreshCurrent } from '@/router/defineController'

const props = defineProps<{
    activityTypeGroups: ActivityTypeGroup[]
    dates: string[]
    timetable: Record<string, Record<string, boolean>>
    stats: Record<string, { last_7_days: number; last_4_weeks: number }>
}>()

async function onToggle(activityId: string, date: string) {
    await toggle(activityId, date)
    await refreshCurrent()
}

const shortDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en', { weekday: 'short' })
}

const dayDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

const avg4Weeks = (activityId: string) => {
    const val = props.stats[activityId]?.last_4_weeks ?? 0
    return Math.round((val / 4) * 100) / 100
}

const changeClass = (activityId: string, isNegative: boolean | null) => {
    const last7 = props.stats[activityId]?.last_7_days ?? 0
    const avg = (props.stats[activityId]?.last_4_weeks ?? 0) / 4
    if (last7 > avg) return isNegative ? 'text-red-500' : 'text-green-500'
    if (last7 < avg) return isNegative ? 'text-green-500' : 'text-red-500'
    return ''
}

const changeSymbol = (activityId: string) => {
    const last7 = props.stats[activityId]?.last_7_days ?? 0
    const avg = (props.stats[activityId]?.last_4_weeks ?? 0) / 4
    if (last7 > avg) return '▲'
    if (last7 < avg) return '▼'
    return '-'
}
</script>

<template>
    <div class="space-y-3 text-white">
        <h3><RouterLink to="/activities/index">Activities</RouterLink></h3>
        <div class="overflow-x-scroll">
            <table class="text-white">
                <thead>
                    <tr>
                        <th v-for="date in dates" :key="date">
                            <div class="font-semibold text-center">
                                <div>{{ shortDay(date) }}</div>
                                <div>{{ dayDate(date) }}</div>
                            </div>
                        </th>
                        <th>
                            <div class="font-semibold text-center">
                                <div>Prev. 4 weeks</div>
                            </div>
                        </th>
                        <th>
                            <div class="font-semibold text-center">
                                <div>Last 7 days</div>
                            </div>
                        </th>
                        <th>
                            <div class="font-semibold text-center">
                                <div>Change</div>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="group in activityTypeGroups" :key="group.activityType.id">
                        <tr v-for="activity in group.activities" :key="activity.id">
                            <td v-for="date in dates" :key="date" class="p-1">
                                <div
                                    class="rounded-md px-2 py-1.5 cursor-pointer text-center border-2 border-dark"
                                    :class="timetable[date]?.[activity.id] ? 'bg-intense' : 'bg-light'"
                                    :data-model-theme="group.activityType.theme"
                                    @click="onToggle(activity.id, date)">
                                    {{ activity.name }}
                                </div>
                            </td>
                            <td class="p-1">
                                <div class="p-2 text-center">{{ avg4Weeks(activity.id) }}</div>
                            </td>
                            <td class="p-1">
                                <div class="p-2 text-center">{{ stats[activity.id]?.last_7_days ?? 0 }}</div>
                            </td>
                            <td class="p-1">
                                <div class="p-2 text-center" :class="changeClass(activity.id, group.activityType.is_negative)">
                                    {{ changeSymbol(activity.id) }}
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>
