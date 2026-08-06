<script lang="ts" setup>
import { computed } from 'vue'
import type { Project, Objective, ProjectOnDayData, ProjectCategory } from '@/types/projects'
import EditableProjectItem from './EditableProjectItem.vue'
import ProjectSelector from './ProjectSelector.vue'
import StaticProjectItem from './StaticProjectItem.vue'

type ProjectItem = {
    project: Project
    objectives: Objective[]
    theme: string | undefined
    date: Date
}

const props = defineProps<{
    startDate: Date
    activeProjects: Project[]
    projectOnDayData: ProjectOnDayData
    projectCategories: ProjectCategory[]
    showLaterDays: boolean
}>()

const emit = defineEmits<{
    'add-project': [{ projectId: string; date: string }]
    'toggle': [objectiveId: string, complete: boolean]
    'remove-project-on-day': [projectId: string, date: string]
}>()

const startDateYmd = computed<string>(() => props.startDate.isoDate())

function getDateDisplayName(date: Date) {
    const ymd = date.isoDate()
    const today = new Date().isoDate()
    const yesterday = new Date(Date.now() - 86400000).isoDate()
    const tomorrow = new Date(Date.now() + 86400000).isoDate()

    if (ymd === today) return `Today (${date.toLocaleDateString('en-GB', { weekday: 'long' })})`
    if (ymd === yesterday) return `Yesterday (${date.toLocaleDateString('en-GB', { weekday: 'long' })})`
    if (ymd === tomorrow) return `Tomorrow (${date.toLocaleDateString('en-GB', { weekday: 'long' })})`

    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', weekday: 'long' })
}

const availableProjectsForStartDay = computed(() => {
    const scheduledIds = new Set(
        Object.values(props.projectOnDayData[startDateYmd.value] ?? {}).map((e) => e.project_id),
    )
    return [...props.activeProjects]
        .sort((a, b) => {
            const catAOrder = props.projectCategories.find((c) => c.id == a.project_category_id)?.order ?? 0
            const catBOrder = props.projectCategories.find((c) => c.id == b.project_category_id)?.order ?? 0
            return catAOrder - catBOrder
        })
        .filter((p) => p.status === 'active' && !scheduledIds.has(p.id))
        .map((p) => {
            const category = props.projectCategories.find((pc) => pc.id === p.project_category_id)
            return { id: p.id, name: p.name, theme: category?.color_scheme }
        })
})

function projectsForDay(date: Date): ProjectItem[] {
    const dayMap = props.projectOnDayData[date.isoDate()]
    if (!dayMap) return []

    return Object.values(dayMap)
        .map((item): ProjectItem | null => {
            const project = props.activeProjects.find((p) => p.id === item.project_id)
            if (!project) return null
            const category = props.projectCategories.find((pc) => pc.id == project.project_category_id)
            return { project, objectives: project.objectives ?? [], theme: category?.color_scheme, date }
        })
        .filter((item): item is ProjectItem => item != null)
}
</script>

<template>
    <div class="space-y-2">
        <div class="mb-12">
            <div class="space-y-1 mb-4">
                <h4 class="text-xl underline mt-4 mb-2">{{ getDateDisplayName(startDate) }}</h4>
                <template v-for="item in projectsForDay(startDate)" :key="item.project.id">
                    <EditableProjectItem
                        :project="item.project"
                        :objectives="item.objectives"
                        :theme="item.theme"
                        :editing="false"
                        :date="item.date"
                        @toggle="(id, complete) => emit('toggle', id, complete)"
                        @remove-project-on-day="emit('remove-project-on-day', item.project.id, item.date.isoDate())"
                    />
                </template>
            </div>
            <ProjectSelector
                :projects="availableProjectsForStartDay"
                :date="startDateYmd"
                @add-project="emit('add-project', $event)"
            />
        </div>
        <div class="bg-slate-700 rounded-md p-2 shadow-md">
            <div v-for="i in 6" :key="i" class="space-y-1 mb-4">
                <h4 class="text-xl underline">{{ getDateDisplayName(startDate.addDays(i)) }}</h4>
                <template v-for="item in projectsForDay(startDate.addDays(i))" :key="item.project.id">
                    <StaticProjectItem
                        :project="item.project"
                        :theme="item.theme"
                        @remove-project-on-day="emit('remove-project-on-day', item.project.id, item.date.isoDate())"
                    />
                </template>
            </div>
        </div>
    </div>
</template>
