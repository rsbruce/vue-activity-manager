<script setup lang="ts">
import type { Event } from '@/types/events';
import type { Person } from '@/types/people';
import { computed, reactive, ref, watch } from 'vue';
import EventsTable from '../components/EventsTable.vue';
import EventDateTimeInputs from '../components/EventDateTimeInputs.vue';
import { createEvent } from '@/data/events.ts';
import { refreshCurrent } from '@/router/defineController.ts';

const props = defineProps({
    events: {
        type: Array as () => Event[],
        required: true,
    },
    people: {
        type: Array as () => Person[],
        required: true,
    },
})

const form = reactive({
    name: '',
    start_datetime: '',
    end_datetime: '',
    person_ids: [] as string[],
})

const errors = reactive<{name?: string}>({})
const submitting = ref(false)

const date = ref('')
const startTime = ref('')
const endTime = ref('')

const isNextDay = ref(false)

const addDay = (d: string) => {
    const parts = d.split('-')
    return new Date(Date.UTC(+parts[0]!, +parts[1]! - 1, +parts[2]! + 1)).toISOString().slice(0, 10)
}

const isSameTime = computed(() => !!startTime.value && !!endTime.value && endTime.value === startTime.value)
const isEndBeforeStart = computed(() => !isNextDay.value && !!startTime.value && !!endTime.value && endTime.value < startTime.value)
const isTimeInvalid = computed(() => isSameTime.value || isEndBeforeStart.value)

watch([date, startTime, endTime, isNextDay], ([d, st, et, nd]) => {
    form.start_datetime = d && st ? `${d}T${st}` : ''
    form.end_datetime = d && et ? `${nd ? addDay(d) : d}T${et}` : ''
})

const onNextDayChange = (val: boolean) => {
    isNextDay.value = val
    if (val && endTime.value > '05:00') endTime.value = '05:00'
}

async function submit() {
    if (isTimeInvalid.value){
        return
    }

    errors.name = form.name.trim() ? undefined : 'Name is required'
    if(errors.name) {
        return
    }

    submitting.value = true
    try {
        await createEvent({
            ...form
        })
        form.name = ''
        date.value = ''
        startTime.value = ''
        endTime.value = ''
        isNextDay.value = false
        
        await refreshCurrent()
    } finally {
        submitting.value = false
    }


}

const sortedPeople = computed(() =>
    [...props.people].sort((a, b) =>
        `${a.firstname} ${a.lastname || ''}`.localeCompare(`${b.firstname} ${b.lastname || ''}`)
    )
)

const selectedPersonId = ref<string | null>(null)

const addedPeople = computed(() =>
    sortedPeople.value.filter(p => form.person_ids.includes(p.id))
)

const availablePeople = computed(() =>
    sortedPeople.value.filter(p => !form.person_ids.includes(p.id))
)

const addMember = () => {
    if (!selectedPersonId.value) return
    form.person_ids.push(selectedPersonId.value)
    selectedPersonId.value = null
}

const removeMember = (personId: string) => {
    form.person_ids.splice(form.person_ids.indexOf(personId), 1)
}

const todayMidnight = new Date()
todayMidnight.setHours(0, 0, 0, 0)

const futureEvents = computed(() =>
    props.events.filter(e => e.start_datetime && new Date(e.start_datetime) >= todayMidnight)
)

const pastEvents = computed(() =>
    props.events.filter(e => !e.start_datetime || new Date(e.start_datetime) < todayMidnight)
)
</script>

<template>
    <div class="py-6 space-y-6">
        <h2 class="text-xl underline">New Event</h2>
        <div class="p-2 rounded-md bg-gray-300 shadow-md w-72 text-black">
            <form @submit.prevent="submit" class="flex flex-col gap-2">
                <label>
                    <div>Name</div>
                    <input class="bg-white border border-black rounded-md w-full" type="text" v-model="form.name" />
                    <small>{{ errors.name }}</small>
                </label>
                <EventDateTimeInputs v-model:date="date" v-model:startTime="startTime" v-model:endTime="endTime" :nextDay="isNextDay" @update:nextDay="onNextDayChange" />
                <button type="submit" :disabled="isTimeInvalid || submitting" class="bg-sky-500 text-white rounded-md border-2 border-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Create</button>
            </form>

            <div v-if="availablePeople.length" class="flex gap-1 mt-2">
                <select class="bg-white border border-black rounded-md flex-grow" v-model="selectedPersonId">
                    <option :value="null" disabled>Select person</option>
                    <option v-for="person in availablePeople" :value="person.id" :key="person.id">
                        {{ person.firstname }} {{ person.lastname || '' }}
                    </option>
                </select>
                <button type="button" :disabled="submitting" @click="addMember" class="bg-sky-500 text-white px-2 rounded-md border border-black cursor-pointer">Add</button>
            </div>

            <div v-if="addedPeople.length" class="mt-2 space-y-1">
                <div v-for="person in addedPeople" :key="person.id" class="flex gap-2 items-center text-sm">
                    <span>{{ person.firstname }} {{ person.lastname || '' }}</span>
                    <button type="button" :disabled="submitting" @click="removeMember(person.id)" class="text-red-500 text-xs cursor-pointer">remove</button>
                </div>
            </div>
        </div>

        <div class="space-y-2">
            <h2 class="text-xl underline">Upcoming</h2>
            <EventsTable :events="futureEvents" />
        </div>

        <div class="space-y-2">
            <h2 class="text-xl underline">Past</h2>
            <EventsTable :events="pastEvents" />
        </div>
    </div>
</template>
