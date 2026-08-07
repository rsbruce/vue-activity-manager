<script lang="ts" setup>
import { computed } from 'vue'
import type { TimetableData, CalendarData, HabitTable, TimetableCell } from '@/types/events'

const props = defineProps<{
    timetable: TimetableData
    calendar: CalendarData
    habitTable: HabitTable
    displayStart: Date  // always at 5AM — slot 0 = 5AM, slot 19 = midnight, slot 23 = 4AM
    presentMoment: Date
}>()

const emit = defineEmits<{
    'open-modal': [startDatetime: Date]
    'open-modal-for-item': [eventId: string, startHour: Date, cell: TimetableCell]
}>()

// 24 slot indices. Slot k represents displayStart + k hours (so 5AM, 6AM, ..., 11PM, 0AM, 1AM, 2AM, 3AM, 4AM).
const slots = Array.from({ length: 24 }, (_, i) => i)

// Each day column starts at displayStart (5AM) + j days.
const days = computed(() =>
    Array.from({ length: 7 }, (_, j) => props.displayStart.addDays(j))
)

// The actual Date for a given day column and slot index.
function slotDatetime(day: Date, slot: number): Date {
    return day.addHours(slot)
}

// Clock label for the time column — same for every day column.
function clockLabel(slot: number): string {
    return props.displayStart.addHours(slot).isoTime()
}

function eventsForCell(day: Date, slot: number): [string, TimetableCell][] {
    const dt = slotDatetime(day, slot)
    const cell = props.timetable[dt.isoDate()]?.[dt.getHours()]
    if (!cell) return []
    return Object.entries(cell)
}

function habitClass(day: Date, type: 'positive' | 'negative'): string {
    const count = props.habitTable[day.isoDate()]?.[type] ?? 0
    if (type === 'positive') {
        return count > 3 ? 'bg-emerald-700' : count > 2 ? 'bg-emerald-600' : count > 1 ? 'bg-emerald-400' : count > 0 ? 'bg-emerald-200' : ''
    }
    return count > 3 ? 'bg-rose-700' : count > 2 ? 'bg-rose-600' : count > 1 ? 'bg-rose-400' : count > 0 ? 'bg-rose-200' : ''
}

function isCurrentHour(day: Date, slot: number): boolean {
    const cellStart = slotDatetime(day, slot)
    const cellEnd = slotDatetime(day, slot + 1)
    return props.presentMoment > cellStart && props.presentMoment < cellEnd
}

function currentTimeTop(): string {
    return `calc(${props.presentMoment.getMinutes() / 60} * 3rem)`
}

function itemTimeRange(cell: TimetableCell, day: Date, slot: number): string {
    const t = slotDatetime(day, slot).addMinutes(cell.startMinutesPastHour)
    return `${t.isoTime()} - ${t.addMinutes(cell.durationMinutes).isoTime()}`
}
</script>

<template>
    <div class="overflow-visible">
        <div class="lg:w-fit border-white pr-2 flex">
            <!-- Time column -->
            <div class="w-16 lg:w-24">
                <div class="h-16 border-t border-transparent m-px"></div>
                <div v-for="slot in slots" :key="slot" class="h-12 relative flex">
                    <div class="flex-grow border-t border-l border-transparent"></div>
                    <div class="w-3 border-t border-white"></div>
                    <div class="absolute right-5 -top-3 text-sm lg:text-base">{{ clockLabel(slot) }}</div>
                </div>
            </div>

            <div class="lg:hidden grid grid-cols-3 flex-grow">
                <div v-for="(day, j) in days.slice(0,3)" :key="j">
                    <!-- Day header -->
                    <div
                        class="sticky top-12 z-20 h-12 text-center my-px border-x border-b border-slate-900"
                        :class="[
                            day.isWeekend() ? 'bg-orange-500 text-white' : 'bg-orange-200 text-black',
                        ]"
                    >
                        <div>{{ day.toLocaleDateString('en-GB', { weekday: 'long' }) }}</div>
                        <div>{{ day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }}</div>
                    </div>

                    <!-- Habit bars -->
                    <div class="h-2 text-black text-center text-sm mx-auto" :class="habitClass(day, 'positive')"></div>
                    <div class="h-2 text-black text-center text-sm mx-auto" :class="habitClass(day, 'negative')"></div>

                    <!-- Slot cells (5AM → 4AM) -->
                    <div
                        v-for="slot in slots"
                        :key="slot"
                        class="h-12 border-l border-t relative cursor-pointer"
                        @click="emit('open-modal', slotDatetime(day, slot))"
                    >
                        <!-- Current time indicator -->
                        <div
                            v-if="isCurrentHour(day, slot)"
                            class="border-red-500 border-b absolute w-full z-30"
                            :style="`top: ${currentTimeTop()}`"
                        ></div>

                        <!-- Events -->
                        <div
                            v-for="[eventId, cell] in eventsForCell(day, slot)"
                            :key="eventId"
                            class="p-px absolute z-10 w-full overflow-hidden"
                            :style="`height: calc(${cell.durationMinutes / 60} * 3rem); top: calc(${cell.startMinutesPastHour / 60} * 3rem);`"
                        >
                            <div
                                class="cursor-pointer rounded-[0.25rem] text-xs text-black relative bg-main"
                                :data-model-theme="cell.colorScheme ?? 'gray'"
                                style="height: calc(100% - 1px);"
                                @click.stop="emit('open-modal-for-item', eventId, slotDatetime(day, slot), cell)"
                            >
                                <div class="flex justify-between flex-wrap">
                                    <span>{{ cell.name }}</span>
                                    <span>{{ itemTimeRange(cell, day, slot) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Day columns -->
            <div v-for="(day, j) in days" :key="j" class="w-32 hidden lg:block" >
                <!-- Day header -->
                <div
                    class="lg:sticky z-20 h-12 text-center my-px border-x border-b border-slate-900 lg:top-12"
                    :class="[
                        day.isWeekend() ? 'bg-orange-500 text-white' : 'bg-orange-200 text-black',
                        j === 0 ? 'lg:rounded-tl-md' : '',
                        j === 6 ? 'lg:rounded-tr-md' : '',
                    ]"
                >
                    <div>{{ day.toLocaleDateString('en-GB', { weekday: 'long' }) }}</div>
                    <div>{{ day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }}</div>
                </div>

                <!-- Habit bars -->
                <div class="h-2 text-black text-center text-sm mx-auto" :class="habitClass(day, 'positive')"></div>
                <div class="h-2 text-black text-center text-sm mx-auto" :class="habitClass(day, 'negative')"></div>

                <!-- Slot cells (5AM → 4AM) -->
                <div
                    v-for="slot in slots"
                    :key="slot"
                    class="h-12 border-l border-t relative cursor-pointer"
                    @click="emit('open-modal', slotDatetime(day, slot))"
                >
                    <!-- Current time indicator -->
                    <div
                        v-if="isCurrentHour(day, slot)"
                        class="border-red-500 border-b absolute w-full z-30"
                        :style="`top: ${currentTimeTop()}`"
                    ></div>

                    <!-- Events -->
                    <div
                        v-for="[eventId, cell] in eventsForCell(day, slot)"
                        :key="eventId"
                        class="p-px absolute z-10 w-full overflow-hidden"
                        :style="`height: calc(${cell.durationMinutes / 60} * 3rem); top: calc(${cell.startMinutesPastHour / 60} * 3rem);`"
                    >
                        <div
                            class="cursor-pointer rounded-[0.25rem] text-xs text-black relative bg-main"
                            :data-model-theme="cell.colorScheme ?? 'gray'"
                            style="height: calc(100% - 1px);"
                            @click.stop="emit('open-modal-for-item', eventId, slotDatetime(day, slot), cell)"
                        >
                            <div class="flex justify-between flex-wrap">
                                <span>{{ cell.name }}</span>
                                <span>{{ itemTimeRange(cell, day, slot) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
