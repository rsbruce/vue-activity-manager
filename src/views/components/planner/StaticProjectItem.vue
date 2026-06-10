<script lang="ts" setup>
import { ref } from 'vue'
import type { Project } from '@/types/projects'

defineProps<{
    project: Project
    theme: string | undefined
}>()

const emit = defineEmits<{
    'remove-project-on-day': []
}>()

const editing = ref(false)

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
    </div>
</template>
