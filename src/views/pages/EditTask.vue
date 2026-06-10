<script setup lang="ts">
import type { Task } from '@/types/projects'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { refreshCurrent } from '@/router/defineController'
import { updateTask, completeTask, uncompleteTask } from '@/data/tasks'
import { softDelete, restore } from '@/data/utils'
import EditItemForm from '../components/projects/EditItemForm.vue'
import CompleteToggle from '../components/projects/CompleteToggle.vue'

const props = defineProps<{ task: Task }>()

const router = useRouter()

const form = reactive({
    name: props.task.name,
    description: props.task.description ?? '',
    objective_id: props.task.objective_id,
})

const submit = async () => {
    await updateTask(props.task.id, {
        name: form.name,
        description: form.description,
        objective_id: form.objective_id || null,
    })
    await router.push(`/tasks/${props.task.id}`)
}

const toggleComplete = async () => {
    await (props.task.completed_at ? uncompleteTask(props.task.id) : completeTask(props.task.id))
    await refreshCurrent()
}

const trash = async () => {
    await softDelete(props.task.id, 'tasks')
    await router.push(`/objectives/${props.task.objective_id}`)
}

const restoreTask = async () => {
    await restore(props.task.id, 'tasks')
    await router.push(`/objectives/${props.task.objective_id}`)
}
</script>

<template>
    <EditItemForm
        v-model:name="form.name"
        v-model:description="form.description"
        :deleted-at="task.deleted_at"
        @submit="submit"
        @trash="trash"
        @restore="restoreTask"
    >
        <template #top>
            <CompleteToggle :completed-at="task.completed_at" completed-class="bg-emerald-300 border-emerald-700" @toggle="toggleComplete" />
        </template>
        <template #fields>
            <label v-if="task.objective?.project?.objectives?.length">
                <div>Objective</div>
                <select class="p-0.5 border rounded-md w-full bg-white text-black md:max-w-96" v-model="form.objective_id">
                    <option value="">None</option>
                    <option v-for="obj in task.objective.project.objectives" :key="obj.id" :value="obj.id">{{ obj.name }}</option>
                </select>
            </label>
        </template>
    </EditItemForm>
</template>
