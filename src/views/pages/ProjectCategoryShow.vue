<script setup lang="ts">
import type { Objective, Project, ProjectCategory } from '@/types/projects'
import { computed, reactive, ref } from 'vue'
import { refreshCurrent } from '@/router/defineController'
import { reorderProjects, createProject } from '@/data/projects'
import { createObjective, completeObjective, uncompleteObjective } from '@/data/objectives'
import ReorderingModal from '../components/projects/ReorderingModal.vue'

const props = defineProps<{ category: ProjectCategory }>()

const projects = computed(() => props.category.projects ?? [])

const generalProject = computed(() =>
    projects.value.find((p) => p.id === props.category.general_project_id) ?? null,
)
const nonGeneralProjects = computed(() =>
    projects.value.filter((p) => p.id !== props.category.general_project_id),
)

const activeProjects = computed(() =>
    nonGeneralProjects.value.filter((p) => p.status === 'active').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
)
const upcomingProjects = computed(() =>
    nonGeneralProjects.value.filter((p) => p.status === 'upcoming').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
)
const completedProjects = computed(() =>
    nonGeneralProjects.value.filter((p) => p.status === 'complete').sort((a, b) => (b.completed_at! > a.completed_at! ? 1 : -1)),
)

const PAGE_SIZE = 10
const activePage = ref(1)
const upcomingPage = ref(1)
const completedPage = ref(1)

const activeTotalPages = computed(() => Math.max(1, Math.ceil(activeProjects.value.length / PAGE_SIZE)))
const upcomingTotalPages = computed(() => Math.max(1, Math.ceil(upcomingProjects.value.length / PAGE_SIZE)))
const completedTotalPages = computed(() => Math.max(1, Math.ceil(completedProjects.value.length / PAGE_SIZE)))

const pagedActive = computed(() => activeProjects.value.slice((activePage.value - 1) * PAGE_SIZE, activePage.value * PAGE_SIZE))
const pagedUpcoming = computed(() => upcomingProjects.value.slice((upcomingPage.value - 1) * PAGE_SIZE, upcomingPage.value * PAGE_SIZE))
const pagedCompleted = computed(() => completedProjects.value.slice((completedPage.value - 1) * PAGE_SIZE, completedPage.value * PAGE_SIZE))

const activeReorderModalOpen = ref(false)
const upcomingReorderModalOpen = ref(false)

const reorder = async (items: { id: string; order: number | null }[]) => {
    await reorderProjects(items)
    await refreshCurrent()
}

// completed_at is a Unix epoch (seconds); compare against epoch thresholds.
const todayStartUnix = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
const sevenDaysAgoUnix = todayStartUnix - 7 * 24 * 60 * 60

const generalIncomplete = computed(() =>
    (generalProject.value?.objectives ?? []).filter((o) => !o.completed_at).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
)
const generalCompletedToday = computed(() =>
    (generalProject.value?.objectives ?? []).filter((o) => o.completed_at && o.completed_at >= todayStartUnix),
)
const generalCompletedLast7 = computed(() =>
    (generalProject.value?.objectives ?? []).filter((o) => o.completed_at && o.completed_at >= sevenDaysAgoUnix).length,
)

const toggleComplete = async (objectiveId: string, isComplete: boolean) => {
    await (isComplete ? uncompleteObjective(objectiveId) : completeObjective(objectiveId))
    await refreshCurrent()
}

const objectiveForm = reactive({ name: '' })
const addObjective = async () => {
    if (!objectiveForm.name.trim() || !generalProject.value) return
    await createObjective({ name: objectiveForm.name.trim(), project_id: generalProject.value.id })
    objectiveForm.name = ''
    await refreshCurrent()
}

const projectForm = reactive({ name: '', status: 'active' })
const addProject = async () => {
    if (!projectForm.name.trim()) return
    await createProject({
        name: projectForm.name.trim(),
        status: projectForm.status,
        project_category_id: props.category.id,
        set_as_to_do_list: false,
    })
    projectForm.name = ''
    await refreshCurrent()
}

const incompleteObjectiveCount = (project: Project) =>
    project.objectives?.filter((o: Objective) => !o.completed_at).length ?? 0
</script>

<template>
    <div class="space-y-3 py-2">
        <div class="flex gap-4 items-center">
            <RouterLink to="/project-categories">Back</RouterLink>
            <RouterLink :to="`/project-categories/${category.id}/edit`">Edit Category</RouterLink>
        </div>

        <div :data-model-theme="category.color_scheme" class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <!-- Left: add + active projects -->
            <div class="space-y-2">
                <div class="bg-light rounded-md p-2">
                    <h3 class="text-lg font-semibold mb-2">Add Project</h3>
                    <form @submit.prevent="addProject" class="flex flex-col gap-2">
                        <input class="bg-white border border-black rounded-md p-1 flex-grow" type="text" v-model="projectForm.name" placeholder="Project name" />
                        <select class="bg-white border border-black rounded-md p-1" v-model="projectForm.status">
                            <option value="active">Active</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="complete">Complete</option>
                        </select>
                        <button type="submit" class="bg-dark text-white px-2 py-1 rounded-md cursor-pointer">Add</button>
                    </form>
                </div>
                <div class="bg-main rounded-md p-2">
                    <div class="flex justify-between items-center mb-4">
                        <div class="underline text-xl">Active Projects</div>
                        <div class="rounded-full bg-white w-6 h-6 flex justify-center items-center border cursor-pointer" @click="activeReorderModalOpen = true">
                            <font-awesome-icon icon="up-down" />
                        </div>
                    </div>
                    <div class="divide-y space-y-4" :class="activeTotalPages > 1 ? 'h-80 overflow-hidden' : ''">
                        <div v-for="project in pagedActive" :key="project.id" class="border-gray-500 flex justify-between">
                            <h2 class="text-lg">
                                <RouterLink :to="`/projects/${project.id}`">{{ project.name }}</RouterLink>
                            </h2>
                            <p v-if="project.objectives?.length">
                                <strong>{{ project.objectives.filter((o) => o.completed_at).length }}/{{ project.objectives.length }}</strong>
                            </p>
                        </div>
                    </div>
                    <p v-if="!activeProjects.length" class="italic">No projects yet</p>
                    <div v-if="activeTotalPages > 1" class="flex items-center gap-2 mt-2">
                        <button @click="activePage--" :disabled="activePage === 1" class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default">&larr;</button>
                        <span class="text-sm">Page {{ activePage }} of {{ activeTotalPages }}</span>
                        <button @click="activePage++" :disabled="activePage === activeTotalPages" class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default">&rarr;</button>
                    </div>
                </div>
            </div>

            <!-- Right: general project + upcoming + completed -->
            <div>
                <div v-if="generalProject" class="bg-main rounded-md p-2 mb-2">
                    <div class="mb-2">
                        <h2 class="text-xl underline">{{ generalProject.name }}</h2>
                        <p>
                            <strong class="text-lg">{{ generalCompletedLast7 }}</strong>
                            {{ generalCompletedLast7 === 1 ? 'task' : 'tasks' }} completed in the last 7 days
                        </p>
                    </div>
                    <div>
                        <div v-for="objective in generalIncomplete" :key="objective.id" class="flex items-center gap-2 mb-1">
                            <button @click="toggleComplete(objective.id, false)" class="w-5 h-5 rounded border border-dark bg-light flex-shrink-0 cursor-pointer"></button>
                            <RouterLink :to="`/objectives/${objective.id}`" class="underline">{{ objective.name }}</RouterLink>
                        </div>
                    </div>
                    <div v-if="generalCompletedToday.length">
                        <h3 class="text-xl underline mt-2">Completed today</h3>
                        <div v-for="objective in generalCompletedToday" :key="objective.id" class="flex items-center gap-2 mb-1">
                            <button @click="toggleComplete(objective.id, true)" class="w-5 h-5 rounded border border-dark bg-intense flex-shrink-0 cursor-pointer"></button>
                            <RouterLink :to="`/objectives/${objective.id}`" class="line-through">{{ objective.name }}</RouterLink>
                        </div>
                    </div>
                    <h3 class="text-xl underline mt-2">New</h3>
                    <form @submit.prevent="addObjective" class="flex gap-1">
                        <input type="text" class="p-0.5 border border-black rounded-md flex-grow bg-white text-black" v-model="objectiveForm.name" />
                        <button type="submit" class="text-white bg-dark px-2 rounded-md cursor-pointer">Add</button>
                    </form>
                </div>

                <div class="space-y-2">
                    <div class="bg-light rounded-md p-2 h-fit space-y-2">
                        <div class="flex justify-between items-center">
                            <h3 class="text-xl underline">Upcoming Projects</h3>
                            <div class="rounded-full bg-white w-6 h-6 flex justify-center items-center border cursor-pointer" @click="upcomingReorderModalOpen = true">
                                <font-awesome-icon icon="up-down" />
                            </div>
                        </div>
                        <div :class="upcomingTotalPages > 1 ? 'h-80 overflow-hidden' : ''">
                            <div v-for="project in pagedUpcoming" :key="project.id" class="mb-3">
                                <h4 class="font-semibold underline">
                                    <RouterLink :to="`/projects/${project.id}`">{{ project.name }}</RouterLink>
                                </h4>
                                <p class="font-semibold">
                                    {{ incompleteObjectiveCount(project) }}
                                    {{ incompleteObjectiveCount(project) === 1 ? 'incomplete objective' : 'incomplete objectives' }}
                                </p>
                            </div>
                        </div>
                        <div v-if="upcomingTotalPages > 1" class="flex items-center gap-2">
                            <button @click="upcomingPage--" :disabled="upcomingPage === 1" class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default">&larr;</button>
                            <span class="text-sm">Page {{ upcomingPage }} of {{ upcomingTotalPages }}</span>
                            <button @click="upcomingPage++" :disabled="upcomingPage === upcomingTotalPages" class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default">&rarr;</button>
                        </div>
                    </div>
                    <div class="bg-light rounded-md p-2">
                        <div class="mb-4 underline text-xl">Completed Projects</div>
                        <div class="divide-y" :class="completedTotalPages > 1 ? 'h-80 overflow-hidden' : ''">
                            <div v-for="project in pagedCompleted" :key="project.id" class="border-gray-500 flex justify-between mb-2">
                                <h2><RouterLink :to="`/projects/${project.id}`">{{ project.name }}</RouterLink></h2>
                                <span v-if="project.completed_at" class="flex-none text-xs text-gray-500 whitespace-nowrap">
                                    {{ new Date(project.completed_at * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric' }) }}
                                </span>
                            </div>
                        </div>
                        <div v-if="completedTotalPages > 1" class="flex items-center gap-2 mt-2">
                            <button @click="completedPage--" :disabled="completedPage === 1" class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default">&larr;</button>
                            <span class="text-sm">Page {{ completedPage }} of {{ completedTotalPages }}</span>
                            <button @click="completedPage++" :disabled="completedPage === completedTotalPages" class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default">&rarr;</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <ReorderingModal v-model:open="activeReorderModalOpen" :items="activeProjects" :theme="category.color_scheme" @save="reorder" />
        <ReorderingModal v-model:open="upcomingReorderModalOpen" :items="upcomingProjects" :theme="category.color_scheme" @save="reorder" />
    </div>
</template>
