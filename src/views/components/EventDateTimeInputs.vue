<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    date: string
    startTime: string
    endTime: string
    nextDay: boolean
}>()

const emit = defineEmits<{
    'update:date': [string]
    'update:startTime': [string]
    'update:endTime': [string]
    'update:nextDay': [boolean]
}>()

const isSameTime = computed(() =>
    !!props.startTime && !!props.endTime && props.endTime === props.startTime
)
const isEndBeforeStart = computed(() =>
    !props.nextDay && !!props.startTime && !!props.endTime && props.endTime < props.startTime
)
</script>

<template>
    <label>
        <p>Date</p>
        <input
            type="date"
            :value="date"
            @change="emit('update:date', ($event.target as HTMLInputElement).value)"
            class="bg-white border border-black rounded-md"
        />
    </label>
    <label>
        <p>Start time</p>
        <input
            type="time"
            :value="startTime"
            @change="emit('update:startTime', ($event.target as HTMLInputElement).value)"
            step="300"
            class="bg-white border border-black rounded-md"
        />
    </label>
    <div>
        <div class="flex items-center gap-1">
            <span>End time</span>
            <span class="flex gap-1 ml-1">
                <button type="button" @click="emit('update:nextDay', false)"
                    :class="!nextDay ? 'bg-sky-500 text-white' : 'bg-white text-gray-600'"
                    class="text-xs px-1.5 py-0.5 rounded border border-black leading-none cursor-pointer">
                    Same day
                </button>
                <button type="button" @click="emit('update:nextDay', true)"
                    :class="nextDay ? 'bg-sky-500 text-white' : 'bg-white text-gray-600'"
                    class="text-xs px-1.5 py-0.5 rounded border border-black leading-none cursor-pointer">
                    Next day
                </button>
            </span>
        </div>
        <input
            type="time"
            :value="endTime"
            @change="emit('update:endTime', ($event.target as HTMLInputElement).value)"
            step="300"
            :max="nextDay ? '05:00' : undefined"
            class="bg-white border border-black rounded-md"
        />
        <p v-if="isSameTime" class="text-red-500 text-sm mt-1">Start and end times cannot be the same</p>
        <p v-if="isEndBeforeStart" class="text-red-500 text-sm mt-1">End time cannot be before start time</p>
    </div>
</template>
