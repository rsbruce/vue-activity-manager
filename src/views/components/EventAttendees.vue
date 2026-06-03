<script setup lang="ts">
import type { Person } from '@/types/people'
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
    people: {
        type: Array as () => Person[],
        required: true,
    },
    attendeeIds: {
        type: Array as () => string[],
        required: true
    }
})

const emit = defineEmits<{
    'update:attendeeIds': [string[]]
}>()

const selectedPersonId = ref<string | null>(null)

const addedPeople = computed(() =>
    [...props.people]
        .filter(p => props.attendeeIds.includes(p.id))
        .sort((a, b) =>
            `${a.firstname} ${a.lastname || ''}`.localeCompare(`${b.firstname} ${b.lastname || ''}`)
        )
)

const mostSeen = computed(() =>
    [...props.people]
        .filter(p => p.events_count && p.events_count > 0)
        .filter(p => !props.attendeeIds.includes(p.id))
        .sort((a, b) => (b.events_count ?? 0) - (a.events_count ?? 0))
        .slice(0, 10)
)

const availablePeople = computed(() =>
    [...props.people]
        .filter(p => !props.attendeeIds.includes(p.id))
        .filter(p => !mostSeen.value.map(p => p.id).includes(p.id))
        .sort((a, b) =>
            `${a.firstname} ${a.lastname || ''}`.localeCompare(`${b.firstname} ${b.lastname || ''}`)
        )
)

const addPerson = async () => {
    if (!selectedPersonId.value) return
    const personId = selectedPersonId.value
    selectedPersonId.value = null
    await nextTick()
    props.attendeeIds.push(personId)
    emit('update:attendeeIds', [...props.attendeeIds])
}

const removeMember = (personId: string) => {
    props.attendeeIds.splice(props.attendeeIds.indexOf(personId), 1)
    emit('update:attendeeIds', [...props.attendeeIds])
}

watch(selectedPersonId, addPerson)
</script>

<template>
    <div class="p-2 rounded-md bg-gray-300 shadow-md max-w-96 text-black">
        <div v-if="availablePeople.length" class="flex gap-1 mb-4">
            <label>
                <div>Add person</div>
                <select class="bg-white border border-black rounded-md flex-grow" v-model="selectedPersonId">
                    <option :value="null" disabled>Select person</option>
                    <optgroup label="Most seen people">
                        <option v-for="person in mostSeen" :value="person.id" :key="person.id">
                            {{ person.firstname }} {{ person.lastname || '' }}
                        </option>
                    </optgroup>
                    <optgroup label="Everybody else">
                        <option v-for="person in availablePeople" :value="person.id" :key="person.id">
                            {{ person.firstname }} {{ person.lastname || '' }}
                        </option>
                    </optgroup>
                </select>
            </label>
        </div>

        <h4 class="border-b border-gray-500">Attendees</h4>

        <div v-if="addedPeople.length" class="space-y-1">
            <div v-for="person in addedPeople" :key="person.id" class="flex gap-2 items-center text-sm">
                <span>{{ person.firstname }} {{ person.lastname || '' }}</span>
                <button type="button" @click="removeMember(person.id)" class="text-red-500 text-xs cursor-pointer">remove</button>
            </div>
        </div>
    </div>
</template>
