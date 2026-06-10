import type { RouteLocationNormalized } from 'vue-router'
import { defineController } from '@/router/defineController'
import type { PeopleGroup, Person } from '@/types/people'
import { getAllPeople } from '@/data/people'
import { getAllPeopleGroups, getPeopleGroup } from '@/data/peopleGroups'

// ── Groups index ──────────────────────────────────────────────────────
export const peopleGroupsIndexController = defineController<{ groups: PeopleGroup[] }>(
    async (): Promise<{ groups: PeopleGroup[] }> => {
        const groups = await getAllPeopleGroups()
        return { groups }
    },
)

// ── New group (member picker needs all people) ────────────────────────
export const newPeopleGroupController = defineController<{ people: Person[] }>(
    async (): Promise<{ people: Person[] }> => {
        const people = await getAllPeople()
        return { people }
    },
)

// ── Group detail / edit ───────────────────────────────────────────────
type GroupShowData = { group: PeopleGroup | undefined; people: Person[] }

export const peopleGroupShowController = defineController<GroupShowData>(
    async (route: RouteLocationNormalized): Promise<GroupShowData> => {
        const [group, people] = await Promise.all([
            getPeopleGroup(route.params.id as string),
            getAllPeople(),
        ])
        return { group, people }
    },
)
