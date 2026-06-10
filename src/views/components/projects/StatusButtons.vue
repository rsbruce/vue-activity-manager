<script setup lang="ts">
defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
    <div class="flex gap-2">
        <div @click="$emit('update:modelValue', 'active')" class="px-2 py-1 rounded-sm border-2 cursor-pointer text-black"
            :class="modelValue === 'active' ? 'bg-emerald-300 border-emerald-700' : 'bg-gray-200 border-gray-300'">Active</div>
        <div @click="$emit('update:modelValue', 'upcoming')" class="px-2 py-1 rounded-sm border-2 cursor-pointer text-black"
            :class="modelValue === 'upcoming' ? 'bg-orange-300 border-orange-700' : 'bg-gray-200 border-gray-300'">Upcoming</div>
        <div @click="$emit('update:modelValue', 'complete')" class="px-2 py-1 rounded-sm border-2 cursor-pointer text-black"
            :class="modelValue === 'complete' ? 'bg-sky-300 border-sky-700' : 'bg-gray-200 border-gray-300'">Complete</div>
    </div>
</template>
