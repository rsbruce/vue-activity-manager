<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type {
    TimetableData, CalendarData, HabitTable, TimetableEvent,
    TimetableModalInitial, TimetableProjectCategories,
} from '@/types/events'
import type { Person } from '@/types/people'
import type { Project } from '@/types/projects'
import { getTimetableWindow, getSummary } from '@/data/timetable'
import DayNavigator from '../components/timetable/DayNavigator.vue'
import TimetableGrid from '../components/timetable/TimetableGrid.vue'
import CalendarGrid from '../components/timetable/CalendarGrid.vue'
import HoursWorkedSummary from '../components/timetable/HoursWorkedSummary.vue'
import TimetableModal from '../components/timetable/TimetableModal.vue'

const props = defineProps<{
    timetable: TimetableData
    calendar: CalendarData
    habitTable: HabitTable
    eventsArr: Record<string, TimetableEvent>
    summaryTable: Record<string, Record<string, Record<string, number>>>
    summaryColorSchemes: Record<string, string>
    people: Person[]
    projectCategories: TimetableProjectCategories
    activeProjects: Project[]
    displayStart: string
    displayDays: number
    weeks: number
}>()

const view = ref<'timetable' | 'calendar' | 'summary'>('timetable')

// Local, navigable copies (re-queried locally instead of round-tripping a server).
const localDisplayStart = ref(new Date(props.displayStart))
const timetable = ref<TimetableData>(props.timetable)
const calendar = ref<CalendarData>(props.calendar)
const habitTable = ref<HabitTable>(props.habitTable)
const eventsArr = ref<Record<string, TimetableEvent>>(props.eventsArr)
const summaryTable = ref(props.summaryTable)
const summaryColorSchemes = ref(props.summaryColorSchemes)

// Resync if the controller reloads (e.g. on route re-entry).
watch(() => props.timetable, v => { timetable.value = v })
watch(() => props.calendar, v => { calendar.value = v })
watch(() => props.habitTable, v => { habitTable.value = v })
watch(() => props.eventsArr, v => { eventsArr.value = v })
watch(() => props.summaryTable, v => { summaryTable.value = v })
watch(() => props.summaryColorSchemes, v => { summaryColorSchemes.value = v })
watch(() => props.displayStart, v => { localDisplayStart.value = new Date(v) })

async function loadWindow() {
    const start = localDisplayStart.value
    const win = await getTimetableWindow(start.addDays(-7).isoDate(), start.addDays(35).isoDate())
    timetable.value = win.timetable
    calendar.value = win.calendar
    habitTable.value = win.habitTable
    eventsArr.value = win.eventsArr
}

async function loadSummary() {
    const summary = await getSummary()
    summaryTable.value = summary.summaryTable
    summaryColorSchemes.value = summary.summaryColorSchemes
}

async function navigate(offsetDays: number) {
    localDisplayStart.value = localDisplayStart.value.addDays(offsetDays)
    await loadWindow()
}

async function toToday() {
    const d = new Date()
    d.setHours(5, 0, 0, 0)
    localDisplayStart.value = d
    await loadWindow()
}

// ── Modal ─────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const modalInitial = ref<TimetableModalInitial | null>(null)

const datetimeLocal = (d: Date) => `${d.isoDate()}T${d.isoTime()}`
// Normalise stored datetimes ('YYYY-MM-DD HH:MM:SS' or '...THH:MM') to the input format.
const toInput = (s: string) => `${s.slice(0, 10)}T${s.slice(11, 16)}`

function openModal(startDatetime: Date) {
    modalInitial.value = {
        eventId: null,
        itemType: null,
        name: '',
        projectId: null,
        startDatetime: datetimeLocal(startDatetime),
        endDatetime: datetimeLocal(startDatetime.addMinutes(60)),
        attendeeIds: [],
    }
    modalOpen.value = true
}

function openModalForItem(eventId: string) {
    const ev = eventsArr.value[eventId]
    if (!ev) return
    modalInitial.value = {
        eventId,
        itemType: ev.project_id ? 'work' : 'event',
        name: ev.name,
        projectId: ev.project_id,
        startDatetime: toInput(ev.start_datetime),
        endDatetime: toInput(ev.end_datetime),
        attendeeIds: [...ev.attendee_ids],
    }
    modalOpen.value = true
}

async function refresh() {
    await Promise.all([loadWindow(), loadSummary()])
}

const presentMoment = ref(new Date())
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(() => { presentMoment.value = new Date() }, 60000) })
onUnmounted(() => clearInterval(timer))
</script>

<template>
    <div class="py-2">
        <!-- View toggle -->
        <div class="grid grid-cols-3 gap-2 rounded-md bg-sky-100 p-1 mb-4 text-black">
            <button
                class="rounded-md p-2 text-center font-bold cursor-pointer"
                :class="view === 'timetable' ? 'bg-sky-500' : 'bg-sky-200'"
                @click="view = 'timetable'"
            >Timetable</button>
            <button
                class="rounded-md p-2 text-center font-bold cursor-pointer"
                :class="view === 'calendar' ? 'bg-sky-500' : 'bg-sky-200'"
                @click="view = 'calendar'"
            >Calendar</button>
            <button
                class="rounded-md p-2 text-center font-bold cursor-pointer"
                :class="view === 'summary' ? 'bg-sky-500' : 'bg-sky-200'"
                @click="view = 'summary'"
            >Summary</button>
        </div>

        <!-- Day navigator (hidden on summary) -->
        <div v-show="view !== 'summary'" class="sticky top-0 z-40 bg-slate-900 py-2">
            <DayNavigator
                @week-before="navigate(-7)"
                @day-before="navigate(-1)"
                @today="toToday"
                @day-after="navigate(1)"
                @week-after="navigate(7)"
            />
        </div>

        <TimetableGrid
            v-show="view === 'timetable'"
            :timetable="timetable"
            :calendar="calendar"
            :habit-table="habitTable"
            :display-start="localDisplayStart"
            :display-days="displayDays"
            :present-moment="presentMoment"
            @open-modal="openModal"
            @open-modal-for-item="(id) => openModalForItem(id)"
        />

        <CalendarGrid
            v-show="view === 'calendar'"
            :calendar="calendar"
            :display-start="localDisplayStart"
            :weeks="weeks"
            @open-modal="openModal"
            @open-modal-for-item="(id) => openModalForItem(id)"
        />

        <HoursWorkedSummary
            v-show="view === 'summary'"
            :table="summaryTable"
            :color-schemes="summaryColorSchemes"
        />

        <TimetableModal
            v-model:open="modalOpen"
            :people="people"
            :project-categories="projectCategories"
            :active-projects="activeProjects"
            :initial="modalInitial"
            @saved="refresh"
            @deleted="refresh"
        />
    </div>
</template>
