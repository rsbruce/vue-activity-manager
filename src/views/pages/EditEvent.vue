<script setup lang="ts">
import type { Event } from '@/types/events';
import type { Person } from '@/types/people';
import { computed, ref, watch, reactive } from 'vue';
import EventAttendees from '../components/EventAttendees.vue';
import EventDateTimeInputs from '../components/EventDateTimeInputs.vue';
import DeleteRestoreButton from '../components/DeleteRestoreButton.vue';
import { softDelete } from '@/data/utils.ts';
import { updateAttendees, updateEvent } from '@/data/events.ts';
import { useRouter } from 'vue-router';

const props = defineProps({
    event: {
        type: Object as () => Event,
        required: true,
    },
    people: {
        type: Array as () => Person[],
        required: true,
    },
})

const router = useRouter()

const formatForInput = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.isoDate()}T${date.isoTime()}`
}

const fmtStart = formatForInput(props.event.start_datetime)
const fmtEnd = formatForInput(props.event.end_datetime)

const date = ref(fmtStart.slice(0, 10))
const startTime = ref(fmtStart.slice(11, 16))
const endTime = ref(fmtEnd.slice(11, 16))

const form = reactive({
    name: props.event.name,
    start_datetime: fmtStart,
    end_datetime: fmtEnd,
    project_id: props.event.project_id || null,
    attendee_ids: (props.event.people || []).map((p: Person) => p.id),
})

const attendeeIds = ref((props.event.people || []).map((p: Person) => p.id))

const isNextDay = ref(fmtEnd.slice(0, 10) > fmtStart.slice(0, 10))

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

const submit = async () => {
    const formCopy: Record<string, unknown> = {...form}

    await updateEvent(props.event.id, {...formCopy}, form.attendee_ids)
    await router.push('/events')
}

const trash = async () => {
    await softDelete(props.event.id, 'events')
    await router.push('/events')
}

watch(attendeeIds, (value) => {
    form.attendee_ids = value  
    updateAttendees(props.event.id, value)
})
</script>

<template>
    <div class="py-6 space-y-4">
        <h2 class="text-xl underline">Edit Event: {{ event.name }}</h2>
        <div class="space-y-2">
            <div class="p-2 rounded-md bg-gray-300 shadow-md max-w-96 text-black">
                <form @submit.prevent="submit" class="flex flex-col gap-2">
                    <label>
                        <div>Name</div>
                        <input class="bg-white border border-black rounded-md w-full" type="text" v-model="form.name" />
                    </label>
                    <EventDateTimeInputs v-model:date="date" v-model:startTime="startTime" v-model:endTime="endTime" :nextDay="isNextDay" @update:nextDay="onNextDayChange" />
                    <button type="submit" :disabled="isTimeInvalid" class="bg-sky-500 text-white rounded-md border-2 border-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Update</button>
                </form>
                <DeleteRestoreButton :deleted-at="event.deleted_at" class="mt-2" @trash="trash" />
            </div>
            <EventAttendees :people="people" :attendee-ids="attendeeIds" @update:attendeeIds="ids => attendeeIds = ids"/>
        </div>

    </div>
</template>
