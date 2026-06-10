<script lang="ts" setup>
import type { ProjectCategory, Project } from '@/types/projects'
import { ref } from 'vue'

const props = defineProps<{
    projectCategories: ProjectCategory[]
    projects: Project[]
}>()

const showUpcoming = ref<Record<string, boolean>>({})

function toggleUpcoming(categoryId: string) {
    showUpcoming.value[categoryId] = !showUpcoming.value[categoryId]
}

const upcomingProjects = props.projects.filter((p) => p.status === 'upcoming').sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
const activeProjects = props.projects.filter((p) => p.status === 'active').sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
</script>

<template>
    <template v-for="projectCategory in projectCategories" :key="projectCategory.id">
        <div :data-model-theme="projectCategory.color_scheme" class="bg-main mt-2 p-2 rounded-md text-black space-y-1">
            <div>
                <RouterLink class="text-xl underline" :to="`/project-categories/${projectCategory.id}`">{{ projectCategory.name }}</RouterLink>
            </div>
            <template v-for="project in activeProjects.filter((p) => p.project_category_id == projectCategory.id)" :key="project.id">
                <div class="flex justify-between border-gray-600 border-b">
                    <h4 class="font-bold">
                        <RouterLink :to="`/projects/${project.id}`">{{ project.name }}</RouterLink>
                    </h4>
                    <div v-if="(project.objectives ?? []).length > 0">
                        {{ (project.objectives ?? []).length - (project.objectives ?? []).filter((o) => o.completed_at == null).length }} / {{ (project.objectives ?? []).length }}
                    </div>
                </div>
            </template>
            <div v-if="upcomingProjects.filter((p) => p.project_category_id == projectCategory.id).length">
                <button class="text-sm opacity-60 hover:opacity-100 cursor-pointer" @click="toggleUpcoming(projectCategory.id)">
                    {{ showUpcoming[projectCategory.id] ? '▾ upcoming' : '▸ upcoming' }}
                </button>
                <template v-if="showUpcoming[projectCategory.id]">
                    <div class="divide-y">
                        <template v-for="project in upcomingProjects.filter((p) => p.project_category_id == projectCategory.id)" :key="project.id">
                            <h4 class="font-bold border-gray-600 mb-1">
                                <RouterLink :to="`/projects/${project.id}`">{{ project.name }}</RouterLink>
                            </h4>
                        </template>
                    </div>
                </template>
            </div>
        </div>
    </template>
</template>
