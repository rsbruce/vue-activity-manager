<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import EventAttendees from '../EventAttendees.vue'
import EventDateTimeInputs from '../EventDateTimeInputs.vue'
import type { Person } from '@/types/people'
import type { Project } from '@/types/projects'
import type { TimetableProjectCategories, TimetableModalInitial } from '@/types/events'
import { createEvent, updateEvent } from '@/data/events'
import { softDelete } from '@/data/utils'

const props = defineProps<{
    open: boolean
    people: Person[]
    projectCategories: TimetableProjectCategories
    activeProjects: Project[]
    initial: TimetableModalInitial | null
}>()

const emit = defineEmits<{
    'update:open': [boolean]
    'saved': []
    'deleted': []
}>()

// ── Form state ────────────────────────────────────────────────────────
const itemType = ref<'event' | 'work' | null>(null)
const modelId = ref<string | null>(null)
const modelName = ref<string>('')
const selectingProject = ref(false)
const formProjectCategoryId = ref<string | null>(null)
const formProjectId = ref<string | null>(null)
const formColorScheme = ref<string | null>(null)
const formStartDatetime = ref('')
const formEndDatetime = ref('')
const formAttendeeIds = ref<string[]>([])
const deleting = ref(false)

// Initialise from `initial` each time the modal opens.
watch(() => props.open, (isOpen) => {
    if (!isOpen) return
    const init = props.initial
    modelId.value = init?.eventId ?? null
    modelName.value = init?.name ?? ''
    formStartDatetime.value = init?.startDatetime ?? ''
    formEndDatetime.value = init?.endDatetime ?? ''
    formAttendeeIds.value = [...(init?.attendeeIds ?? [])]
    selectingProject.value = false
    deleting.value = false
    formProjectCategoryId.value = null
    formColorScheme.value = null
    formProjectId.value = init?.projectId ?? null
    // Populate directly rather than leaning on the watcher — reopening the same
    // project leaves formProjectId unchanged, so the watcher wouldn't fire.
    fillFromProject(formProjectId.value)
    itemType.value = init?.itemType ?? null
})

// Locate a project's category to fill colour/name.
function fillFromProject(pid: string | null) {
    if (!pid) return
    for (const cat of Object.values(props.projectCategories)) {
        const project = cat.projects[pid]
        if (project) {
            formProjectCategoryId.value = String(cat.id)
            formColorScheme.value = cat.color_scheme
            modelName.value = project.name
            return
        }
    }
}

// When a project is chosen interactively (project selector), fill colour/name.
watch(formProjectId, (pid) => fillFromProject(pid))

const formProjectOptions = computed(() => {
    const id = formProjectCategoryId.value
    if (!id || !props.projectCategories[id]) return {}
    return props.projectCategories[id]!.projects
})

const sortedActiveProjects = computed(() =>
    [...props.activeProjects].sort((a, b) => {
        const orderOf = (p: Project) => (p.project_category_id ? props.projectCategories[p.project_category_id]?.order ?? 0 : 0)
        return orderOf(a) - orderOf(b)
    })
)

// ── Date / time handling ──────────────────────────────────────────────
const dateOf = (dt: string) => dt.slice(0, 10)
const timeOf = (dt: string) => dt.slice(11, 16)
const combine = (date: string, time: string) => (date && time ? `${date}T${time}` : '')
const addDay = (d: string) => {
    const parts = d.split('-')
    return new Date(Date.UTC(+parts[0]!, +parts[1]! - 1, +parts[2]! + 1)).toISOString().slice(0, 10)
}

const startTime = computed(() => timeOf(formStartDatetime.value))
const endTime = computed(() => timeOf(formEndDatetime.value))
const isNextDay = computed(() => dateOf(formEndDatetime.value) !== dateOf(formStartDatetime.value))
const isSameTime = computed(() => !!startTime.value && !!endTime.value && endTime.value === startTime.value)
const isEndBeforeStart = computed(() => !isNextDay.value && !!startTime.value && !!endTime.value && endTime.value < startTime.value)
const isTimeInvalid = computed(() => isSameTime.value || isEndBeforeStart.value)

function onDateChange(d: string) {
    formStartDatetime.value = combine(d, startTime.value)
    if (endTime.value) formEndDatetime.value = combine(isNextDay.value ? addDay(d) : d, endTime.value)
}
function onStartTimeChange(st: string) {
    const d = dateOf(formStartDatetime.value)
    formStartDatetime.value = combine(d, st)
    if (endTime.value) formEndDatetime.value = combine(isNextDay.value ? addDay(d) : d, endTime.value)
}
function onEndTimeChange(et: string) {
    const d = dateOf(formStartDatetime.value)
    formEndDatetime.value = combine(isNextDay.value ? addDay(d) : d, et)
}
function onNextDayChange(val: boolean) {
    const d = dateOf(formStartDatetime.value)
    let et = endTime.value
    if (val && et > '05:00') et = '05:00'
    formEndDatetime.value = combine(val ? addDay(d) : d, et)
}

// ── Type selection ────────────────────────────────────────────────────
function newEvent() {
    itemType.value = 'event'
    modelName.value = ''
}
function newWork(projectId: string) {
    itemType.value = 'work'
    formProjectId.value = projectId // watcher fills category/colour/name
}

// ── Persistence ───────────────────────────────────────────────────────
function close() {
    emit('update:open', false)
}

async function save() {
    if (isTimeInvalid.value) return

    const isEvent = itemType.value === 'event'
    const projectId = isEvent ? null : formProjectId.value
    const attendeeIds = isEvent ? formAttendeeIds.value : []

    if (modelId.value) {
        await updateEvent(
            modelId.value,
            {
                name: modelName.value,
                project_id: projectId,
                start_datetime: formStartDatetime.value,
                end_datetime: formEndDatetime.value,
            },
            isEvent ? attendeeIds : undefined,
        )
    } else {
        await createEvent({
            name: modelName.value,
            project_id: projectId ?? undefined,
            start_datetime: formStartDatetime.value,
            end_datetime: formEndDatetime.value,
            person_ids: attendeeIds,
        })
    }

    emit('saved')
    close()
}

async function remove() {
    if (!modelId.value) return
    await softDelete(modelId.value, 'events')
    emit('deleted')
    close()
}
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="fixed w-full h-full bg-gray-700/80 z-40 top-0 left-0 text-black" @click.self="close">
            <div class="h-full max-w-5xl mx-auto my-6 flex justify-center items-center" @click.self="close">
                <div class="z-40 px-1 w-fit" @click.stop>

                    <!-- Item type selection -->
                    <div v-if="itemType === null" class="bg-white rounded-md px-2 py-2 space-y-3 w-96">
                        <div class="flex justify-between">
                            <h2 class="text-xl">New</h2>
                            <button
                                v-if="selectingProject"
                                class="ml-auto bg-sky-300 px-2 rounded-md border-2 border-black cursor-pointer"
                                @click="selectingProject = false"
                            >Back</button>
                        </div>
                        <div v-if="!selectingProject" class="space-y-2">
                            <div class="p-4 cursor-pointer text-center rounded-md shadow-md bg-slate-100" @click="newEvent">Event</div>
                            <div class="p-4 cursor-pointer text-center rounded-md shadow-md bg-main" data-model-theme="amber" @click="selectingProject = true">Work</div>
                        </div>
                        <div v-else class="flex flex-wrap gap-2">
                            <div
                                v-for="project in sortedActiveProjects"
                                :key="project.id"
                                class="w-fit bg-main px-2 py-1 rounded-lg border-2 border-dark cursor-pointer"
                                :data-model-theme="project.color_scheme ?? 'gray'"
                                @click="newWork(project.id)"
                            >
                                {{ project.name }}
                            </div>
                            <p v-if="!sortedActiveProjects.length" class="text-gray-500">No active projects.</p>
                        </div>
                    </div>

                    <!-- Event modal -->
                    <div v-else-if="itemType === 'event'" class="bg-slate-100 rounded-md px-2 py-1 space-y-3 max-w-sm">
                        <div class="flex justify-between">
                            <h2 class="text-xl">
                                <RouterLink v-if="modelId" :to="`/events/${modelId}`" class="text-gray-700 hover:text-gray-900">{{ modelName }}</RouterLink>
                                <span v-else>New Event</span>
                            </h2>
                            <button class="bg-sky-300 px-2 rounded-md border-2 border-black cursor-pointer" @click="itemType = null">New</button>
                        </div>
                        <div class="space-y-1">
                            <div class="flex justify-between flex-wrap">
                                <div class="flex flex-wrap gap-2">
                                    <label>
                                        <p>Event name</p>
                                        <input v-model="modelName" class="border border-black rounded-md min-w-24" />
                                    </label>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <EventDateTimeInputs
                                        :date="dateOf(formStartDatetime)"
                                        :startTime="startTime"
                                        :endTime="endTime"
                                        :nextDay="isNextDay"
                                        @update:date="onDateChange"
                                        @update:startTime="onStartTimeChange"
                                        @update:endTime="onEndTimeChange"
                                        @update:nextDay="onNextDayChange"
                                    />
                                </div>
                            </div>
                            <EventAttendees
                                :people="people"
                                :attendee-ids="formAttendeeIds"
                                @update:attendeeIds="formAttendeeIds = $event"
                            />
                            <div class="flex justify-end gap-2">
                                <div v-if="modelId" class="space-x-1">
                                    <button v-if="!deleting" class="bg-red-500 text-white px-2 py-1 rounded-md border-2 border-black w-full cursor-pointer" @click="deleting = true">Delete</button>
                                    <div v-else class="flex gap-2">
                                        <button class="w-1/2 bg-gray-200 rounded-md border-2 border-black px-2 py-1 cursor-pointer" @click="deleting = false">Cancel</button>
                                        <button class="w-1/2 bg-red-500 text-white rounded-md border-2 border-black px-2 py-1 cursor-pointer" @click="remove">Confirm</button>
                                    </div>
                                </div>
                                <button v-if="!deleting" :disabled="isTimeInvalid" class="bg-sky-300 px-2 py-1 rounded-md border-2 border-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" @click="save">
                                    {{ modelId ? 'Update' : 'Create' }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Work modal -->
                    <div
                        v-else
                        class="bg-main rounded-md px-2 py-1 space-y-3 max-w-sm"
                        :data-model-theme="formColorScheme ?? 'gray'"
                    >
                        <div class="flex justify-between">
                            <h2 class="text-xl">{{ modelName || 'New Work' }}</h2>
                            <button class="bg-sky-300 px-2 rounded-md border-2 border-black cursor-pointer" @click="itemType = null">New</button>
                        </div>
                        <div class="space-y-1">
                            <div class="flex justify-between flex-wrap">
                                <div class="flex flex-wrap gap-2">
                                    <label>
                                        <p>Project area</p>
                                        <select
                                            :value="formProjectCategoryId ?? ''"
                                            @change="formProjectCategoryId = ($event.target as HTMLSelectElement).value || null"
                                            class="border border-black rounded-md min-w-24"
                                        >
                                            <option value="">Select project area</option>
                                            <option v-for="cat in projectCategories" :key="cat.id" :value="String(cat.id)">{{ cat.name }}</option>
                                        </select>
                                    </label>
                                    <label v-if="formProjectCategoryId && projectCategories[formProjectCategoryId]">
                                        <p>Project</p>
                                        <select
                                            :value="formProjectId ?? ''"
                                            @change="formProjectId = ($event.target as HTMLSelectElement).value || null"
                                            class="border border-black rounded-md max-w-48"
                                        >
                                            <option value="">Select project</option>
                                            <option v-for="project in formProjectOptions" :key="project.id" :value="String(project.id)">{{ project.name }}</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <EventDateTimeInputs
                                        :date="dateOf(formStartDatetime)"
                                        :startTime="startTime"
                                        :endTime="endTime"
                                        :nextDay="isNextDay"
                                        @update:date="onDateChange"
                                        @update:startTime="onStartTimeChange"
                                        @update:endTime="onEndTimeChange"
                                        @update:nextDay="onNextDayChange"
                                    />
                                </div>
                            </div>
                            <div class="flex justify-end gap-2">
                                <div v-if="modelId" class="space-x-1">
                                    <button v-if="!deleting" class="bg-red-500 text-white px-2 py-1 rounded-md border-2 border-black w-full cursor-pointer" @click="deleting = true">Delete</button>
                                    <div v-else class="flex gap-2">
                                        <button class="w-1/2 bg-gray-200 rounded-md border-2 border-black px-2 py-1 cursor-pointer" @click="deleting = false">Cancel</button>
                                        <button class="w-1/2 bg-red-500 text-white rounded-md border-2 border-black px-2 py-1 cursor-pointer" @click="remove">Confirm</button>
                                    </div>
                                </div>
                                <button v-if="!deleting" :disabled="isTimeInvalid || !formProjectId" class="bg-sky-300 px-2 py-1 rounded-md border-2 border-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" @click="save">
                                    {{ modelId ? 'Update' : 'Create' }}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </Teleport>
</template>
