<script setup lang="ts">
import type { Project, ProjectCategory } from '@/types/projects'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { updateProject } from '@/data/projects'
import { softDelete, restore } from '@/data/utils'
import EditItemForm from '../components/projects/EditItemForm.vue'
import StatusButtons from '../components/projects/StatusButtons.vue'

const props = defineProps<{
    project: Project
    categories: ProjectCategory[]
}>()

const router = useRouter()

const form = reactive({
    name: props.project.name,
    description: props.project.description || '',
    status: props.project.status ?? 'active',
    project_category_id: props.project.project_category_id,
})

const submit = async () => {
    await updateProject(props.project.id, {
        name: form.name,
        description: form.description,
        status: form.status,
        project_category_id: form.project_category_id!,
    })
    await router.push(`/projects/${props.project.id}`)
}

const trash = async () => {
    await softDelete(props.project.id, 'projects')
    await router.push('/project-categories')
}

const restoreProject = async () => {
    await restore(props.project.id, 'projects')
    await router.push(`/projects/${props.project.id}`)
}
</script>

<template>
    <EditItemForm
        v-model:name="form.name"
        v-model:description="form.description"
        :deleted-at="project.deleted_at"
        @submit="submit"
        @trash="trash"
        @restore="restoreProject"
    >
        <template #top>
            <StatusButtons v-model="form.status" />
        </template>
        <template #fields>
            <label>
                <div>Category</div>
                <select class="p-0.5 border rounded-md w-full bg-white text-black md:max-w-96" v-model="form.project_category_id">
                    <option v-for="cat in categories" :value="cat.id" :key="cat.id">{{ cat.name }}</option>
                </select>
            </label>
        </template>
    </EditItemForm>
</template>
