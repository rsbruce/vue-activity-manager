<script lang="ts" setup>
import type { Reminder } from '@/types/reminders'
import type { ProjectCategory } from '@/types/projects'
import { useRouter } from 'vue-router'
import { refreshCurrent } from '@/router/defineController'
import { updateReminder } from '@/data/reminders'
import { softDelete, restore } from '@/data/utils'
import ReminderForm from '../components/planner/ReminderForm.vue'
import DeleteRestoreButton from '../components/DeleteRestoreButton.vue'

const props = defineProps<{
    reminder: Reminder
    projectCategories: ProjectCategory[]
}>()

const router = useRouter()

async function save(payload: Parameters<typeof updateReminder>[1]) {
    await updateReminder(props.reminder.id, payload)
    await router.push('/reminders')
}
async function trash() {
    await softDelete(props.reminder.id, 'reminders')
    await router.push('/reminders')
}
async function restoreReminder() {
    await restore(props.reminder.id, 'reminders')
    await refreshCurrent()
}
</script>

<template>
    <div class="py-6 max-w-xl space-y-2">
        <ReminderForm
            :key="reminder.id"
            :project-categories="projectCategories"
            :reminder="reminder"
            @submit="save"
        />
        <DeleteRestoreButton :deleted-at="reminder.deleted_at" @trash="trash" @restore="restoreReminder" />
    </div>
</template>
