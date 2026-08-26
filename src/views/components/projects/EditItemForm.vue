<script setup lang="ts">
import DeleteRestoreButton from '../DeleteRestoreButton.vue'
import ToastUiEditor from '../ToastUiEditor.vue'

defineProps<{
    name: string
    description: string
    deletedAt: string | null
}>()

const emit = defineEmits<{
    'update:name': [string]
    'update:description': [string]
    'submit': []
    'trash': []
    'restore': []
}>()
</script>

<template>
    <div class="max-w-full space-y-2 py-4">
        <form @submit.prevent="emit('submit')" class="flex flex-col gap-2">
            <slot name="top" />
            <label>
                <div>Name</div>
                <input
                    class="p-0.5 border rounded-md w-full bg-white text-black"
                    type="text"
                    :value="name"
                    @input="emit('update:name', ($event.target as HTMLInputElement).value)"
                />
            </label>
            <slot name="fields" />
            <div>
                <div class="mb-1">Description</div>
                <ToastUiEditor
                    :model-value="description"
                    @update:model-value="emit('update:description', $event)"
                />
            </div>
            <button type="submit" class="bg-sky-500 text-white rounded-md border-2 border-black md:max-w-96 mt-8 cursor-pointer">Save</button>
        </form>
        <div class="md:max-w-96">
            <DeleteRestoreButton :deleted-at="deletedAt" @trash="emit('trash')" @restore="emit('restore')" />
        </div>
    </div>
</template>
