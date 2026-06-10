<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
    to: string
    name: string
    completedAt: number | null
    incompleteTasks?: number
    totalTasks?: number
    childLabel?: string
    hasDescription?: boolean
}>()

const emit = defineEmits<{ toggle: [nowComplete: boolean] }>()

const isComplete = ref(props.completedAt !== null)

watch(() => props.completedAt, (val) => { isComplete.value = val !== null })

const toggle = () => {
    isComplete.value = !isComplete.value
    emit('toggle', isComplete.value)
}
</script>

<template>
    <div class="flex gap-2 items-center pb-1 pt-0.5 border-b border-gray-500">
        <input
            type="checkbox"
            class="min-w-5 h-5 flex-none cursor-pointer"
            :checked="isComplete"
            :disabled="(incompleteTasks ?? 0) > 0"
            @click="toggle"
        />
        <RouterLink :to="to" class="font-semibold truncate min-w-12">{{ name }}
        <font-awesome-icon v-if="hasDescription" icon="file-lines" class="flex-none text-gray-700 text-sm" />
        </RouterLink>
        <span v-if="completedAt" class="flex-1 text-right text-xs text-gray-500 whitespace-nowrap">
            {{ new Date(completedAt * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric' }) }}
        </span>
        <span v-else-if="childLabel && (totalTasks ?? 0) > 0" class="flex-1 text-right text-sm whitespace-nowrap text-gray-500">
            {{ (totalTasks ?? 0) - (incompleteTasks ?? 0) }}/{{ totalTasks }} {{ childLabel }}
        </span>
    </div>
</template>
