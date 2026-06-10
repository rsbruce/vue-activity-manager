<script setup lang="ts">
import { marked } from 'marked'
import { computed } from 'vue'

const props = defineProps<{ description: string | null }>()

const rendered = computed(() =>
    props.description ? marked(props.description) as string : '',
)
</script>

<template>
    <div class="p-2 border border-white text-white rounded-lg">
        <div v-if="description" v-html="rendered" class="prose prose-invert"></div>
        <p v-else class="italic text-gray-400">No description.</p>
    </div>
</template>
