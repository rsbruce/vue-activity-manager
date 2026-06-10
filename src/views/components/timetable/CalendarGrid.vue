<script lang="ts" setup>
import { computed } from 'vue'
import type { CalendarData, CalendarEntry } from '@/types/events'

const props = defineProps<{
    calendar: CalendarData
    displayStart: Date
    weeks: number
}>()

const emit = defineEmits<{
    'open-modal': [startDatetime: Date]
    'open-modal-for-item': [eventId: string, startHour: Date, cell: { startMinutesPastHour: number; durationMinutes: number; name: string; colorScheme: string | null; projectId: string | null }]
}>()

const weekRows = computed(() =>
    Array.from({ length: props.weeks }, (_, week) =>
        Array.from({ length: 7 }, (_, day) => props.displayStart.addDays(week * 7 + day))
    )
)

const today = new Date().isoDate()

function calendarEvents(day: Date): (CalendarEntry & { _id: string })[] {
    const dateStr = day.isoDate()
    const events = props.calendar[dateStr] ?? {}
    return Object.entries(events)
        .filter(([, event]) => !(event.projectId && dateStr < today))
        .sort(([, a], [, b]) => a.startTime.localeCompare(b.startTime))
        .map(([id, event]) => ({ ...event, _id: id }))
}

function openForItem(day: Date, event: CalendarEntry & { _id: string }) {
    const [h, m] = event.startTime.split(':')
    const startHour = new Date(day)
    startHour.setHours(parseInt(h!), 0, 0, 0)
    emit('open-modal-for-item', event._id, startHour, {
        startMinutesPastHour: parseInt(m!),
        durationMinutes: event.durationMinutes,
        name: event.name,
        colorScheme: event.colorScheme,
        projectId: event.projectId,
    })
}

function daysFromToday(date: Date): number {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const today = new Date

  const utc1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const utc2 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}
</script>

<template>
    <div class="overflow-auto lg:overflow-visible text-xs md:text-sm">
        <div v-for="(week, wi) in weekRows" :key="wi" class="w-full border-white grid grid-cols-7">
            <div
                v-for="(day, di) in week"
                :key="di"
                class="lg:sticky lg:top-14 z-20 text-center my-px border-x border-b border-slate-900 flex flex-col"
                :class="[
                    day.isWeekend() ? 'bg-orange-500 text-white' : 'bg-orange-200 text-black',
                    di === 0 && wi === 0 ? 'first:rounded-tl-md' : '',
                    di === 6 && wi === 0 ? 'last:rounded-tr-md' : ''
                ]"
            >
                <div class="h-12 relative">
                    <div class="absolute right-1 bottom-1 text-xs">{{ daysFromToday(day) }}</div>
                    <div>{{ day.toLocaleDateString('en-GB', { weekday: 'long' }) }}</div>
                    <div>{{ day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }}</div>
                </div>
                <div
                    class="bg-slate-700 cursor-pointer flex-grow min-h-12 gap-1 flex flex-col py-1 px-0.5"
                    @click="emit('open-modal', day)"
                >
                    <div
                        v-for="event in calendarEvents(day)"
                        :key="event._id"
                        class="bg-main rounded-[0.25rem] p-px text-left text-black"
                        :data-model-theme="event.colorScheme ?? 'gray'"
                        @click.stop="openForItem(day, event)"
                    >
                        <div class="pb-1 border-b border-gray-500">{{ event.name }}</div>
                        <div>{{ event.startTime }} - {{ event.endTime }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
