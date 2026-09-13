<script lang="ts" setup>
defineProps<{
    table: Record<string, Record<string, Record<string, number>>>
    colorSchemes: Record<string, string>
}>()

// Last 29 days (i from 28 down to 0)
const days = Array.from({ length: 29 }, (_, idx) => {
    const d = new Date()
    d.setDate(d.getDate() - (28 - idx))
    d.setHours(0, 0, 0, 0)
    return d
})

// Mobile shows a shorter window — just the last 14 days.
const mobileDays = days.slice(-14)

function dayAbbr(d: Date): string {
    return d.toLocaleDateString('en-GB', { weekday: 'short' }).substring(0, 2)
}

function isMonday(d: Date): boolean { return d.getDay() === 1 }
function isFriday(d: Date): boolean { return d.getDay() === 5 }
function isSunday(d: Date): boolean { return d.getDay() === 0 }

function durationStyle(minutes: number): string {
    if (minutes >= 180) return 'bg-dark'
    if (minutes >= 120) return 'bg-main'
    if (minutes >= 60) return 'bg-light'
    if (minutes > 0) return 'bg-light'
    return 'bg-white'
}

function weeklyProjectTotal(minutesWorked: Record<string, number>, endDay: Date): number {
    const endYmd = endDay.isoDate()
    const startDay = new Date(endDay)
    const dow = endDay.getDay() || 7
    startDay.setDate(startDay.getDate() - (dow - 1))
    const startYmd = startDay.isoDate()
    return Object.entries(minutesWorked)
        .filter(([k]) => k >= startYmd && k <= endYmd)
        .reduce((sum, [, v]) => sum + v, 0)
}

function weeklyAreaTotal(projects: Record<string, Record<string, number>>, endDay: Date): number {
    return Object.values(projects).reduce((sum, minutesWorked) => sum + weeklyProjectTotal(minutesWorked, endDay), 0)
}

function roundedHours(minutes: number): string {
    const h = minutes / 60
    return `${Math.round(h)} hour${h !== 1 ? 's' : ''}`
}

function mins(minutesWorked: Record<string, number>, d: Date): number {
    return minutesWorked[d.isoDate()] ?? 0
}
</script>

<template>
    <div class="text-black">
        <h2 class="text-xl">Overview</h2>
        <div class="p-2 rounded-md bg-white space-y-3 overflow-auto">
            <div v-for="(projects, projectAreaName) in table" :key="projectAreaName" :data-model-theme="colorSchemes[projectAreaName]">
                <div class="font-bold">{{ projectAreaName }}</div>

                <!-- Desktop: one grid per area, projects as rows -->
                <div class="hidden md:block">
                    <!-- Header row -->
                    <div class="flex justify-between">
                        <div class="min-w-40"></div>
                        <div class="flex border-b border-gray-700">
                            <template v-for="(day, idx) in days" :key="idx">
                                <div
                                    class="p-0.5"
                                    :class="[isMonday(day) ? 'border-l border-gray-700' : '', isFriday(day) ? 'border-r border-gray-500 border-dashed' : '']"
                                >
                                    <div class="h-4 w-4 text-xs text-center">{{ dayAbbr(day) }}</div>
                                </div>
                                <div v-if="isSunday(day) || idx === days.length - 1" class="w-7"></div>
                            </template>
                        </div>
                        <div class="min-w-40"></div>
                    </div>

                    <!-- Project rows -->
                    <div v-for="(minutesWorked, projectName) in projects" :key="projectName" class="flex justify-between">
                        <div class="min-w-40 truncate text-xs">{{ projectName }}</div>
                        <div class="flex">
                            <template v-for="(day, idx) in days" :key="idx">
                                <div
                                    class="relative p-0.5 group"
                                    :class="[isMonday(day) ? 'border-l border-gray-700' : '', isFriday(day) ? 'border-r border-gray-500 border-dashed' : '']"
                                >
                                    <div
                                        v-if="mins(minutesWorked as Record<string, number>, day) > 0"
                                        class="absolute bottom-4 text-xs bg-slate-900 rounded-sm !text-white p-1 hidden group-hover:block pointer-events-none z-10 whitespace-nowrap"
                                    >
                                        {{ roundedHours(mins(minutesWorked as Record<string, number>, day)) }}
                                    </div>
                                    <div
                                        class="h-4 w-4 rounded-md border border-gray-300"
                                        :class="durationStyle(mins(minutesWorked as Record<string, number>, day))"
                                    ></div>
                                </div>
                                <div v-if="isSunday(day) || idx === days.length - 1" class="w-7 text-xs">
                                    {{ Math.round(weeklyProjectTotal(minutesWorked as Record<string, number>, day) / 60) }}
                                </div>
                            </template>
                        </div>
                        <div class="min-w-40"></div>
                    </div>

                    <!-- Weekly total row -->
                    <div class="flex justify-between">
                        <div class="min-w-40 truncate text-xs font-bold">Weekly Total</div>
                        <div class="flex">
                            <template v-for="(day, idx) in days" :key="idx">
                                <div
                                    class="p-0.5 border-t border-gray-700"
                                    :class="[isMonday(day) ? 'border-l' : '', isFriday(day) ? 'border-r border-r-white' : '']"
                                >
                                    <div class="h-4 w-4"></div>
                                </div>
                                <div v-if="isSunday(day) || idx === days.length - 1" class="w-7 text-sm border-t border-gray-700">
                                    {{ (weeklyAreaTotal(projects as Record<string, Record<string, number>>, day) / 60).toFixed(1) }}
                                </div>
                            </template>
                        </div>
                        <div class="min-w-40"></div>
                    </div>
                </div>

                <!-- Mobile: one mini-table per project, full name pinned above (kept
                     outside the scroll container so it never scrolls sideways) -->
                <div class="md:hidden space-y-3">
                    <div v-for="(minutesWorked, projectName) in projects" :key="projectName">
                        <div class="font-semibold text-sm">{{ projectName }}</div>
                        <div class="overflow-x-auto">
                            <div class="w-max">
                                <div class="flex border-b border-gray-700">
                                    <template v-for="(day, idx) in mobileDays" :key="idx">
                                        <div
                                            class="p-0.5"
                                            :class="[isMonday(day) ? 'border-l border-gray-700' : '', isFriday(day) ? 'border-r border-gray-500 border-dashed' : '']"
                                        >
                                            <div class="h-4 w-4 text-xs text-center">{{ dayAbbr(day) }}</div>
                                        </div>
                                        <div v-if="isSunday(day) || idx === mobileDays.length - 1" class="w-7"></div>
                                    </template>
                                </div>
                                <div class="flex">
                                    <template v-for="(day, idx) in mobileDays" :key="idx">
                                        <div
                                            class="p-0.5"
                                            :class="[isMonday(day) ? 'border-l border-gray-700' : '', isFriday(day) ? 'border-r border-gray-500 border-dashed' : '']"
                                        >
                                            <div
                                                class="h-4 w-4 rounded-md border border-gray-300"
                                                :class="durationStyle(mins(minutesWorked as Record<string, number>, day))"
                                            ></div>
                                        </div>
                                        <div v-if="isSunday(day) || idx === mobileDays.length - 1" class="w-7 text-xs text-center">
                                            {{ Math.round(weeklyProjectTotal(minutesWorked as Record<string, number>, day) / 60) }}
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
