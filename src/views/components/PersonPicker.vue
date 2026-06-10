<script setup lang="ts">
import type { Person } from '@/types/people'
import { computed, ref } from 'vue'

const props = defineProps({
    people: {
        type: Array as () => Person[],
        required: true,
    },
    excludeIds: {
        type: Array as () => string[],
        required: true,
    },
})

const emit = defineEmits<{
    select: [string]
}>()

const selectedPersonId = ref<string | null>(null)

const availablePeople = computed(() =>
    [...props.people]
        .filter((p) => !props.excludeIds.includes(p.id))
        .sort((a, b) =>
            `${a.firstname} ${a.lastname || ''}`.localeCompare(`${b.firstname} ${b.lastname || ''}`)
        )
)

const add = () => {
    if (!selectedPersonId.value) return
    emit('select', selectedPersonId.value)
    selectedPersonId.value = null
}
</script>

<template>
    <div v-if="availablePeople.length" class="p-2 rounded-md bg-gray-300 shadow-md w-72 text-black">
        <div class="flex gap-1">
            <select class="bg-white border border-black rounded-md flex-grow" v-model="selectedPersonId">
                <option :value="null" disabled>Select person</option>
                <option v-for="person in availablePeople" :value="person.id" :key="person.id">
                    {{ person.firstname }} {{ person.lastname || '' }}
                </option>
            </select>
            <button type="button" @click="add" class="bg-sky-500 text-white px-2 rounded-md border border-black cursor-pointer">Add</button>
        </div>
    </div>
</template>
