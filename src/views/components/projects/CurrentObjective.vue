<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Objective, Project } from '@/types/projects'
import { refreshCurrent } from '@/router/defineController'
import { setCurrentObjective, getIncompleteObjectivesForProject } from '@/data/objectives'
import { createTask, completeTask, uncompleteTask, reorderTasks } from '@/data/tasks'
import ChildItemList from './ChildItemList.vue'
import DescriptionPanel from './DescriptionPanel.vue'
import { formatDueDate } from '@/utils/dueDate'

const props = defineProps<{
    objective: Objective | null
    activeProjects: Project[]
}>()

// ── Picker: active-project bubbles → objective dropdown ───────────────
const selectedProject = ref('')
const selectedObjective = ref('')
const objectiveOptions = ref<Objective[]>([])

// Shows the picker over an already-set objective, to swap it out.
const changing = ref(false)
function startChange() {
    selectedProject.value = ''
    selectedObjective.value = ''
    objectiveOptions.value = []
    changing.value = true
}

// Clicking the selected bubble again deselects it.
function toggleProject(id: string) {
    selectedProject.value = selectedProject.value === id ? '' : id
}

// Changing the project reloads its incomplete objectives (due date or not).
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
                <RouterLink v-if="objective.project?.project_area" :to="`/project-categories/${objective.project.project_area.id}`" class="hover:underline">{{ objective.project.project_area.name }}</RouterLink>
                <span v-if="objective.project?.project_area && objective.project"> / </span>
                <RouterLink v-if="objective.project" :to="`/projects/${objective.project.id}`" class="hover:underline">{{ objective.project.name }}</RouterLink>
            </div>
            <RouterLink :to="`/objectives/${objective.id}`" class="text-2xl hover:underline">{{ objective.name }}</RouterLink>
        </div>

        <div v-if="objective.due_date" class="text-sm">Due: {{ formatDueDate(objective.due_date) }}</div>

        <div class="space-y-2" :data-model-theme="objective.project?.project_area?.color_scheme">
            <ChildItemList
                :items="objective.tasks ?? []"
                title="Tasks"
                base-path="tasks"
                layout="row"
                :theme="objective.project?.project_area?.color_scheme"
                @create="onCreate"
                @toggle="onToggle"
                @reorder="onReorder"
            />
            <DescriptionPanel :description="objective.description" />
        </div>
    </div>

    <!-- Empty: pick a current objective. -->
    <div v-else class="rounded-md bg-gray-100 text-black px-3 py-3 space-y-3">
        <div>
            <div class="text-sm mb-1">Project</div>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="p in activeProjects"
                    :key="p.id"
                    type="button"
                    class="w-fit px-2 py-1 rounded-lg border-2 border-dark cursor-pointer"
                    :class="selectedProject === p.id ? 'bg-dark text-white!' : 'bg-light'"
                    :data-model-theme="p.color_scheme ?? 'gray'"
                    @click="toggleProject(p.id)"
                >{{ p.name }}</button>
                <p v-if="!activeProjects.length" class="italic text-sm">No active projects.</p>
            </div>
        </div>
        <label class="block">
            <div class="text-sm">Objective</div>
            <select v-model="selectedObjective" :disabled="!selectedProject" class="border border-black rounded-md w-full bg-white px-1 disabled:opacity-50">
                <option value="">Select objective</option>
                <option v-for="o in objectiveOptions" :key="o.id" :value="o.id">{{ o.name }}</option>
            </select>
        </label>
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
