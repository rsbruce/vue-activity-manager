<script lang="ts" setup>
import { reactive } from 'vue'
import type { ProjectCategory } from '@/types/projects'
import type { Reminder } from '@/types/reminders'

// With `reminder` set the form edits it (prefilled, "Save", no reset);
// without, it creates a new one (blank, "Add", resets after submit).
const props = defineProps<{
    projectCategories: ProjectCategory[]
    reminder?: Reminder | null
}>()

const emit = defineEmits<{
    submit: [payload: {
        name: string
        date_of_reminder: string
        date_of_occurrence: string | null
        has_fixed_date_of_occurrence: boolean
        project_category_id: string | null
    }]
}>()

const isEdit = !!props.reminder

const form = reactive({
    name: props.reminder?.name ?? '',
    date_of_reminder: props.reminder?.date_of_reminder ?? '',
    date_of_occurrence: props.reminder?.date_of_occurrence ?? '',
    has_fixed_date_of_occurrence: !!props.reminder?.has_fixed_date_of_occurrence,
    project_category_id: props.reminder?.project_category_id ?? '',
})

function submit() {
    if (!form.name.trim() || !form.date_of_reminder) return
    emit('submit', {
        name: form.name.trim(),
        date_of_reminder: form.date_of_reminder,
        date_of_occurrence: form.date_of_occurrence || null,
        has_fixed_date_of_occurrence: form.has_fixed_date_of_occurrence,
        project_category_id: form.project_category_id || null,
    })
    if (isEdit) return
    form.name = ''
    form.date_of_reminder = ''
    form.date_of_occurrence = ''
    form.has_fixed_date_of_occurrence = false
    form.project_category_id = ''
}
</script>

<template>
    <form @submit.prevent="submit" class="bg-slate-200 p-2 rounded-md flex flex-col gap-2 text-black">
        <input
            type="text"
            class="bg-white border border-black rounded-md px-1 w-full"
            placeholder="What are you waiting on?"
            v-model="form.name"
        />
        <div class="flex gap-2">
            <label class="flex-1">
                <div class="text-sm">Reminder date</div>
                <input type="date" class="bg-white border border-black rounded-md px-1 w-full" v-model="form.date_of_reminder" />
            </label>
            <label class="flex-1">
                <div class="text-sm">Occurrence date</div>
                <input type="date" class="bg-white border border-black rounded-md px-1 w-full" v-model="form.date_of_occurrence" />
            </label>
        </div>
        <label class="flex gap-2 items-center">
            <input type="checkbox" class="w-5 h-5" v-model="form.has_fixed_date_of_occurrence" />
            <span>Has fixed date</span>
        </label>
        <label>
            <div class="text-sm">Project category</div>
            <select class="bg-white border border-black rounded-md px-1 w-full" v-model="form.project_category_id">
                <option value="">None</option>
                <option v-for="pc in projectCategories" :value="pc.id" :key="pc.id">{{ pc.name }}</option>
            </select>
        </label>
        <button type="submit" class="bg-black px-2 rounded-md text-white cursor-pointer">{{ isEdit ? 'Save' : 'Add' }}</button>
    </form>
</template>
