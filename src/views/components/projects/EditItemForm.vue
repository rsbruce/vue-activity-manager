<script setup lang="ts">
import { computed, ref } from 'vue'
import { renderMarkdown } from '@/utils/markdown'
import DeleteRestoreButton from '../DeleteRestoreButton.vue'

const props = defineProps<{
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

const activeTab = ref<'write' | 'preview'>('write')

const renderedDescription = computed(() => renderMarkdown(props.description))
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
                <div class="flex items-center justify-between mb-1">
                    <span>Description</span>
                    <div class="flex md:hidden text-sm border border-white rounded-md overflow-hidden">
                        <button type="button" @click="activeTab = 'write'"
                            class="px-3 py-0.5 transition-colors"
                            :class="activeTab === 'write' ? 'bg-white text-black' : 'text-white'">
                            Write
                        </button>
                        <button type="button" @click="activeTab = 'preview'"
                            class="px-3 py-0.5 transition-colors"
                            :class="activeTab === 'preview' ? 'bg-white text-black' : 'text-white'">
                            Preview
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <textarea
                        rows="10"
                        class="p-0.5 border rounded-md w-full bg-white text-black"
                        :class="activeTab === 'write' ? 'block' : 'hidden md:block'"
                        :value="description"
                        @input="emit('update:description', ($event.target as HTMLTextAreaElement).value)"
                    ></textarea>
                    <div class="p-2 border border-white text-white rounded-lg" :class="activeTab === 'preview' ? 'block' : 'hidden md:block'">
                        <div v-html="renderedDescription" class="prose prose-invert"></div>
                    </div>
                </div>
            </div>
            <button type="submit" class="bg-sky-500 text-white rounded-md border-2 border-black md:max-w-96 mt-8 cursor-pointer">Save</button>
        </form>
        <div class="md:max-w-96">
            <DeleteRestoreButton :deleted-at="deletedAt" @trash="emit('trash')" @restore="emit('restore')" />
        </div>
    </div>
</template>
