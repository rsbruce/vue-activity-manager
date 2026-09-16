<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Objective, Project, ProjectCategory } from '@/types/projects'
import { refreshCurrent } from '@/router/defineController'
import { setCurrentObjective, getIncompleteObjectivesForProject } from '@/data/objectives'
import { createTask, completeTask, uncompleteTask, reorderTasks } from '@/data/tasks'
import ChildItemList from './ChildItemList.vue'
import DescriptionPanel from './DescriptionPanel.vue'
import { formatDueDate } from '@/utils/dueDate'

const props = defineProps<{
    objective: Objective | null
    categories: ProjectCategory[]
    activeProjects: Project[]
}>()

// ── Empty-state selection (area → project → objective) ────────────────
const selectedArea = ref('')
const selectedProject = ref('')
const selectedObjective = ref('')
const objectiveOptions = ref<Objective[]>([])

// Shows the picker over an already-set objective, to swap it out.
const changing = ref(false)
function startChange() {
    selectedArea.value = ''
    selectedProject.value = ''
    selectedObjective.value = ''
    objectiveOptions.value = []
    changing.value = true
}

const projectOptions = computed(() =>
    selectedArea.value ? props.activeProjects.filter((p) => p.project_category_id === selectedArea.value) : [],
)

// Changing the area resets project + objective; changing the project reloads its
// incomplete objectives.
watch(selectedArea, () => {
    selectedProject.value = ''
    selectedObjective.value = ''
    objectiveOptions.value = []
})
watch(selectedProject, async (pid) => {
    selectedObjective.value = ''
    objectiveOptions.value = pid ? await getIncompleteObjectivesForProject(pid) : []
})

async function confirmSelection() {
    if (!selectedObjective.value) return
    await setCurrentObjective(selectedObjective.value)
    changing.value = false
    await refreshCurrent()
}

// ── Task handlers (mirror ObjectiveShow) ──────────────────────────────
const onCreate = async (name: string) => {
    if (!props.objective) return
    await createTask({ name, objective_id: props.objective.id })
    await refreshCurrent()
}
const onToggle = async ({ id, nowComplete }: { id: string; nowComplete: boolean }) => {
    await (nowComplete ? completeTask(id) : uncompleteTask(id))
    await refreshCurrent()
}
const onReorder = async (items: { id: string; order: number | null }[]) => {
    await reorderTasks(items)
    await refreshCurrent()
}
</script>

<template>
    <div>
        <div class="flex items-center gap-3 mb-2 mt-4">
            <h2 class="text-xl underline">Current Objective</h2>
            <button v-if="objective && !changing" class="bg-sky-500 text-white text-sm px-2 py-0.5 rounded-md cursor-pointer" @click="startChange">Change</button>
        </div>

        <!-- Selected: a pared-down ObjectiveShow (no edit link, no status toggle). -->
        <div v-if="objective && !changing" class="space-y-3">
            <div class="rounded-md bg-main px-3 py-2" :data-model-theme="objective.project?.project_area?.color_scheme ?? 'gray'">
            <div class="text-base">
                <RouterLink v-if="objective.project?.project_area" :to="`/project-categories/${objective.project.project_area.id}`">{{ objective.project.project_area.name }}</RouterLink>
                <span v-if="objective.project?.project_area && objective.project"> / </span>
                <RouterLink v-if="objective.project" :to="`/projects/${objective.project.id}`">{{ objective.project.name }}</RouterLink>
            </div>
            <div class="text-2xl">{{ objective.name }}</div>
        </div>

        <div v-if="objective.due_date" class="text-sm">Due: {{ formatDueDate(objective.due_date) }}</div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2" :data-model-theme="objective.project?.project_area?.color_scheme">
            <ChildItemList
                :items="objective.tasks ?? []"
                title="Tasks"
                base-path="tasks"
                :theme="objective.project?.project_area?.color_scheme"
                @create="onCreate"
                @toggle="onToggle"
                @reorder="onReorder"
            />
            <DescriptionPanel :description="objective.description" />
        </div>
    </div>

    <!-- Empty: pick a current objective. -->
    <div v-else class="rounded-md bg-gray-300 text-black px-3 py-3 space-y-3">
        <div class="flex flex-col md:flex-row gap-2">
            <label class="flex-1">
                <div class="text-sm">Project area</div>
                <select v-model="selectedArea" class="border border-black rounded-md w-full bg-white px-1">
                    <option value="">Select area</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
            </label>
            <label class="flex-1">
                <div class="text-sm">Project</div>
                <select v-model="selectedProject" :disabled="!selectedArea" class="border border-black rounded-md w-full bg-white px-1 disabled:opacity-50">
                    <option value="">Select project</option>
                    <option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
            </label>
            <label class="flex-1">
                <div class="text-sm">Objective</div>
                <select v-model="selectedObjective" :disabled="!selectedProject" class="border border-black rounded-md w-full bg-white px-1 disabled:opacity-50">
                    <option value="">Select objective</option>
                    <option v-for="o in objectiveOptions" :key="o.id" :value="o.id">{{ o.name }}</option>
                </select>
            </label>
        </div>
        <div class="flex gap-2">
            <button
                :disabled="!selectedObjective"
                class="bg-sky-500 text-white rounded-md border-2 border-black px-3 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                @click="confirmSelection"
            >Set current objective</button>
            <button
                v-if="changing"
                class="bg-gray-200 text-black rounded-md border-2 border-black px-3 py-1 cursor-pointer"
                @click="changing = false"
            >Cancel</button>
        </div>
    </div>
    </div>
</template>
