import { defineController } from "@/router/defineController";
import type { RouteLocationNormalized } from "vue-router";
import type { Person } from "@/types/people";
import type { Event } from "@/types/events";
import { getAllEventsWithPeople, getEventWithPeople } from "@/data/events";
import { getAllPeople } from "@/data/people";

const loadEventsIndex = async(route: RouteLocationNormalized): Promise<{events: Event[], people: Person[]}> => {
    const events = await getAllEventsWithPeople()
    const people = await getAllPeople()

    return {events, people}
}

export const eventsIndexController = defineController<{events: Event[], people: Person[]}>(loadEventsIndex)

const loadEventShow = async(route: RouteLocationNormalized): Promise<{event: Event | undefined}> => {
    const event = await getEventWithPeople(route.params.id as string)

    return {event}
}

export const eventShowController = defineController<{event: Event | undefined}>(loadEventShow)

const loadEditEvent = async(route: RouteLocationNormalized): Promise<{event: Event | undefined, people: Person[]}> => {
    const event = await getEventWithPeople(route.params.id as string)
    const people = await getAllPeople()

    return {event, people}
}

export const editEventController = defineController<{event: Event | undefined, people: Person[]}>(loadEditEvent)