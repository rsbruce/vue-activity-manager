<script setup lang="ts">
import type { Objective } from '@/types/projects'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { refreshCurrent } from '@/router/defineController'
import { updateObjective, completeObjective, uncompleteObjective } from '@/data/objectives'
import { softDelete, restore } from '@/data/utils'
import EditItemForm from '../components/projects/EditItemForm.vue'
import CompleteToggle from '../components/projects/CompleteToggle.vue'

const props = defineProps<{ objective: Objective }>()

const router = useRouter()

const form = reactive({
    name: props.objective.name,
    description: props.objective.description ?? '',
    project_id: props.objective.project_id,
    due_date: props.objective.due_date ?? '',
})

const submit = async () => {
    await updateObjective(props.objective.id, {
        name: form.name,
        description: form.description,
        project_id: form.project_id || null,
        due_date: form.due_date || null,
    })
    await router.push(`/objectives/${props.objective.id}`)
}

const toggleComplete = async () => {
    await (props.objective.completed_at ? uncompleteObjective(props.objective.id) : completeObjective(props.objective.id))
    await refreshCurrent()
}

const trash = async () => {
    await softDelete(props.objective.id, 'objectives')
    await router.push(`/projects/${props.objective.project_id}`)
}

const restoreObjective = async () => {
    await restore(props.objective.id, 'objectives')
    await router.push(`/objectives/${props.objective.id}`)
}
</script>

<template>
    <EditItemForm
        v-model:name="form.name"
        v-model:description="form.description"
        :deleted-at="objective.deleted_at"
        @submit="submit"
        @trash="trash"
        @restore="restoreObjective"
    >
        <template #top>
            <CompleteToggle :completed-at="objective.completed_at" @toggle="toggleComplete" />
        </template>
        <template #fields>
            <label v-if="objective.project?.project_area?.projects?.length">
                <div>Project</div>
                <select class="p-0.5 border rounded-md w-full bg-white text-black md:max-w-96" v-model="form.project_id">
                    <option value="">None</option>
                    <option v-for="p in objective.project.project_area.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
            </label>
            <label>
                <div>Due date</div>
                <input type="date" class="p-0.5 border rounded-md bg-white text-black" v-model="form.due_date" />
            </label>
        </template>
    </EditItemForm>
</template>
