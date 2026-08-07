<script lang="ts" setup>
import { computed } from 'vue'
import type { TimetableData, CalendarData, HabitTable, TimetableCell } from '@/types/events'
import DayColumn from './DayColumn.vue'

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

// Clock label for the time column — same for every day column.
function clockLabel(slot: number): string {
    return props.displayStart.addHours(slot).isoTime()
}

// Forward the day columns' events up unchanged.
function onOpenModal(startDatetime: Date) {
    emit('open-modal', startDatetime)
}
function onOpenModalForItem(eventId: string, startHour: Date, cell: TimetableCell) {
    emit('open-modal-for-item', eventId, startHour, cell)
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

            <!-- Mobile: first 3 days in a fitted grid -->
            <div class="lg:hidden grid grid-cols-3 flex-grow">
                <DayColumn
                    v-for="(day, j) in days.slice(0, 3)"
                    :key="j"
                    :day="day"
                    :slots="slots"
                    :timetable="timetable"
                    :habit-table="habitTable"
                    :present-moment="presentMoment"
                    @open-modal="onOpenModal"
                    @open-modal-for-item="onOpenModalForItem"
                />
            </div>

            <!-- Desktop: all 7 days as columns -->
            <DayColumn
                v-for="(day, j) in days"
                :key="j"
                class="w-32 hidden lg:block"
                :day="day"
                :slots="slots"
                :timetable="timetable"
                :habit-table="habitTable"
                :present-moment="presentMoment"
                :rounded-left="j === 0"
                :rounded-right="j === 6"
                @open-modal="onOpenModal"
                @open-modal-for-item="onOpenModalForItem"
            />
        </div>
    </div>
</template>
