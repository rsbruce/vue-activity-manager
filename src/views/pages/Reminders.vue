<script lang="ts" setup>
import type { Reminder } from '@/types/reminders'
import type { ProjectCategory } from '@/types/projects'
import { createReminder, resolveReminder, unresolveReminder } from '@/data/reminders'
import { refreshCurrent } from '@/router/defineController'
import ReminderForm from '../components/planner/ReminderForm.vue'
import ReminderList from '../components/planner/ReminderList.vue'

defineProps<{
    reminders: Reminder[]
    projectCategories: ProjectCategory[]
}>()

async function addReminder(payload: Parameters<typeof createReminder>[0]) {
    await createReminder(payload)
    await refreshCurrent()
}
async function toggleReminder(reminderId: string, nowResolved: boolean) {
    await (nowResolved ? resolveReminder(reminderId) : unresolveReminder(reminderId))
    await refreshCurrent()
}
</script>

<template>
    <div class="py-6 grid lg:grid-cols-2 gap-3 w-full">
        <div>
            <ReminderForm :project-categories="projectCategories" @submit="addReminder" />
        </div>
        <ReminderList :reminders="reminders" @toggle="toggleReminder" />
    </div>
</template>
