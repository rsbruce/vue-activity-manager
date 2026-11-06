<script setup lang="ts">
import { refreshCurrent } from '@/router/defineController'
import { createThought, updateThought, deleteThought, type Thought, type ThoughtEntity } from '@/data/thoughts'
import ThoughtList from './ThoughtList.vue'
import ThoughtComposer from './ThoughtComposer.vue'
import ThoughtThreadSidebar from './ThoughtThreadSidebar.vue'

// The Thought Thread on a show page: an inline section plus the slide-in sidebar,
// both reading the same thoughts (from the page's controller) and sharing CRUD.
// The page's CTA opens the sidebar via v-model:sidebar-open.
const props = defineProps<{
    entity: ThoughtEntity
    entityId: string
    entityName: string
    thoughts: Thought[]
}>()
const sidebarOpen = defineModel<boolean>('sidebarOpen', { default: false })

async function onCreate(input: { title: string | null; body: string }) {
    await createThought(props.entity, props.entityId, input)
    await refreshCurrent()
}
async function onUpdate(id: string, input: { title: string | null; body: string }) {
    await updateThought(id, input)
    await refreshCurrent()
}
async function onDelete(id: string) {
    await deleteThought(id)
    await refreshCurrent()
}
</script>

<template>
    <section class="space-y-3">
        <h2 class="text-xl underline">Thought Thread</h2>
        <ThoughtList :thoughts="thoughts" @update="onUpdate" @delete="onDelete" />
        <div class="max-w-xl pt-2">
            <ThoughtComposer @submit="onCreate" />
        </div>
    </section>

    <ThoughtThreadSidebar
        v-model:open="sidebarOpen"
        :entity-name="entityName"
        :thoughts="thoughts"
        @create="onCreate"
        @update="onUpdate"
        @delete="onDelete"
    />
</template>
