import type { RouteLocationNormalizedGeneric } from 'vue-router'
import { defineController } from '../router/defineController'
import type { Person } from '@/types/people'
import { getAllPeople, getPerson } from '@/data/people'

async function loadPeopleIndex(route: RouteLocationNormalizedGeneric): Promise<{people: Person[]}> {
    const people = await getAllPeople()
    return {people}
}

export const peopleIndexController = defineController<{people: Person[]}>(loadPeopleIndex)

async function loadPerson(route: RouteLocationNormalizedGeneric): Promise<{person: Person | undefined}> {
    const person = await getPerson(route.params.id as string)
    return {person}
}

export const personShowController = defineController<{person: Person | undefined}>(loadPerson)

export const personEditController = defineController<{person: Person | undefined}>(loadPerson)
