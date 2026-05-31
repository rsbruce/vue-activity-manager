<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { ActivityTypeGroup } from '@/types/activities';
import { create } from '@/data/activities'
import { refreshCurrent } from '@/router/defineController'

const props = defineProps({
    activityTypeGroups: {
        type: Array as () => ActivityTypeGroup[],
        required: true,
    },
})

const activityTypes = computed(() =>
    props.activityTypeGroups.map((group) => group.activityType),
)

const form = reactive({ name: '', type: '' })
const errors = reactive<{ name?: string; type?: string }>({})
const submitting = ref(false)

async function submit() {
    errors.name = form.name.trim() ? undefined : 'Name is required'
    errors.type = form.type ? undefined : 'Type is required'
    if (errors.name || errors.type) return

    submitting.value = true
    try {
        await create({ name: form.name.trim(), activity_type_id: form.type })
        form.name = ''
        form.type = ''
        await refreshCurrent()
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <div class="py-6 flex flex-col gap-6">
        <!-- <RouterLink to="/activities/types">Activity Types</RouterLink> -->

        <div>
            <h2 class="text-xl underline mb-2">New Activity</h2>
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
                        <button type="submit" :disabled="submitting" class="bg-sky-500 text-white rounded-md border-2 border-black">Save</button>
                    </div>
                </form>
            </div>
        </div>

        <template v-if="activityTypeGroups.length">
            <div class="flex gap-4">
                <template v-for="group in activityTypeGroups">
                    <div class="bg-main rounded-md p-2 text-black w-72" :data-model-theme="group.activityType.theme">
                        <h3 class="text-xl mb-2 underline">
                            {{group.activityType.name}}
                        </h3>
                        <template v-if="group.activities.length">
                            <div class="space-y-1">
                                <template v-for="activity in group.activities">
                                    <div class="flex border-b border-gray-700">
                                        {{ activity.name + (activity.deleted_at ? '(Trashed)' : '') }}
                                    </div>
                                </template>
                            </div>
                        </template>
                        <template v-else>
                            <p>No activities to show</p>
                        </template>
                    </div>
                </template>
            </div>
        </template>
        <template v-else>
            <span>There are no activity types in the database. Add some</span>
        </template>
    </div>
</template>
