<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import type { Project, Objective } from '@/types/projects'
import CheckableItem from '../projects/CheckableItem.vue'

const props = defineProps<{
    project: Project
    objectives: Objective[]
    theme: string | undefined
    editing: boolean
    date: Date
}>()

const editing = ref(props.editing)

const localObjectives = ref<Objective[]>([...props.objectives].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))

watch(() => props.objectives, (newObjectives) => {
    if (!editing.value) {
        localObjectives.value = [...newObjectives].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }
})

const emit = defineEmits<{
    'toggle': [objectiveId: string, complete: boolean]
    'remove-project-on-day': []
}>()

const todayMidnight = new Date()
todayMidnight.setHours(0, 0, 0, 0)
const todayStartUnix = Math.floor(todayMidnight.getTime() / 1000)
const isToday = computed(() => props.date.isoDate() === todayMidnight.isoDate())

const readyObjectives = computed<Objective[]>(() => localObjectives.value.filter((o) => o.completed_at === null).slice(0, 4))
const completeObjectives = computed<Objective[]>(() => localObjectives.value.filter((o) => o.completed_at != null && o.completed_at > todayStartUnix))

function remove() {
    emit('remove-project-on-day')
    editing.value = false
}
</script>

<template>
    <div class="card" :data-model-theme="theme">
        <div class="flex justify-between mb-4 items-center">
            <RouterLink :to="`/projects/${project.id}`"><h3 class="text-lg text-black underline">{{ project.name }}</h3></RouterLink>
            <div>
                <div class="flex gap-2 text-sm">
                    <button v-if="!editing" class="border border-black bg-white text-black px-1 rounded-md cursor-pointer" @click="editing = true">Edit</button>
                    <button v-if="editing" class="border border-black bg-red-500 text-black px-1 rounded-md cursor-pointer" @click="remove">Delete</button>
                    <button v-if="editing" class="border border-black bg-white text-black px-1 rounded-md cursor-pointer" @click="editing = false">Cancel</button>
                </div>
            </div>
        </div>
        <div class="space-y-1 divide-y">
            <CheckableItem
                v-for="objective in readyObjectives"
                :key="objective.id"
                :to="`/objectives/${objective.id}`"
                :name="objective.name"
                :completed-at="objective.completed_at ?? null"
                :incomplete-tasks="(objective.tasks ?? []).filter((t) => !t.completed_at).length"
                :total-tasks="(objective.tasks ?? []).length"
                child-label="tasks"
                @toggle="(nowComplete) => emit('toggle', objective.id, nowComplete)"
            />
            <template v-if="isToday">
                <CheckableItem
                    v-for="objective in completeObjectives"
                    :key="objective.id"
                    :to="`/objectives/${objective.id}`"
                    :name="objective.name"
                    :completed-at="objective.completed_at ?? null"
                    :incomplete-tasks="(objective.tasks ?? []).filter((t) => !t.completed_at).length"
                    :total-tasks="(objective.tasks ?? []).length"
                    child-label="tasks"
                    @toggle="(nowComplete) => emit('toggle', objective.id, nowComplete)"
                />
            </template>
        </div>
    </div>
</template>
