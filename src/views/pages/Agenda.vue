<script setup lang="ts">
import type { ProjectCategory, Project, Objective } from '@/types/projects'
import { computed, ref } from 'vue'
import { refreshCurrent } from '@/router/defineController'
import CategoryObjectiveBox from '../components/projects/CategoryObjectiveBox.vue'
import CurrentObjective from '../components/projects/CurrentObjective.vue'
import { completeObjective, uncompleteObjective, type DueDateObjective, type CategorisedObjective } from '@/data/objectives'
import { formatDueDateParts } from '@/utils/dueDate'
import '@/utils/dateExtensions'

const props = defineProps<{
    categories: ProjectCategory[]
    dueDateObjectives: DueDateObjective[]
    completedThisWeek: CategorisedObjective[]
    completedLastWeek: CategorisedObjective[]
    currentObjective: Objective | null
    activeProjects: Project[]
}>()

const selectedWeek = ref<'this' | 'last'>('this')
const completedObjectives = computed(() =>
    selectedWeek.value === 'this' ? props.completedThisWeek : props.completedLastWeek,
)

// "Later" objectives are those due next week or beyond (week offset >= 1),
// hidden by default behind a show/hide strip so the agenda leads with now.
const now = new Date()
const daysSinceMonday = (now.getDay() + 6) % 7 // getDay(): Sun=0 … Sat=6
const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday)
const todayIso = now.isoDate()
const showLater = ref(false)

// Whole-week offset of a due date from the current (Monday-start) week.
function weekOffset(iso: string): number {
    const [y, m, d] = iso.split('-').map(Number)
    const date = new Date(y!, m! - 1, d!)
    const since = (date.getDay() + 6) % 7
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - since)
    return Math.round((monday.getTime() - currentMonday.getTime()) / (7 * 86_400_000))
}

// Objectives with a due date, grouped by day (the list arrives ordered by
// date), then by project within each day (themed by the project's category
// colour, header linking to the project).
type CategoryGroup = { key: string; name: string; color_scheme: string | null; objectives: DueDateObjective[] }
type ProjectGroup = CategoryGroup & { to?: string }
type DateGroup = { date: string; label: string; relative: string; projects: ProjectGroup[] }

const objectivesByDueDate = computed(() => {
    const groups: DateGroup[] = []
    for (const obj of props.dueDateObjectives) {
        if (!obj.due_date) continue
        let dateGroup = groups[groups.length - 1]
        if (!dateGroup || dateGroup.date !== obj.due_date) {
            const { label, relative } = formatDueDateParts(obj.due_date)
            dateGroup = { date: obj.due_date, label, relative, projects: [] }
            groups.push(dateGroup)
        }
        const key = obj.project_id ?? ''
        let project = dateGroup.projects.find((p) => p.key === key)
        if (!project) {
            project = {
                key,
                name: obj.project_name ?? '',
                color_scheme: obj.color_scheme,
                to: obj.project_id ? `/projects/${obj.project_id}` : undefined,
                objectives: [],
            }
            dateGroup.projects.push(project)
        }
        project.objectives.push(obj)
    }
    return groups
})

// The day-groups gathered into whole weeks (they arrive date-ordered, so a
// week's days are contiguous). Weeks are the unit the show/hide strip gates on.
type WeekGroup = { key: number; days: DateGroup[] }
const objectivesByWeek = computed<WeekGroup[]>(() => {
    const weeks: WeekGroup[] = []
    for (const day of objectivesByDueDate.value) {
        const key = weekOffset(day.date)
        let week = weeks[weeks.length - 1]
        if (!week || week.key !== key) {
            week = { key, days: [] }
            weeks.push(week)
        }
        week.days.push(day)
    }
    return weeks
})

// The first "later" week (next week or beyond), so the strip renders once above it.
const firstLaterWeekKey = computed(() => objectivesByWeek.value.find((w) => w.key >= 1)?.key ?? null)

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
    <div class="space-y-4">
        <CurrentObjective :objective="currentObjective" :categories="categories" :active-projects="activeProjects" />

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div class="space-y-4">
                <h3 class="text-xl underline mb-4 mt-4">Agenda</h3>
            <template v-for="week in objectivesByWeek" :key="week.key">
                <!-- Strip once, immediately before the first "later" week. -->
                <div
                    v-if="week.key === firstLaterWeekKey"
                    class="rounded-md bg-slate-700 text-white flex justify-between items-center px-3 py-2"
                >
                    <span>Later objectives</span>
                    <div class="flex gap-2">
                        <button
                            type="button"
                            class="px-3 py-0.5 rounded-md"
                            :class="showLater ? 'bg-sky-600 text-white' : 'bg-sky-200 text-black'"
                            @click="showLater = true"
                        >show</button>
                        <button
                            type="button"
                            class="px-3 py-0.5 rounded-md"
                            :class="!showLater ? 'bg-sky-600 text-white' : 'bg-sky-200 text-black'"
                            @click="showLater = false"
                        >hide</button>
                    </div>
                </div>
                <div v-if="week.key < 1 || showLater" class="space-y-2">
                    <div v-for="group in week.days" :key="group.date">
                        <h3 class="font-semibold border-b flex justify-between items-baseline gap-2">
                            <span>{{ group.label }}</span>
                            <span class="text-sm font-normal" :class="{ 'text-red-500': group.date < todayIso }">{{ group.relative }}</span>
                        </h3>
                        <div class="space-y-1 mt-1">
                            <CategoryObjectiveBox
                                v-for="project in group.projects"
                                :key="project.key"
                                :name="project.name"
                                :to="project.to"
                                :color-scheme="project.color_scheme"
                                :objectives="project.objectives"
                                @toggle="onToggleObjective"
                            />
                        </div>
                    </div>
                </div>
            </template>
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
                weekday-date
                @toggle="onToggleObjective"
            />
            <p v-if="!completedByCategory.length">Nothing completed {{ selectedWeek === 'this' ? 'this' : 'last' }} week.</p>
        </div>
        </div>
    </div>
</template>
