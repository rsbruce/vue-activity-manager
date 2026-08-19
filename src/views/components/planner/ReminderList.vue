<script lang="ts" setup>
import type { Reminder } from '@/types/reminders'
import '@/utils/dateExtensions'

defineProps<{
    reminders: Reminder[]
    allLink?: boolean
}>()

const emit = defineEmits<{
    toggle: [reminderId: string, nowResolved: boolean]
}>()

const today = new Date().isoDate()

// A YYYY-MM-DD string as a compact "Aug 19", matching how CheckableItem renders
// an objective's completed date. Parsed as local (not UTC) to avoid off-by-one.
function shortDate(iso: string | null): string {
    if (!iso) return ''
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return iso
    return new Date(y, m - 1, d).toLocaleString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
    <div class="bg-slate-200 p-2 rounded-md space-y-2 text-black">
        <div class="flex items-center justify-between">
            <h3 class="underline text-xl">Waiting on</h3>
            <RouterLink v-if="allLink" to="/reminders" class="text-sm flex items-center gap-1">
                All reminders <font-awesome-icon icon="arrow-right" />
            </RouterLink>
        </div>

        <div>
            <h4 class="text-lg underline">Open reminders</h4>
            <div class="space-y-1">
                <!-- Open-ended reminders: a checkbox stamps the occurrence with today. -->
                <div
                    v-for="reminder in reminders.filter((r) => !r.has_fixed_date_of_occurrence)"
                    :key="reminder.id"
                    class="flex gap-2 items-center pb-1 pt-0.5 border-b border-gray-500"
                >
                    <input
                        type="checkbox"
                        class="min-w-5 h-5 flex-none cursor-pointer"
                        :checked="reminder.date_of_occurrence !== null"
                        @click="emit('toggle', reminder.id, reminder.date_of_occurrence === null)"
                    />
                    <RouterLink :to="`/reminders/${reminder.id}`" class="font-semibold truncate min-w-12">{{ reminder.name }}</RouterLink>
                    <span
                        class="flex-1 text-right text-xs whitespace-nowrap"
                        :class="reminder.date_of_occurrence === null && reminder.date_of_reminder < today ? 'text-red-500' : 'text-gray-500'"
                    >{{ shortDate(reminder.date_of_reminder) }}</span>
                </div>
            </div>
        </div>

        <div>
            <h4 class="text-lg underline">Fixed reminders</h4>
            <div class="space-y-1">
                <!-- Fixed-date reminders (advertised occurrence). -->
                <div
                    v-for="reminder in reminders.filter((r) => r.has_fixed_date_of_occurrence)"
                    :key="reminder.id"
                    class="flex gap-2 items-center pb-1 pt-0.5 border-b border-gray-500"
                >
                    <RouterLink :to="`/reminders/${reminder.id}`" class="font-semibold truncate min-w-12">{{ reminder.name }}</RouterLink>
                    <span class="flex-1 text-right text-xs text-gray-500 whitespace-nowrap">{{ shortDate(reminder.date_of_occurrence) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
