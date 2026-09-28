<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type {
    TimetableData, CalendarData, HabitTable, TimetableEvent,
    TimetableModalInitial, TimetableProjectCategories,
} from '@/types/events'
import type { Person } from '@/types/people'
import type { Project } from '@/types/projects'
import { useRoute, useRouter } from 'vue-router'
import { getTimetableWindow, getSummary } from '@/data/timetable'
import DayNavigator from '../components/timetable/DayNavigator.vue'
import TimetableGrid from '../components/timetable/TimetableGrid.vue'
import CalendarGrid from '../components/timetable/CalendarGrid.vue'
import HoursWorkedSummary from '../components/timetable/HoursWorkedSummary.vue'
import TimetableModal from '../components/timetable/TimetableModal.vue'
import TimesheetExportModal from '../components/timetable/TimesheetExportModal.vue'

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
    weeks: number
}>()

const view = ref<'timetable' | 'calendar' | 'summary'>('timetable')
const exportModalOpen = ref(false)

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

// The URL is the source of truth for the window: navigating writes ?start=, and
// the controller reads it — so a background-sync refresh reloads the *navigated*
// window (via lastRoute tracking) instead of snapping back to today. This watch
// reloads the window whenever the query changes (nav buttons, back/forward).
const route = useRoute()
const router = useRouter()

const todayStartIso = (): string => {
    const d = new Date()
    d.setHours(5, 0, 0, 0)
    return d.isoDate()
}

function windowStartFromRoute(): Date {
    const q = route.query.start
    const d = typeof q === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(`${q}T05:00:00`) : new Date()
    d.setHours(5, 0, 0, 0)
    return d
}

watch(() => route.query.start, async () => {
    localDisplayStart.value = windowStartFromRoute()
    await loadWindow()
})

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

function navigate(offsetDays: number) {
    const next = localDisplayStart.value.addDays(offsetDays)
    // Advance the local start synchronously so rapid clicks accumulate (the query
    // watch/URL settle a tick later). Back on today → drop the query so the URL
    // stays clean and the controller defaults to today; otherwise pin ?start=.
    localDisplayStart.value = next
    // replace, not push: a day/week scrubber shouldn't pile up history entries
    // (or make the back button walk them). The ?start= URL is still shareable.
    router.replace({ query: next.isoDate() === todayStartIso() ? {} : { start: next.isoDate() } }).catch(() => {})
}

function toToday() {
    if (route.query.start) router.replace({ query: {} }).catch(() => {})
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

        <div v-show="view === 'summary'" class="flex justify-end mb-2">
            <button class="bg-sky-500 text-white px-3 py-1 rounded-md cursor-pointer" @click="exportModalOpen = true">Export to PDF</button>
        </div>

        <HoursWorkedSummary
            v-show="view === 'summary'"
            :table="summaryTable"
            :color-schemes="summaryColorSchemes"
        />

        <TimesheetExportModal v-model:open="exportModalOpen" :projects="activeProjects" />

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
