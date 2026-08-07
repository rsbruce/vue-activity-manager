<script lang="ts" setup>
import type { TimetableData, HabitTable, TimetableCell } from '@/types/events'

const props = defineProps<{
    day: Date            // this column's day, at 5AM (slot 0)
    slots: number[]      // 0..23, slot k = day + k hours
    timetable: TimetableData
    habitTable: HabitTable
    presentMoment: Date
    roundedLeft?: boolean
    roundedRight?: boolean
}>()

const emit = defineEmits<{
    'open-modal': [startDatetime: Date]
    'open-modal-for-item': [eventId: string, startHour: Date, cell: TimetableCell]
}>()

function slotDatetime(slot: number): Date {
    return props.day.addHours(slot)
}

function eventsForCell(slot: number): [string, TimetableCell][] {
    const dt = slotDatetime(slot)
    const cell = props.timetable[dt.isoDate()]?.[dt.getHours()]
    if (!cell) return []
    return Object.entries(cell)
}

function habitClass(type: 'positive' | 'negative'): string {
    const count = props.habitTable[props.day.isoDate()]?.[type] ?? 0
    if (type === 'positive') {
        return count > 3 ? 'bg-emerald-700' : count > 2 ? 'bg-emerald-600' : count > 1 ? 'bg-emerald-400' : count > 0 ? 'bg-emerald-200' : ''
    }
    return count > 3 ? 'bg-rose-700' : count > 2 ? 'bg-rose-600' : count > 1 ? 'bg-rose-400' : count > 0 ? 'bg-rose-200' : ''
}

function isCurrentHour(slot: number): boolean {
    const cellStart = slotDatetime(slot)
    const cellEnd = slotDatetime(slot + 1)
    return props.presentMoment > cellStart && props.presentMoment < cellEnd
}

function currentTimeTop(): string {
    return `calc(${props.presentMoment.getMinutes() / 60} * 3rem)`
}

function itemTimeRange(cell: TimetableCell, slot: number): string {
    const t = slotDatetime(slot).addMinutes(cell.startMinutesPastHour)
    return `${t.isoTime()} - ${t.addMinutes(cell.durationMinutes).isoTime()}`
}
</script>

<template>
    <div>
        <!-- Day header -->
        <div
            class="sticky top-12 z-20 h-12 text-center my-px border-x border-b border-slate-900"
            :class="[
                day.isWeekend() ? 'bg-orange-500 text-white' : 'bg-orange-200 text-black',
                roundedLeft ? 'rounded-tl-md' : '',
                roundedRight ? 'rounded-tr-md' : '',
            ]"
        >
            <div>{{ day.toLocaleDateString('en-GB', { weekday: 'long' }) }}</div>
            <div>{{ day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }}</div>
        </div>

        <!-- Habit bars -->
        <div class="h-2 text-black text-center text-sm mx-auto" :class="habitClass('positive')"></div>
        <div class="h-2 text-black text-center text-sm mx-auto" :class="habitClass('negative')"></div>

        <!-- Slot cells (5AM → 4AM) -->
        <div
            v-for="slot in slots"
            :key="slot"
            class="h-12 border-l border-t relative cursor-pointer"
            @click="emit('open-modal', slotDatetime(slot))"
        >
            <!-- Current time indicator -->
            <div
                v-if="isCurrentHour(slot)"
                class="border-red-500 border-b absolute w-full z-30"
                :style="`top: ${currentTimeTop()}`"
            ></div>

            <!-- Events -->
            <div
                v-for="[eventId, cell] in eventsForCell(slot)"
                :key="eventId"
                class="p-px absolute z-10 w-full overflow-hidden"
                :style="`height: calc(${cell.durationMinutes / 60} * 3rem); top: calc(${cell.startMinutesPastHour / 60} * 3rem);`"
            >
                <div
                    class="cursor-pointer rounded-[0.25rem] text-xs text-black relative bg-main"
                    :data-model-theme="cell.colorScheme ?? 'gray'"
                    style="height: calc(100% - 1px);"
                    @click.stop="emit('open-modal-for-item', eventId, slotDatetime(slot), cell)"
                >
                    <div class="flex justify-between flex-wrap">
                        <span>{{ cell.name }}</span>
                        <span>{{ itemTimeRange(cell, slot) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
