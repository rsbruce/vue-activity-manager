<script lang="ts" setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import type { ProjectCategory, Project, Objective, ProjectOnDayData } from '@/types/projects'
import type { TimetableData, CalendarData, HabitTable, TimetableEvent, TimetableModalInitial, TimetableProjectCategories } from '@/types/events'
import type { Person } from '@/types/people'
import { getTimetableWindow } from '@/data/timetable'
import { getProjectOnDayData, addProjectOnDay as addPod, removeProjectOnDay as removePod } from '@/data/projectOnDay'
import { getProjectsForPlanner, getToDoListProject } from '@/data/projects'
import { completeObjective, uncompleteObjective, createObjective } from '@/data/objectives'
import DayNavigator from '../components/timetable/DayNavigator.vue'
import TimetableGrid from '../components/timetable/TimetableGrid.vue'
import TimetableModal from '../components/timetable/TimetableModal.vue'
import PlannerDays from '../components/planner/PlannerDays.vue'
import ToDoList from '../components/planner/ToDoList.vue'
import ProjectAreaActionItems from '../components/planner/ProjectAreaActionItems.vue'

const props = defineProps<{
    timetable: TimetableData
    calendar: CalendarData
    habitTable: HabitTable
    eventsArr: Record<string, TimetableEvent>
    projectCategories: ProjectCategory[]
    allProjects: Project[]
    toDoList: Project | null
    toDoListId: string | null
    projectOnDayData: ProjectOnDayData
    timetableProjectCategories: TimetableProjectCategories
    activeProjects: Project[]
    people: Person[]
    displayStart: string
}>()

const view = ref<'projects' | 'timetable'>('projects')

// ── Local, navigable copies ───────────────────────────────────────────
const localDisplayStart = ref(new Date(props.displayStart))
const timetable = ref<TimetableData>(props.timetable)
const calendar = ref<CalendarData>(props.calendar)
const eventsArr = ref<Record<string, TimetableEvent>>(props.eventsArr)
const projectOnDayData = ref<ProjectOnDayData>(props.projectOnDayData)
const allProjects = ref<Project[]>(props.allProjects)
const toDoList = ref<Project | null>(props.toDoList)

watch(() => props.timetable, (v) => { timetable.value = v })
watch(() => props.calendar, (v) => { calendar.value = v })
watch(() => props.eventsArr, (v) => { eventsArr.value = v })
watch(() => props.projectOnDayData, (v) => { projectOnDayData.value = v })
watch(() => props.allProjects, (v) => { allProjects.value = v })
watch(() => props.toDoList, (v) => { toDoList.value = v })
watch(() => props.displayStart, (v) => { localDisplayStart.value = new Date(v) })

async function loadWindow() {
    const start = localDisplayStart.value
    const win = await getTimetableWindow(start.addDays(-7).isoDate(), start.addDays(7).isoDate())
    timetable.value = win.timetable
    calendar.value = win.calendar
    eventsArr.value = win.eventsArr
}
async function loadProjectOnDay() {
    projectOnDayData.value = await getProjectOnDayData(localDisplayStart.value.isoDate())
}
async function loadProjects() {
    allProjects.value = await getProjectsForPlanner(props.toDoListId)
    toDoList.value = props.toDoListId ? (await getToDoListProject(props.toDoListId)) ?? null : null
}

async function navigate(offsetDays: number) {
    localDisplayStart.value = localDisplayStart.value.addDays(offsetDays)
    await Promise.all([loadWindow(), loadProjectOnDay()])
}
async function toToday() {
    const d = new Date()
    d.setHours(5, 0, 0, 0)
    localDisplayStart.value = d
    await Promise.all([loadWindow(), loadProjectOnDay()])
}

// ── Project-on-day + objective actions ────────────────────────────────
const allProjectsIncludingToDoList = computed(() =>
    toDoList.value ? [toDoList.value, ...allProjects.value] : allProjects.value,
)

const toDoListCategory = computed(() => props.projectCategories.find((pc) => pc.id === toDoList.value?.project_category_id))
const toDoObjectives = computed<Objective[]>(() =>
    [...(toDoList.value?.objectives ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
)

async function onAddProjectOnDay({ projectId, date }: { projectId: string; date: string }) {
    await addPod(projectId, date)
    await loadProjectOnDay()
}
async function onRemoveProjectOnDay(projectId: string, date: string) {
    await removePod(projectId, date)
    await loadProjectOnDay()
}
async function handleToggle(objectiveId: string, complete: boolean) {
    await (complete ? completeObjective(objectiveId) : uncompleteObjective(objectiveId))
    await loadProjects()
}
async function addToDoObjective(name: string) {
    if (!props.toDoListId) return
    await createObjective({ name, project_id: props.toDoListId })
    await loadProjects()
}

// ── Timetable strip modal (same wiring as Timetable.vue) ──────────────
const modalOpen = ref(false)
const modalInitial = ref<TimetableModalInitial | null>(null)

const datetimeLocal = (d: Date) => `${d.isoDate()}T${d.isoTime()}`
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

const presentMoment = ref(new Date())
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(() => { presentMoment.value = new Date() }, 60000) })
onUnmounted(() => clearInterval(timer))
</script>

<template>
    <div class="py-2 space-y-2">
        <div class="grid md:grid-cols-2 gap-4">
            <!-- Left: day-by-day scheduling -->
            <div>
                <DayNavigator
                    @week-before="navigate(-7)"
                    @day-before="navigate(-1)"
                    @today="toToday"
                    @day-after="navigate(1)"
                    @week-after="navigate(7)"
                />
                <PlannerDays
                    :start-date="localDisplayStart"
                    :active-projects="allProjectsIncludingToDoList"
                    :project-on-day-data="projectOnDayData"
                    :project-categories="projectCategories"
                    :show-later-days="view !== 'timetable'"
                    @add-project="onAddProjectOnDay"
                    @toggle="handleToggle"
                    @remove-project-on-day="onRemoveProjectOnDay"
                />
            </div>

            <!-- Right: Projects view / Timetable strip -->
            <div>
                <div class="grid grid-cols-2 gap-2 rounded-md bg-sky-100 p-1 text-black mb-2">
                    <button class="rounded-md p-1 text-center font-bold cursor-pointer" :class="view === 'projects' ? 'bg-sky-500' : 'bg-sky-200'" @click="view = 'projects'">Projects</button>
                    <button class="rounded-md p-1 text-center font-bold cursor-pointer" :class="view === 'timetable' ? 'bg-sky-500' : 'bg-sky-200'" @click="view = 'timetable'">Timetable</button>
                </div>

                <template v-if="view === 'projects'">
                    <div class="mb-2">
                        <RouterLink to="/project-categories" class="text-lg underline">Project Areas <font-awesome-icon icon="arrow-right" /></RouterLink>
                    </div>
                    <ToDoList
                        v-if="toDoList && toDoListCategory"
                        :project-name="toDoList.name"
                        :objectives="toDoObjectives"
                        :theme="toDoListCategory.color_scheme"
                        @toggle="handleToggle"
                        @add-objective="addToDoObjective"
                    />
                    <ProjectAreaActionItems :project-categories="projectCategories" :projects="allProjects" />
                </template>
                <template v-else>
                    <TimetableGrid
                        :timetable="timetable"
                        :calendar="calendar"
                        :habit-table="{}"
                        :display-start="localDisplayStart"
                        :display-days="1"
                        :present-moment="presentMoment"
                        @open-modal="openModal"
                        @open-modal-for-item="(id) => openModalForItem(id)"
                    />
                </template>
            </div>
        </div>

        <TimetableModal
            v-model:open="modalOpen"
            :people="people"
            :project-categories="timetableProjectCategories"
            :active-projects="activeProjects"
            :initial="modalInitial"
            @saved="loadWindow"
            @deleted="loadWindow"
        />
    </div>
</template>
