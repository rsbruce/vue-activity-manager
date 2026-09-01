<script setup lang="ts">
import { computed } from 'vue'
import '@/utils/dateExtensions'

const props = defineProps<{
    completedAt: number | null
    completedClass?: string
    editable?: boolean
}>()

const emit = defineEmits<{ toggle: []; setCompletedAt: [seconds: number] }>()

// completed_at (unixepoch seconds) <-> the datetime-local input's "YYYY-MM-DDTHH:mm"
// local wall-clock string.
const completedAtLocal = computed(() =>
    props.completedAt ? new Date(props.completedAt * 1000).isoDateTime() : '',
)

function onDatetime(e: Event) {
    const value = (e.target as HTMLInputElement).value
    if (!value) return
    emit('setCompletedAt', Math.floor(new Date(value).getTime() / 1000))
}
</script>

<template>
    <div class="space-y-1 text-black">
        <label class="flex items-center cursor-pointer w-fit" @click.prevent="emit('toggle')">
            <div class="px-2 py-1 rounded-sm border-2 flex items-center"
                :class="completedAt ? (completedClass ?? 'bg-sky-300 border-sky-700') : 'bg-gray-300 border-gray-700'">
                <input type="checkbox" class="min-w-5 h-5 mr-2" :checked="!!completedAt" readonly />
                <span>Status:</span>&nbsp;<span class="font-semibold">{{ completedAt ? ' complete' : ' incomplete' }}</span>
            </div>
        </label>
        <label v-if="completedAt && editable" class="mt-2 block">
            <div class="text-white">Completed at</div>
            <input
                type="datetime-local"
                class="p-0.5 border rounded-md bg-white text-black"
                :value="completedAtLocal"
                @change="onDatetime"
            />
        </label>
    </div>
</template>
