<script setup lang="ts">
import type { ProjectCategory } from '@/types/projects'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { updateProjectCategory } from '@/data/projectCategories'
import { softDelete, restore } from '@/data/utils'
import DeleteRestoreButton from '../components/DeleteRestoreButton.vue'

const props = defineProps<{ category: ProjectCategory }>()

const router = useRouter()

const form = reactive({
    name: props.category.name,
    color_scheme: props.category.color_scheme,
    general_project_id: props.category.general_project_id || null
})

const submit = async () => {
    await updateProjectCategory(props.category.id, { name: form.name, color_scheme: form.color_scheme, general_project_id: form.general_project_id })
    await router.push('/project-categories')
}

const trash = async () => {
    await softDelete(props.category.id, 'project_categories')
    await router.push('/project-categories')
}

const restoreCategory = async () => {
    await restore(props.category.id, 'project_categories')
    await router.push(`/project-categories/${props.category.id}`)
}
</script>

<template>
    <div class="py-6 space-y-4">
        <h2 class="text-xl underline">Edit Category: {{ category.name }}</h2>
        <div class="p-2 rounded-md bg-gray-300 shadow-md w-72 text-black">
            <form @submit.prevent="submit" class="flex flex-col gap-2">
                <label>
                    <div>Name</div>
                    <input class="bg-white border border-black rounded-md w-full" type="text" v-model="form.name" />
                </label>
                <label>
                    <div>Color Scheme</div>
                    <select class="bg-white border border-black rounded-md w-full" v-model="form.color_scheme">
                        <option value="green">Green</option>
                        <option value="amber">Amber</option>
                        <option value="purple">Purple</option>
                        <option value="rose">Rose</option>
                    </select>
                </label>
                <label v-if="category.projects">
                    <div>General Project</div>
                    <select class="bg-white border border-black rounded-md w-full" v-model="form.general_project_id">
                        <option :value="null">None</option>
                        <option v-for="project in category.projects.filter(p => p.status == 'active')" :value="project.id">{{ project.name }}</option>
                    </select>
                </label>
                <button type="submit" class="bg-sky-500 text-white rounded-md border-2 border-black cursor-pointer">Update</button>
            </form>
            <DeleteRestoreButton :deleted-at="category.deleted_at" class="mt-2" @trash="trash" @restore="restoreCategory" />
        </div>
    </div>
</template>
