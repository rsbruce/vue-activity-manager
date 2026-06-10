<script setup lang="ts">
defineProps<{
    completedAt: number | null
    completedClass?: string
}>()

defineEmits<{ toggle: [] }>()
</script>

<template>
    <label class="flex items-center cursor-pointer w-fit text-black" @click.prevent="$emit('toggle')">
        <div class="px-2 py-1 rounded-sm border-2 flex items-center"
            :class="completedAt ? (completedClass ?? 'bg-sky-300 border-sky-700') : 'bg-gray-300 border-gray-700'">
            <input type="checkbox" class="min-w-5 h-5 mr-2" :checked="!!completedAt" readonly />
            <span>Status:</span>&nbsp;<span class="font-semibold">{{ completedAt ? ' complete' : ' incomplete' }}</span>
        </div>
    </label>
</template>
