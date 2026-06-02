import { defineController } from "@/router/defineController";
import type { RouteLocationNormalized } from "vue-router";
import type { Person } from "@/types/people";
import type { Event } from "@/types/events";
import { getAllEventsWithPeople } from "@/data/events";
import { getAllPeople } from "@/data/people";

const load = async(route: RouteLocationNormalized): Promise<{events: Event[], people: Person[]}> => {
    const events = await getAllEventsWithPeople()
    const people = await getAllPeople()

    return {events, people}
}

export default defineController<{events: Event[], people: Person[]}>(load)