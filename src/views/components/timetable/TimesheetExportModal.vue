<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import type { Project } from '@/types/projects'
import { getProjectEventsInRange } from '@/data/events'
import { exportTimesheetPdf } from '@/utils/timesheetPdf'
import { formatWeekdayDayMonth } from '@/utils/dueDate'
import '@/utils/dateExtensions'

const props = defineProps<{
    open: boolean
    projects: Project[]
}>()

const emit = defineEmits<{ 'update:open': [boolean] }>()

const screen = ref<'select' | 'confirm'>('select')
const titleText = ref('')
const startDate = ref('')
const endDate = ref('')
const selectedProject = ref<Project | null>(null)

// Fresh each time it opens; the title is defaulted from the project on selection.
watch(() => props.open, (isOpen) => {
    if (!isOpen) return
    screen.value = 'select'
    titleText.value = ''
    startDate.value = ''
    endDate.value = ''
    selectedProject.value = null
})

const rangeValid = computed(() => !!startDate.value && !!endDate.value && startDate.value <= endDate.value)

// ── Date-range presets (UK: weeks start Monday) ───────────────────────
function mondayOfThisWeek(): Date {
    const now = new Date()
    const since = (now.getDay() + 6) % 7 // getDay(): Sun=0 … Sat=6
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - since)
}
function setRange(start: Date, end: Date) {
    startDate.value = start.isoDate()
    endDate.value = end.isoDate()
}
// This week's Monday → today (just today if today is Monday).
function presetWeekToDate() {
    setRange(mondayOfThisWeek(), new Date())
}
// The previous whole week: last week's Monday → the Sunday just gone.
function presetLastFullWeek() {
    const mon = mondayOfThisWeek()
    setRange(
        new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7),
        new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 1),
    )
}
// The previous calendar month (day 0 of this month = last day of last month).
function presetLastCalendarMonth() {
    const now = new Date()
    setRange(
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
        new Date(now.getFullYear(), now.getMonth(), 0),
    )
}

function close() {
    emit('update:open', false)
}

function selectProject(p: Project) {
    if (!rangeValid.value) return
    selectedProject.value = p
    titleText.value = `${p.name} timesheet`
    screen.value = 'confirm'
}

// Cancel on the confirm screen returns to selection, keeping the title/dates.
function back() {
    screen.value = 'select'
}

async function confirmExport() {
    if (!selectedProject.value || !rangeValid.value) return
    const p = selectedProject.value
    const start = startDate.value
    const end = endDate.value
    const title = titleText.value
    close()
    const events = await getProjectEventsInRange(p.id, start, end)
    await exportTimesheetPdf({ title, projectName: p.name, start, end, events })
}
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="fixed w-full h-full bg-gray-700/80 z-40 top-0 left-0 text-black" @click.self="close">
            <div class="h-full max-w-5xl mx-auto my-6 flex justify-center items-center" @click.self="close">
                <div class="z-40 px-1 w-fit" @click.stop>

                    <!-- Project + date-range selection -->
                    <div v-if="screen === 'select'" class="bg-white rounded-md px-3 py-3 space-y-3 w-96 max-w-full">
                        <h2 class="text-xl">Export timesheet</h2>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="bg-sky-200 text-black px-2 py-0.5 rounded-md text-sm cursor-pointer" @click="presetWeekToDate">Week to date</button>
                            <button type="button" class="bg-sky-200 text-black px-2 py-0.5 rounded-md text-sm cursor-pointer" @click="presetLastFullWeek">Last full week</button>
                            <button type="button" class="bg-sky-200 text-black px-2 py-0.5 rounded-md text-sm cursor-pointer" @click="presetLastCalendarMonth">Last calendar month</button>
                        </div>
                        <div class="flex gap-2">
                            <label class="flex-1">
                                <div class="text-sm">Start date</div>
                                <input type="date" v-model="startDate" class="border border-black rounded-md w-full px-1" />
                            </label>
                            <label class="flex-1">
                                <div class="text-sm">End date</div>
                                <input type="date" v-model="endDate" class="border border-black rounded-md w-full px-1" />
                            </label>
                        </div>
                        <div>
                            <div class="text-sm mb-1">Project</div>
                            <p v-if="!rangeValid" class="text-gray-500 text-sm">Pick a start and end date first (start on or before end).</p>
                            <div v-else class="flex flex-wrap gap-2">
                                <div
                                    v-for="p in projects"
                                    :key="p.id"
                                    :data-model-theme="p.color_scheme ?? 'gray'"
                                    class="bg-main border-2 border-intense rounded-lg px-2 py-1 cursor-pointer"
                                    @click="selectProject(p)"
                                >{{ p.name }}</div>
                                <p v-if="!projects.length" class="text-gray-500 text-sm">No projects.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Confirmation -->
                    <div v-else class="bg-white rounded-md px-3 py-3 space-y-4 w-96 max-w-full">
                        <label class="block">
                            <div class="text-sm">Title (optional)</div>
                            <input v-model="titleText" class="border border-black rounded-md w-full px-1" />
                        </label>
                        <p>
                            Export timesheet for <span class="font-semibold">{{ selectedProject?.name }}</span>
                            between <span class="font-semibold">{{ formatWeekdayDayMonth(startDate) }}</span>
                            and <span class="font-semibold">{{ formatWeekdayDayMonth(endDate) }}</span> inclusive?
                        </p>
                        <div class="flex gap-2 justify-end">
                            <button class="bg-gray-200 rounded-md border-2 border-black px-3 py-1 cursor-pointer" @click="back">Cancel</button>
                            <button class="bg-sky-500 text-white rounded-md border-2 border-black px-3 py-1 cursor-pointer" @click="confirmExport">Confirm</button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </Teleport>
</template>
