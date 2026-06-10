<script lang="ts" setup>
import { ref } from 'vue'
import type { Objective } from '@/types/projects'
import CheckableItem from '../projects/CheckableItem.vue'

defineProps<{
    theme: string
    projectName: string
    objectives: Objective[]
}>()

const emit = defineEmits<{
    toggle: [objectiveId: string, complete: boolean]
    'add-objective': [string]
}>()

const name = ref('')
function add() {
    if (!name.value.trim()) return
    emit('add-objective', name.value.trim())
    name.value = ''
}
</script>

<template>
    <div class="bg-main p-2 rounded-md space-y-2" :data-model-theme="theme">
        <h3 class="underline text-xl text-black">{{ projectName }}</h3>
        <form @submit.prevent="add">
            <div class="flex gap-2">
                <input type="text" class="bg-white rounded-md flex-grow border border-black text-black px-1" v-model="name" />
                <button type="submit" class="bg-black px-2 rounded-md text-white cursor-pointer">Add</button>
            </div>
        </form>
        <div>
            <div class="space-y-1 text-black">
                <CheckableItem
                    v-for="objective in objectives.filter((o) => o.completed_at === null)"
                    :key="objective.id"
                    :to="`/objectives/${objective.id}`"
                    :name="objective.name"
                    :completed-at="null"
                    :incomplete-tasks="(objective.tasks ?? []).filter((t) => !t.completed_at).length"
                    :total-tasks="(objective.tasks ?? []).length"
                    child-label="tasks"
                    :has-description="objective.has_description"
                    @toggle="(nowComplete) => emit('toggle', objective.id, nowComplete)"
                />
            </div>
            <h4 class="text-lg underline text-black">Completed Today</h4>
            <div class="space-y-1 text-black">
                <CheckableItem
                    v-for="objective in objectives.filter((o) => o.completed_at)"
                    :key="objective.id"
                    :to="`/objectives/${objective.id}`"
                    :name="objective.name"
                    :completed-at="objective.completed_at ?? null"
                    @toggle="(nowComplete) => emit('toggle', objective.id, nowComplete)"
                />
            </div>
        </div>
    </div>
</template>
