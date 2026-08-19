import type { RouteLocationNormalized } from 'vue-router'
import { defineController } from '@/router/defineController'
import type { ProjectCategory } from '@/types/projects'
import { getAllProjectCategories } from '@/data/projectCategories'
import type { Reminder } from '@/types/reminders'
import { getAllReminders, getReminder } from '@/data/reminders'

type RemindersIndexData = {
    reminders: Reminder[]
    projectCategories: ProjectCategory[]
}

export const remindersIndexController = defineController<RemindersIndexData>(async () => {
    const [reminders, projectCategories] = await Promise.all([
        getAllReminders(),
        getAllProjectCategories(),
    ])
    return { reminders, projectCategories }
})

type ReminderShowData = {
    reminder: Reminder | undefined
    projectCategories: ProjectCategory[]
}

export const reminderShowController = defineController<ReminderShowData>(
    async (route: RouteLocationNormalized): Promise<ReminderShowData> => {
        const [reminder, projectCategories] = await Promise.all([
            getReminder(route.params.id as string),
            getAllProjectCategories(),
        ])
        return { reminder, projectCategories }
    },
)
