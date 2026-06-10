<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import type { ActivityType } from '@/types/activities'
import { create, update, trash, restore } from '@/data/activityTypes'
import DeleteRestoreButton from './DeleteRestoreButton.vue'

const themeOptions = ['amber', 'purple', 'rose', 'gray', 'green']

const props = defineProps<{
    activityType?: ActivityType
}>()

const router = useRouter()

const form = reactive({
    name: props.activityType?.name ?? '',
    theme: props.activityType?.theme ?? '',
    is_negative: !!props.activityType?.is_negative,
})

const errors = reactive<{ name?: string; theme?: string }>({})
const submitting = ref(false)

async function submit() {
    errors.name = form.name.trim() ? undefined : 'Name is required'
    errors.theme = form.theme ? undefined : 'Theme is required'
    if (errors.name || errors.theme) return

    submitting.value = true
    try {
        if (props.activityType) {
            await update(props.activityType.id, {
                name: form.name.trim(),
                theme: form.theme,
                is_negative: form.is_negative,
            })
        } else {
            await create({
                name: form.name.trim(),
                theme: form.theme,
                is_negative: form.is_negative,
            })
        }
        await router.push('/activities/index')
    } finally {
        submitting.value = false
    }
}

async function trashType(id: string) {
    await trash(id)
    await router.push('/activities/types')
}

async function restoreType(id: string) {
    await restore(id)
    await router.push('/activities/types')
}
</script>

<template>
    <div class="gap-2">
        <h2 class="text-xl underline">{{ activityType ? 'Edit Activity Type: ' + activityType.name : 'New Activity Type' }}</h2>
        <form @submit.prevent="submit">
            <div class="flex flex-col gap-2">
                <div class="flex flex-col gap-2 w-72">
                    <label>
                        <div>Name</div>
                        <input class="bg-white text-black border rounded-md w-full" type="text" v-model="form.name" />
                        <small>{{ errors.name }}</small>
                    </label>
                    <label>
                        <div>Theme</div>
                        <select class="bg-white text-black border border-black rounded-md w-full" v-model="form.theme">
                            <option disabled value="">Select theme</option>
                            <option v-for="theme in themeOptions" :value="theme" :key="theme">
                                {{ theme }}
                            </option>
                        </select>
                        <small>{{ errors.theme }}</small>
                    </label>
                    <label class="flex items-center gap-2">
                        <input type="checkbox" v-model="form.is_negative" />
                        <span>Negative (e.g. vices)</span>
                    </label>
                </div>

                <button type="submit" :disabled="submitting" class="bg-sky-500 text-white rounded-md border-2 border-black w-72 cursor-pointer">
                    {{ activityType ? 'Update' : 'Create' }}
                </button>
            </div>
        </form>
        <DeleteRestoreButton
            v-if="activityType"
            :deleted-at="activityType.deleted_at ?? null"
            class="w-72 mt-2"
            @trash="() => trashType(activityType!.id)"
            @restore="() => restoreType(activityType!.id)"
        />
    </div>
</template>
