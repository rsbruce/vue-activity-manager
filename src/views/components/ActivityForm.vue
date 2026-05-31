<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import type { Activity, ActivityType, ActivityWithType } from '@/types/activities'
import { create, update, destroy, restore } from '@/data/activities'
import { refreshCurrent } from '@/router/defineController'

const props = defineProps<{
    activity?: ActivityWithType | Activity
    activityTypes: ActivityType[]
}>()

const router = useRouter()

const initialType = (props.activity && 'activityType' in props.activity ? props.activity.activityType?.id : undefined)
    ?? props.activity?.activity_type_id
    ?? ''

const form = reactive({
    name: props.activity?.name ?? '',
    type: initialType,
})

const errors = reactive<{ name?: string; type?: string }>({})
const submitting = ref(false)

async function submit() {
    errors.name = form.name.trim() ? undefined : 'Name is required'
    errors.type = form.type ? undefined : 'Type is required'
    if (errors.name || errors.type) return

    submitting.value = true
    try {
        if (props.activity) {
            await update(props.activity.id, {
                name: form.name.trim(),
                activity_type_id: form.type,
            })
            await router.push('/activities/index')
        } else {
            await create({
                name: form.name.trim(),
                activity_type_id: form.type,
            })
            form.name = ''
            form.type = ''
            await refreshCurrent()
        }
    } finally {
        submitting.value = false
    }
}

async function trash(id: string) {
    await destroy(id)
    await router.push('/activities/index')
}

async function restoreActivity(id: string) {
    await restore(id)
    await router.push('/activities/index')
}
</script>

<template>
    <h2 class="text-xl underline mb-2">{{ activity ? 'Edit Activity: ' + activity.name : 'New Activity' }}</h2>
    <div class="p-2 rounded-md bg-gray-300 shadow-md w-72 text-black">
        <form @submit.prevent="submit">
            <div class="flex flex-col gap-2">
                <label>
                    <div>Name</div>
                    <input class="bg-white border border-black rounded-md w-full" type="text" v-model="form.name" />
                    <small>{{ errors.name }}</small>
                </label>
                <label>
                    <div>Type</div>
                    <select class="bg-white border border-black rounded-md w-full" v-model="form.type">
                        <option disabled value="">Select activity type</option>
                        <option v-for="activityType in activityTypes" :value="activityType.id" :key="activityType.id">
                            {{ activityType.name }}
                        </option>
                    </select>
                    <small>{{ errors.type }}</small>
                </label>
                <button type="submit" :disabled="submitting" class="bg-sky-500 text-white rounded-md border-2 border-black">
                    {{ activity ? 'Update' : 'Create' }}
                </button>
            </div>
        </form>
        <template v-if="activity && !activity.deleted_at">
            <form @submit.prevent="() => trash(activity!.id)" class="w-full">
                <button type="submit" class="bg-red-500 text-white rounded-md border-2 border-black mt-2 cursor-pointer w-full">Trash</button>
            </form>
        </template>
        <template v-if="activity && activity.deleted_at">
            <form @submit.prevent="() => restoreActivity(activity!.id)" class="w-full">
                <button type="submit" class="bg-purple-500 text-white rounded-md border-2 border-black mt-2 cursor-pointer w-full">Restore</button>
            </form>
        </template>
    </div>
</template>
