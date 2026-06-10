<script setup lang="ts">
import type { Person } from '@/types/people'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { updatePerson } from '@/data/people'
import { softDelete } from '@/data/utils'
import DeleteRestoreButton from '../components/DeleteRestoreButton.vue'

const props = defineProps({
    person: {
        type: Object as () => Person,
        required: true,
    },
})

const router = useRouter()

const form = reactive({
    firstname: props.person.firstname,
    lastname: props.person.lastname || '',
    dob: props.person.dob || '',
})

const submit = async () => {
    await updatePerson(props.person.id, {
        firstname: form.firstname,
        lastname: form.lastname || null,
        dob: form.dob || null,
    })
    await router.push(`/people/${props.person.id}`)
}

const trash = async () => {
    await softDelete(props.person.id, 'people')
    await router.push('/people')
}
</script>

<template>
    <div class="py-6 space-y-4">
        <h2 class="text-xl underline">Edit Person: {{ person.firstname }}</h2>
        <div class="p-2 rounded-md bg-gray-300 shadow-md w-72 text-black">
            <form @submit.prevent="submit" class="flex flex-col gap-2">
                <label>
                    <div>First Name</div>
                    <input class="bg-white border border-black rounded-md w-full" type="text" v-model="form.firstname" />
                </label>
                <label>
                    <div>Last Name</div>
                    <input class="bg-white border border-black rounded-md w-full" type="text" v-model="form.lastname" />
                </label>
                <label>
                    <div>Date of Birth</div>
                    <input class="bg-white border border-black rounded-md w-full" type="date" v-model="form.dob" />
                </label>
                <button type="submit" class="bg-sky-500 text-white rounded-md border-2 border-black cursor-pointer">Update</button>
            </form>
            <DeleteRestoreButton :deleted-at="person.deleted_at ?? null" class="mt-2" @trash="trash" />
        </div>
    </div>
</template>
