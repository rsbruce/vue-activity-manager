<script setup lang="ts">
import type { ProjectCategory } from '@/types/projects'
import { computed, ref } from 'vue'
import { refreshCurrent } from '@/router/defineController'
import CategoryObjectiveBox from '../components/projects/CategoryObjectiveBox.vue'
import { completeObjective, uncompleteObjective, type DueDateObjective, type CategorisedObjective } from '@/data/objectives'
import { formatDueDateParts } from '@/utils/dueDate'

const props = defineProps<{
    categories: ProjectCategory[]
    dueDateObjectives: DueDateObjective[]
    completedThisWeek: CategorisedObjective[]
    completedLastWeek: CategorisedObjective[]
}>()

const selectedWeek = ref<'this' | 'last'>('this')
const completedObjectives = computed(() =>
    selectedWeek.value === 'this' ? props.completedThisWeek : props.completedLastWeek,
)

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
    for (const obj of completedObjectives.value) {
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
            <h3 class="text-xl underline mt-4">Completed Objectives</h3>
            <div class="flex gap-2 my-2">
                <button
                    type="button"
                    class="px-3 py-0.5 rounded-md"
                    :class="selectedWeek === 'this' ? 'bg-sky-600 text-white' : 'bg-sky-200 text-black'"
                    @click="selectedWeek = 'this'"
                >This week</button>
                <button
                    type="button"
                    class="px-3 py-0.5 rounded-md"
                    :class="selectedWeek === 'last' ? 'bg-sky-600 text-white' : 'bg-sky-200 text-black'"
                    @click="selectedWeek = 'last'"
                >Last week</button>
            </div>
            <CategoryObjectiveBox
                v-for="category in completedByCategory"
                :key="category.key"
                :name="category.name"
                :color-scheme="category.color_scheme"
                :objectives="category.objectives"
                @toggle="onToggleObjective"
            />
            <p v-if="!completedByCategory.length">Nothing completed {{ selectedWeek === 'this' ? 'this' : 'last' }} week.</p>
        </div>
    </div>
</template>
