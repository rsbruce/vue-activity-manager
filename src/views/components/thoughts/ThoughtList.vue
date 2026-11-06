<script setup lang="ts">
import type { Thought } from '@/data/thoughts'
import ThoughtCard from './ThoughtCard.vue'

// The thread itself: cards oldest-first, joined by thin white connector lines.
defineProps<{ thoughts: Thought[] }>()
const emit = defineEmits<{
    update: [id: string, input: { title: string | null; body: string }]
    delete: [id: string]
}>()
</script>

<template>
    <div v-if="thoughts.length">
        <template v-for="(thought, i) in thoughts" :key="thought.id">
            <div v-if="i > 0" class="w-px h-8 mx-auto bg-white" aria-hidden="true"></div>
            <ThoughtCard
                :thought="thought"
                @save="(input) => emit('update', thought.id, input)"
                @delete="emit('delete', thought.id)"
            />
        </template>
    </div>
    <p v-else class="italic text-gray-400">No thoughts yet.</p>
</template>
