// Demo dataset for reviewers. Seeds a rich, representative slice of every
// feature so each screen has something to show, then can wipe it all again.
//
// Everything is inserted in ONE transaction: on web (jeep-sqlite) writes only
// persist to the store on transaction commit, and a single transaction keeps the
// whole seed atomic. IDs are generated up front so foreign keys line up.
//
// Dates are computed relative to "now" at seed time so the demo never goes stale
// — there are always overdue, today, and upcoming items. Record timestamps
// (completed_at, activity days) are always in the past, since you can't have
// done something in the future.

import { exec, transaction } from '@/db'

const uid = () => crypto.randomUUID()

// ── date helpers (self-contained; local wall-clock) ───────────────────────────
function shift(days: number, hour?: number, min = 0): Date {
  const t = new Date()
  t.setDate(t.getDate() + days)
  if (hour !== undefined) t.setHours(hour, min, 0, 0)
  return t
}
const ymd = (dt: Date) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
const ymdhm = (dt: Date) =>
  `${ymd(dt)}T${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
const dateOff = (days: number) => ymd(shift(days))
const dtOff = (days: number, hour: number, min = 0) => ymdhm(shift(days, hour, min))
const secsAgo = (days: number, hour = 12) => Math.floor(shift(-Math.abs(days), hour).getTime() / 1000)

export async function seedDemoData(): Promise<void> {
  await transaction(async () => {
    // ── insert helpers (capture generated ids for FKs) ────────────────────────
    const category = async (name: string, color: string, order: number) => {
      const id = uid()
      await exec('INSERT INTO project_categories (id, name, color_scheme, "order") VALUES (?,?,?,?)', [id, name, color, order])
      return id
    }
    const project = async (
      name: string,
      categoryId: string,
      o: { order?: number; active?: boolean; completedDaysAgo?: number; description?: string } = {},
    ) => {
      const id = uid()
      await exec(
        'INSERT INTO projects (id, name, description, project_category_id, "order", active, completed_at) VALUES (?,?,?,?,?,?,?)',
        [id, name, o.description ?? null, categoryId, o.order ?? 0, o.active === false ? 0 : 1, o.completedDaysAgo != null ? secsAgo(o.completedDaysAgo) : null],
      )
      return id
    }
    const generalProject = async (name: string, categoryId: string) => {
      const pid = await project(name, categoryId, { order: 0 })
      await exec('INSERT INTO general_projects (project_id, project_category_id) VALUES (?,?)', [pid, categoryId])
      return pid
    }
    const objective = async (
      name: string,
      projectId: string,
      o: { order?: number; dueInDays?: number; completedDaysAgo?: number; description?: string } = {},
    ) => {
      const id = uid()
      await exec(
        'INSERT INTO objectives (id, name, description, project_id, "order", completed_at, due_date) VALUES (?,?,?,?,?,?,?)',
        [id, name, o.description ?? null, projectId, o.order ?? 0, o.completedDaysAgo != null ? secsAgo(o.completedDaysAgo) : null, o.dueInDays != null ? dateOff(o.dueInDays) : null],
      )
      return id
    }
    const task = async (
      name: string,
      objectiveId: string,
      o: { order?: number; doneDaysAgo?: number; description?: string } = {},
    ) => {
      const id = uid()
      await exec('INSERT INTO tasks (id, name, description, completed_at, objective_id, "order") VALUES (?,?,?,?,?,?)', [
        id, name, o.description ?? null, o.doneDaysAgo != null ? secsAgo(o.doneDaysAgo) : null, objectiveId, o.order ?? 0,
      ])
      return id
    }
    const event = async (
      name: string,
      o: { projectId?: string | null; startDays: number; startHour: number; durHours: number; startMin?: number; before?: string; after?: string },
    ) => {
      const id = uid()
      const start = dtOff(o.startDays, o.startHour, o.startMin ?? 0)
      const endDt = shift(o.startDays, o.startHour, o.startMin ?? 0)
      endDt.setMinutes(endDt.getMinutes() + Math.round(o.durHours * 60))
      await exec(
        'INSERT INTO events (id, project_id, name, start_datetime, end_datetime, before_notes, after_notes) VALUES (?,?,?,?,?,?,?)',
        [id, o.projectId ?? null, name, start, ymdhm(endDt), o.before ?? null, o.after ?? null],
      )
      return id
    }
    const reminder = async (
      name: string,
      o: { reminderInDays: number; fixed: boolean; occurrenceInDays?: number | null; categoryId?: string | null },
    ) => {
      await exec(
        'INSERT INTO reminders (id, name, date_of_occurrence, date_of_reminder, has_fixed_date_of_occurrence, project_category_id) VALUES (?,?,?,?,?,?)',
        [uid(), name, o.occurrenceInDays != null ? dateOff(o.occurrenceInDays) : null, dateOff(o.reminderInDays), o.fixed ? 1 : 0, o.categoryId ?? null],
      )
    }
    const activityType = async (name: string, theme: string, negative: boolean) => {
      const id = uid()
      await exec('INSERT INTO activity_types (id, name, is_negative, theme) VALUES (?,?,?,?)', [id, name, negative ? 1 : 0, theme])
      return id
    }
    const activity = async (name: string, typeId: string) => {
      const id = uid()
      await exec('INSERT INTO activities (id, name, activity_type_id) VALUES (?,?,?)', [id, name, typeId])
      return id
    }
    const activityDay = async (activityId: string, daysAgo: number) =>
      exec('INSERT INTO activity_on_day (activity_id, "date") VALUES (?,?)', [activityId, dateOff(-Math.abs(daysAgo))])
    const person = async (firstname: string, lastname: string | null, dobYearsAgo?: number) => {
      const id = uid()
      await exec('INSERT INTO people (id, firstname, lastname, dob) VALUES (?,?,?,?)', [id, firstname, lastname, dobYearsAgo != null ? dateOff(-dobYearsAgo * 365) : null])
      return id
    }
    const group = async (name: string) => {
      const id = uid()
      await exec('INSERT INTO people_groups (id, name) VALUES (?,?)', [id, name])
      return id
    }
    const inGroup = (personId: string, groupId: string) =>
      exec('INSERT INTO person_in_group (person_id, people_group_id) VALUES (?,?)', [personId, groupId])
    const atEvent = (personId: string, eventId: string) =>
      exec('INSERT INTO person_at_event (person_id, event_id) VALUES (?,?)', [personId, eventId])
    const projectOnDay = (projectId: string, days: number) =>
      exec('INSERT INTO project_on_day (project_id, "date") VALUES (?,?)', [projectId, dateOff(days)])

    // ── Project areas (one per theme colour) ──────────────────────────────────
    const work = await category('Work', 'amber', 0)
    const personal = await category('Personal', 'green', 1)
    const health = await category('Health', 'rose', 2)
    const learning = await category('Learning', 'purple', 3)
    const admin = await category('Admin', 'gray', 4)

    // General ("catch-all") project per area.
    await generalProject('General', work)
    const personalGeneral = await generalProject('General', personal)
    await generalProject('General', health)
    await generalProject('General', learning)
    await generalProject('General', admin)

    // ── Projects (active / upcoming / completed states) ───────────────────────
    const websiteRedesign = await project('Website Redesign', work, { order: 1, description: 'Marketing site refresh for the autumn launch.' })
    const q3Reporting = await project('Q3 Reporting', work, { order: 2 })
    await project('Legacy Migration', work, { order: 3, completedDaysAgo: 20 }) // completed
    await project('New Hire Onboarding', work, { order: 4, active: false }) // upcoming
    const homeReno = await project('Home Renovation', personal, { order: 1 })
    const tripJapan = await project('Trip to Japan', personal, { order: 2, active: false }) // upcoming
    const marathon = await project('Marathon Training', health, { order: 1, description: 'Autumn marathon, sub-4:00 goal.' })
    const learnRust = await project('Learn Rust', learning, { order: 1 })
    const spanish = await project('Spanish', learning, { order: 2 })
    const taxes = await project('Self-Assessment Tax', admin, { order: 1 })

    // ── Objectives (overdue / today / this week / later / completed / no-date) ─
    const objHomepage = await objective('Finish homepage mockup', websiteRedesign, {
      order: 1, dueInDays: 0, description: 'High-fidelity mockup for the new homepage, ready for dev handoff.',
    })
    await objective('Set up CI pipeline', websiteRedesign, { order: 2, completedDaysAgo: 1 }) // completed this week
    await objective('Write launch copy', websiteRedesign, { order: 3, dueInDays: 5 }) // this week
    await objective('Accessibility audit', websiteRedesign, { order: 4 }) // no due date

    await objective('Send client invoice', q3Reporting, { order: 1, dueInDays: -3 }) // overdue
    await objective('Draft Q3 summary', q3Reporting, { order: 2, dueInDays: 9 }) // next week (Later)
    await objective('File expenses', q3Reporting, { order: 3, completedDaysAgo: 8 }) // completed last week

    await objective('Choose paint colours', homeReno, { order: 1, dueInDays: 2 })
    await objective('Get three builder quotes', homeReno, { order: 2, dueInDays: 15 }) // Later

    const objFlights = await objective('Book flights', tripJapan, { order: 1, dueInDays: 4 })
    await objective('Plan itinerary', tripJapan, { order: 2 })

    const objLongRun = await objective('Complete 20-mile long run', marathon, { order: 1, dueInDays: 6, description: 'Peak long run before the taper.' })
    await objective('Finalise training plan', marathon, { order: 2, completedDaysAgo: 2 }) // completed this week

    await objective('Finish the Rust book', learnRust, { order: 1, dueInDays: 21 }) // weeks out
    await objective('Build a small CLI tool', learnRust, { order: 2 })
    await objective('Master past-tense verbs', spanish, { order: 1, dueInDays: 1 }) // tomorrow

    await objective('Gather tax documents', taxes, { order: 1, dueInDays: -1 }) // overdue (yesterday)
    await objective('Submit self-assessment', taxes, { order: 2, dueInDays: 12 })

    // To-do-list inbox lives on the Personal "General" project.
    await objective('Call the dentist', personalGeneral, { order: 1 })
    await objective('Renew car insurance', personalGeneral, { order: 2, dueInDays: 3 })

    // ── Tasks (done / not-done / with descriptions) ───────────────────────────
    await task('Wireframe the layout', objHomepage, { order: 1, doneDaysAgo: 2 })
    await task('Design the hero section', objHomepage, { order: 2, doneDaysAgo: 1 })
    await task('Choose typography', objHomepage, { order: 3 })
    await task('Export assets for dev', objHomepage, { order: 4, description: 'PNG + SVG, 1x and 2x.' })

    await task('Map the route', objLongRun, { order: 1, doneDaysAgo: 1 })
    await task('Prep hydration plan', objLongRun, { order: 2 })

    await task('Compare airlines', objFlights, { order: 1 })
    await task('Check passport validity', objFlights, { order: 2 })

    // ── Events: past (timesheet/summary) + upcoming (planner) ─────────────────
    // Work events (project_id → coloured by area). Past two weeks for the summary
    // grid + PDF export.
    await event('Design session', { projectId: websiteRedesign, startDays: -8, startHour: 9, durHours: 3, after: 'Nailed the layout direction.' })
    const clientCall = await event('Client call', { projectId: websiteRedesign, startDays: -7, startHour: 14, durHours: 1 })
    const sprintPlanning = await event('Sprint planning', { projectId: q3Reporting, startDays: -6, startHour: 10, durHours: 2 })
    await event('Code review', { projectId: websiteRedesign, startDays: -3, startHour: 15, durHours: 1 })
    await event('Deep work: Rust', { projectId: learnRust, startDays: -2, startHour: 8, durHours: 2 })
    await event('Design session', { projectId: websiteRedesign, startDays: -1, startHour: 9, durHours: 4 })
    await event('Team standup', { projectId: q3Reporting, startDays: 0, startHour: 9, durHours: 0.5 }) // today

    // Upcoming — work (coloured) + non-work (no project) for the All/Work/Non-work filter.
    const clientDemo = await event('Client demo', { projectId: websiteRedesign, startDays: 2, startHour: 11, durHours: 1, before: 'Prepare the slide deck.' })
    await event('1:1 with manager', { projectId: q3Reporting, startDays: 3, startHour: 16, durHours: 1 })
    await event('Long run', { projectId: marathon, startDays: 6, startHour: 7, durHours: 3 })
    await event('Dentist appointment', { projectId: null, startDays: 1, startHour: 8, durHours: 1 }) // non-work
    const dinner = await event('Dinner with friends', { projectId: null, startDays: 5, startHour: 19, durHours: 2 }) // non-work

    // ── Reminders (overdue / today / future; fixed & floating; with/without area) ─
    await reminder('Chase landlord about the deposit', { reminderInDays: -2, fixed: false, categoryId: personal }) // overdue floating
    await reminder('Reply to the accountant', { reminderInDays: 0, fixed: false, categoryId: admin }) // due today
    await reminder('Passport renewal appointment', { reminderInDays: 3, fixed: true, occurrenceInDays: 12, categoryId: personal }) // fixed future
    await reminder('Collect prescription from pharmacy', { reminderInDays: 1, fixed: true, occurrenceInDays: 1, categoryId: health })
    await reminder('Follow up on job application', { reminderInDays: 6, fixed: false })
    await reminder('Warranty on laptop expires', { reminderInDays: 20, fixed: true, occurrenceInDays: 20 })

    // ── Habits ────────────────────────────────────────────────────────────────
    const tExercise = await activityType('Exercise', 'green', false)
    const tMind = await activityType('Mindfulness', 'purple', false)
    const tReading = await activityType('Reading', 'amber', false)
    const tVice = await activityType('Junk food', 'rose', true) // negative habit

    const aRun = await activity('Morning run', tExercise)
    const aGym = await activity('Gym session', tExercise)
    const aMeditate = await activity('Meditate 10 min', tMind)
    const aRead = await activity('Read 20 pages', tReading)
    const aTakeaway = await activity('Takeaway', tVice)

    for (const d of [0, 1, 2, 4, 5, 7, 9]) await activityDay(aRun, d)
    for (const d of [1, 3, 6]) await activityDay(aGym, d)
    for (const d of [0, 1, 2, 3, 5]) await activityDay(aMeditate, d)
    for (const d of [2, 6, 8]) await activityDay(aRead, d)
    for (const d of [3, 6]) await activityDay(aTakeaway, d)

    // ── People & groups ───────────────────────────────────────────────────────
    const alice = await person('Alice', 'Smith', 30)
    const bob = await person('Bob', 'Jones', 42)
    const carol = await person('Carol', 'Nguyen', 28)
    const daniel = await person('Daniel', 'Jackson', 35)
    const team = await group('Team')
    const family = await group('Family')
    await inGroup(alice, team)
    await inGroup(bob, team)
    await inGroup(carol, family)
    await atEvent(alice, clientCall)
    await atEvent(bob, sprintPlanning)
    await atEvent(alice, clientDemo)
    await atEvent(bob, clientDemo)
    await atEvent(carol, dinner)
    await atEvent(daniel, dinner)

    // ── Planner day-scheduling (past / today / future) ────────────────────────
    await projectOnDay(homeReno, -2)
    await projectOnDay(websiteRedesign, 0)
    await projectOnDay(marathon, 1)
    await projectOnDay(learnRust, 3)

    // ── Singleton pointers ────────────────────────────────────────────────────
    await exec('INSERT INTO to_do_list_project (to_do_list_project_id) VALUES (?)', [personalGeneral])
    await exec('INSERT INTO current_objective (objective_id) VALUES (?)', [objHomepage])
  })
}

// Full local wipe — for the "purge demo data" button. A demo instance only ever
// contains demo data (it started empty), so we can clear every table rather than
// track which rows were seeded. Children before parents to satisfy FKs.
export async function purgeAllData(): Promise<void> {
  const tables = [
    'person_at_event', 'person_in_group', 'activity_on_day', 'project_on_day',
    'tasks', 'current_objective', 'to_do_list_project', 'general_projects',
    'reminders', 'objectives', 'events', 'activities', 'projects',
    'activity_types', 'people_groups', 'people', 'project_categories',
  ]
  await transaction(async () => {
    for (const t of tables) await exec(`DELETE FROM "${t}"`)
  })
}
