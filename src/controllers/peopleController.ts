import type { RouteLocationNormalizedGeneric } from 'vue-router'
import { defineController } from '../router/defineController'
import type { Person } from '@/types/people'
import { getAllPeople } from '@/data/people'

async function loadPeopleIndex(route: RouteLocationNormalizedGeneric): Promise<{people: Person[]}> {
    const people = await getAllPeople()
    return {people}
}

export const peopleIndexController = defineController<{people: Person[]}>(loadPeopleIndex)
