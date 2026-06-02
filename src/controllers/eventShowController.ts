import { defineController } from "@/router/defineController";
import type { RouteLocationNormalized } from "vue-router";
import type { Person } from "@/types/people";
import type { Event } from "@/types/events";
import { getEvent, getEventWithPeople } from "@/data/events";

const load = async(route: RouteLocationNormalized): Promise<{event: Event | undefined}> => {
    const event = await getEventWithPeople(route.params.id as string)

    return {event}
}

export default defineController<{event: Event | undefined}>(load)