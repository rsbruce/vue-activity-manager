<script setup lang="ts">
import type { ProjectCategory } from '@/types/projects'
import { reactive, ref } from 'vue'
import { refreshCurrent } from '@/router/defineController'
import { createProjectCategory, reorderProjectCategories } from '@/data/projectCategories'
import ReorderingModal from '../components/projects/ReorderingModal.vue'

defineProps<{ categories: ProjectCategory[] }>()

const form = reactive({ name: '', color_scheme: 'amber' })

const submit = async () => {
    if (!form.name.trim()) return
    await createProjectCategory({ name: form.name.trim(), color_scheme: form.color_scheme })
    form.name = ''
    form.color_scheme = 'amber'
    await refreshCurrent()
}

const modalOpen = ref(false)
const reorder = async (items: { id: string; order: number | null }[]) => {
    await reorderProjectCategories(items)
    await refreshCurrent()
}
</script>

<template>
    <div class="py-6 space-y-6">
        <h2 class="text-xl underline">New Project Category</h2>
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
                <button type="submit" class="bg-sky-500 text-white rounded-md border-2 border-black cursor-pointer">Create</button>
            </form>
        </div>

        <div class="flex gap-2 items-center">
            <h2 class="text-xl underline">Categories</h2>
            <div class="rounded-full bg-white w-6 h-6 flex justify-center items-center border cursor-pointer" @click="modalOpen = true">
                <font-awesome-icon class="text-black" icon="up-down" />
            </div>
        </div>

        <div class="flex flex-wrap gap-4">
            <template v-for="category in categories" :key="category.id">
                <RouterLink :to="`/project-categories/${category.id}`"
                    class="block bg-main rounded-md p-4 w-72 text-black no-underline"
                    :data-model-theme="category.color_scheme">
                    <h3 class="text-xl font-bold">{{ category.name }}</h3>
                    <p class="text-sm mt-1">{{ category.project_count || 0 }} projects</p>
                </RouterLink>
            </template>
        </div>

        <ReorderingModal v-model:open="modalOpen" :items="categories" :theme="null" @save="reorder" />

        <p v-if="!categories.length">No project categories yet. Create one above.</p>
    </div>
</template>
