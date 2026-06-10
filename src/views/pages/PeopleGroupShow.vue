<script setup lang="ts">
import type { PeopleGroup, Person } from '@/types/people'
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { refreshCurrent } from '@/router/defineController'
import { updatePeopleGroup, addPersonToGroup, removePersonFromGroup } from '@/data/peopleGroups'
import { softDelete } from '@/data/utils'
import PersonPicker from '../components/PersonPicker.vue'
import DeleteRestoreButton from '../components/DeleteRestoreButton.vue'

const props = defineProps({
    group: {
        type: Object as () => PeopleGroup,
        required: true,
    },
    people: {
        type: Array as () => Person[],
        required: true,
    },
})

const router = useRouter()

const form = reactive({ name: props.group.name })

const memberIds = computed(() => (props.group.people || []).map((p) => p.id))

const rename = async () => {
    await updatePeopleGroup(props.group.id, { name: form.name })
    await refreshCurrent()
}

const addMember = async (personId: string) => {
    await addPersonToGroup(personId, props.group.id)
    await refreshCurrent()
}

const removeMember = async (personId: string) => {
    await removePersonFromGroup(personId, props.group.id)
    await refreshCurrent()
}

const trash = async () => {
    await softDelete(props.group.id, 'people_groups')
    await router.push('/people/groups')
}
</script>

<template>
    <div class="py-6 space-y-6">
        <RouterLink to="/people/groups">Back</RouterLink>

        <div class="p-2 rounded-md bg-gray-300 shadow-md text-black w-72 space-y-1">
            <form @submit.prevent="rename" class="space-y-1">
                <input class="bg-white border border-black rounded-md px-1 block w-full" type="text" v-model="form.name" />
                <button type="submit" class="bg-sky-500 text-white px-2 rounded-md border border-black cursor-pointer w-full">Rename</button>
            </form>
        </div>

        <PersonPicker :people="people" :exclude-ids="memberIds" @select="addMember" />

        <div>
            <h3 class="text-lg underline">Members</h3>
            <div class="space-y-2">
                <template v-for="person in group.people" :key="person.id">
                    <div class="flex gap-2 items-center">
                        <RouterLink :to="`/people/${person.id}`">{{ person.firstname }} {{ person.lastname || '' }}</RouterLink>
                        <button @click="removeMember(person.id)" class="text-red-400 text-xs cursor-pointer">remove</button>
                    </div>
                </template>
                <p v-if="!group.people?.length" class="text-gray-400">No members yet.</p>
            </div>
        </div>

        <DeleteRestoreButton :deleted-at="group.deleted_at ?? null" class="w-72" @trash="trash" />
    </div>
</template>
