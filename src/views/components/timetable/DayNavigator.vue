<script lang="ts" setup>
const emit = defineEmits<{
    'week-before': []
    'day-before': []
    'today': []
    'day-after': []
    'week-after': []
}>()
</script>

<template>
    <div class="grid grid-cols-5 gap-1">
        <button class="rounded-md p-1 text-center bg-emerald-600 text-white font-bold cursor-pointer" @click="emit('week-before')">
            <span class="flex items-center justify-center gap-1"><font-awesome-icon icon="arrow-left" /> 7</span>
        </button>
        <button class="rounded-md p-1 text-center bg-emerald-600 text-white font-bold cursor-pointer" @click="emit('day-before')">
            <span class="flex items-center justify-center"><font-awesome-icon icon="arrow-left" /></span>
        </button>
        <button class="rounded-md p-1 text-center bg-gray-200 font-bold text-black cursor-pointer" @click="emit('today')">Today</button>
        <button class="rounded-md p-1 text-center bg-emerald-600 text-white font-bold cursor-pointer" @click="emit('day-after')">
            <span class="flex items-center justify-center"><font-awesome-icon icon="arrow-right" /></span>
        </button>
        <button class="rounded-md p-1 text-center bg-emerald-600 text-white font-bold cursor-pointer" @click="emit('week-after')">
            <span class="flex items-center justify-center gap-1">7 <font-awesome-icon icon="arrow-right" /></span>
        </button>
    </div>
</template>
