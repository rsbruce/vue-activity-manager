<script setup lang="ts">
import { ref } from 'vue'

type ProjectOption = { id: string; name: string; theme: string | undefined }

const props = defineProps<{
    projects: ProjectOption[]
    date: string
}>()

const emit = defineEmits<{
    'add-project': [{ projectId: string; date: string }]
}>()

const editing = ref(false)

function addProject(projectId: string) {
    emit('add-project', { projectId, date: props.date })
    editing.value = false
}
</script>

<template>
    <button class="bg-sky-500 w-full rounded-md p-2 cursor-pointer" v-show="!editing" @click="editing = true">Add Project</button>
    <div v-show="editing" class="bg-white rounded-md p-2">
        <font-awesome-icon icon="xmark" class="text-red-600 text-lg cursor-pointer mb-2" @click="editing = false" />
        <div class="flex flex-wrap gap-2">
            <template v-for="project in projects" :key="project.id">
                <button class="bg-main border-2 border-dark rounded-md px-2 py-1 text-black cursor-pointer" :data-model-theme="project.theme" @click="addProject(project.id)">
                    {{ project.name }}
                </button>
            </template>
        </div>
    </div>
</template>
