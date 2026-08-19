<script setup lang="ts">
import type { Project, ProjectCategory } from '@/types/projects'
import { reactive, ref, computed } from 'vue'
import { refreshCurrent } from '@/router/defineController'
import { createProjectCategory, reorderProjectCategories } from '@/data/projectCategories'
import { setToDoListProject, clearToDoListProject } from '@/data/projects'
import ReorderingModal from '../components/projects/ReorderingModal.vue'
import ProjectAreaActionItems from '../components/planner/ProjectAreaActionItems.vue'
import CategoryObjectiveBox from '../components/projects/CategoryObjectiveBox.vue'
import { completeObjective, uncompleteObjective, type DueDateObjective, type CategorisedObjective } from '@/data/objectives'
import { formatDueDateParts } from '@/utils/dueDate'

const props = defineProps<{
    categories: ProjectCategory[]
    projects: Project[]
    toDoListProjectId: string | null
    dueDateObjectives: DueDateObjective[]
    completedThisWeek: CategorisedObjective[]
}>()

// Selecting a project immediately persists it as the to-do list project;
// selecting "None" clears it.
const selectedToDoProject = ref(props.toDoListProjectId ?? '')
const setToDoProject = async () => {
    if (selectedToDoProject.value) {
        await setToDoListProject(selectedToDoProject.value)
    } else {
        await clearToDoListProject()
    }
    await refreshCurrent()
}

// Objectives with a due date, grouped by day (the list arrives ordered by
// date), then by project category within each day.
type CategoryGroup = { key: string; name: string; color_scheme: string | null; objectives: DueDateObjective[] }
type DateGroup = { date: string; label: string; relative: string; categories: CategoryGroup[] }


const objectivesByDueDate = computed(() => {
    const groups: DateGroup[] = []
    for (const obj of props.dueDateObjectives) {
        if (!obj.due_date) continue
        let dateGroup = groups[groups.length - 1]
        if (!dateGroup || dateGroup.date !== obj.due_date) {
            const { label, relative } = formatDueDateParts(obj.due_date)
            dateGroup = { date: obj.due_date, label, relative, categories: [] }
            groups.push(dateGroup)
        }
        const key = obj.project_category_id ?? ''
        let category = dateGroup.categories.find((c) => c.key === key)
        if (!category) {
            const name = props.categories.find((pc) => pc.id === obj.project_category_id)?.name ?? ''
            category = { key, name, color_scheme: obj.color_scheme, objectives: [] }
            dateGroup.categories.push(category)
        }
        category.objectives.push(obj)
    }
    return groups
})

// Objectives completed this week, grouped by project category (themed box each).
const completedByCategory = computed(() => {
    const groups: CategoryGroup[] = []
    for (const obj of props.completedThisWeek) {
        const key = obj.project_category_id ?? ''
        let category = groups.find((c) => c.key === key)
        if (!category) {
            const name = props.categories.find((pc) => pc.id === obj.project_category_id)?.name ?? ''
            category = { key, name, color_scheme: obj.color_scheme, objectives: [] }
            groups.push(category)
        }
        category.objectives.push(obj)
    }
    return groups
})

// Complete / un-complete straight from the list; reload so the objective moves
// between the Agenda and Completed columns.
async function onToggleObjective(id: string, nowComplete: boolean) {
    await (nowComplete ? completeObjective(id) : uncompleteObjective(id))
    await refreshCurrent()
}

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
    <div class="grid lg:grid-cols-2 gap-3">
        <div class="space-y-4">
            <h3 class="text-xl underline mb-4 mt-4">Agenda</h3>
            <div v-for="group in objectivesByDueDate" :key="group.date">
                <h3 class="font-semibold border-b flex justify-between items-baseline gap-2">
                    <span>{{ group.label }}</span>
                    <span class="text-sm font-normal">{{ group.relative }}</span>
                </h3>
                <div class="space-y-1 mt-1">
                    <CategoryObjectiveBox
                        v-for="category in group.categories"
                        :key="category.key"
                        :name="category.name"
                        :color-scheme="category.color_scheme"
                        :objectives="category.objectives"
                        @toggle="onToggleObjective"
                    />
                </div>
            </div>
            <p v-if="!objectivesByDueDate.length">No objectives with a due date.</p>
        </div>

        <div class="space-y-1">
            <h3 class="text-xl underline mb-11 mt-4">Completed this week</h3>
            <CategoryObjectiveBox
                v-for="category in completedByCategory"
                :key="category.key"
                :name="category.name"
                :color-scheme="category.color_scheme"
                :objectives="category.objectives"
                @toggle="onToggleObjective"
            />
            <p v-if="!completedByCategory.length">Nothing completed yet this week.</p>
        </div>
    </div>
    <div class="py-6 grid lg:grid-cols-2 gap-3 w-full">
        <div class="space-y-2">
            <div class="flex gap-2 items-center">
                <h2 class="text-xl underline">Categories</h2>
                <div class="rounded-full bg-white w-6 h-6 flex justify-center items-center border cursor-pointer" @click="modalOpen = true">
                    <font-awesome-icon class="text-black" icon="up-down" />
                </div>
            </div>
    
            <ProjectAreaActionItems :project-categories="categories" :projects="projects" />
            <ReorderingModal v-model:open="modalOpen" :items="categories" :theme="null" @save="reorder" />
        </div>

        <div class="space-y-4 lg:mt-9">
            <div class="space-y-2">
                <p v-if="!categories.length">No project categories yet. Create one below.</p>
        
                <div class="p-2 rounded-md bg-gray-300 shadow-md text-black">
                    <h4 class="text-xl underline mb-4">New Project Category</h4>
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
            </div>
    
            <div class="space-y-2">
                <div class="p-2 rounded-md bg-gray-300 shadow-md text-black">
                    <h4 class="text-xl underline mb-4">To-Do List Project</h4>
                    <select
                        class="bg-white border border-black rounded-md w-full"
                        v-model="selectedToDoProject"
                        @change="setToDoProject"
                    >
                        <option value="">None</option>
                        <option v-for="project in projects.filter(p => p.status == 'active')" :value="project.id" :key="project.id">{{ project.name }}</option>
                    </select>
                </div>
            </div>
        </div>
        
        
    </div>

    

</template>
