<script setup lang="ts">

defineProps({
    grouped: {
        type: Object,
        required: true,
    },
    dates: {
        type: Array as () => string[],
        required: true,
    },
    timetable: {
        type: Object,
        required: true,
    },
    stats: {
        type: Object,
        required: true,
    },
})

const shortDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en', { weekday: 'short' })
}

const dayDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

const avg4Weeks = (activityId: string, stats: any) => {
    const val = stats[activityId]?.last_4_weeks ?? 0
    return Math.round(val / 4 * 100) / 100
}

const changeClass = (activityId: string, groupName: string, stats: any) => {
    const last7 = stats[activityId]?.last_7_days ?? 0
    const avg = (stats[activityId]?.last_4_weeks ?? 0) / 4
    const isVice = groupName === 'Vices'
    if (last7 > avg) return isVice ? 'text-red-500' : 'text-green-500'
    if (last7 < avg) return isVice ? 'text-green-500' : 'text-red-500'
    return ''
}

const changeSymbol = (activityId: string, stats: any) => {
    const last7 = stats[activityId]?.last_7_days ?? 0
    const avg = (stats[activityId]?.last_4_weeks ?? 0) / 4
    if (last7 > avg) return '▲'
    if (last7 < avg) return '▼'
    return '-'
}
</script>

<template>
    <div class="space-y-3 text-white">
        <h3><RouterLink to="/activities">Activities</RouterLink></h3>
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
                    <template v-for="(activities, groupName) in grouped" :key="groupName">
                        <tr v-for="activity in activities" :key="activity.id">
                            <td v-for="date in dates" :key="date" class="p-1">
                                <div
                                    class="rounded-md px-2 py-1.5 cursor-pointer text-center border-2 border-dark"
                                    :class="timetable[date]?.[activity.id] ? 'bg-intense' : 'bg-light'"
                                    :data-model-theme="activity.activity_type?.theme"
                                    @click="toggle(activity.id, date)">
                                    {{ activity.name }}
                                </div>
                            </td>
                            <td class="p-1">
                                <div class="p-2 text-center">{{ avg4Weeks(activity.id, stats) }}</div>
                            </td>
                            <td class="p-1">
                                <div class="p-2 text-center">{{ stats[activity.id]?.last_7_days ?? 0 }}</div>
                            </td>
                            <td class="p-1">
                                <div class="p-2 text-center" :class="changeClass(activity.id, groupName as string, stats)">
                                    {{ changeSymbol(activity.id, stats) }}
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>
