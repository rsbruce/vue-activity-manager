<script setup lang="ts">
import type { Person } from '@/types/people'
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { createPeopleGroup } from '@/data/peopleGroups'
import PersonPicker from '../components/PersonPicker.vue'

const props = defineProps({
    people: {
        type: Array as () => Person[],
        required: true,
    },
})

const router = useRouter()

const form = reactive({
    name: '',
    person_ids: [] as string[],
})

const addedPeople = computed(() =>
    [...props.people]
        .filter((p) => form.person_ids.includes(p.id))
        .sort((a, b) =>
            `${a.firstname} ${a.lastname || ''}`.localeCompare(`${b.firstname} ${b.lastname || ''}`)
        )
)

const addMember = (personId: string) => {
    if (!form.person_ids.includes(personId)) form.person_ids.push(personId)
}

const removeMember = (personId: string) => {
    form.person_ids.splice(form.person_ids.indexOf(personId), 1)
}

const submit = async () => {
    const group = await createPeopleGroup({ name: form.name, person_ids: form.person_ids })
    if (group) await router.push(`/people/groups/${group.id}`)
}
</script>

<template>
    <div class="py-6 space-y-6">
        <RouterLink to="/people/groups">Back to Groups</RouterLink>

        <h2 class="text-xl underline">New Group</h2>
        <div class="p-2 rounded-md bg-gray-300 shadow-md w-72 text-black">
            <form @submit.prevent="submit" class="flex flex-col gap-2">
                <label>
                    <div>Name</div>
                    <input class="bg-white border border-black rounded-md w-full" type="text" v-model="form.name" />
                </label>
                <button type="submit" class="bg-sky-500 text-white rounded-md border-2 border-black cursor-pointer">Create</button>
            </form>
        </div>

        <PersonPicker :people="people" :exclude-ids="form.person_ids" @select="addMember" />

        <div v-if="addedPeople.length">
            <h3 class="text-lg underline mb-2">Members</h3>
            <div class="space-y-2">
                <div v-for="person in addedPeople" :key="person.id" class="flex gap-2 items-center">
                    <span>{{ person.firstname }} {{ person.lastname || '' }}</span>
                    <button type="button" @click="removeMember(person.id)" class="text-red-400 text-xs cursor-pointer">remove</button>
                </div>
            </div>
        </div>
    </div>
</template>
