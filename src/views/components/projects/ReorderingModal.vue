<script setup lang="ts">
import { ref, watch } from 'vue'

interface Orderable {
    id: string
    order: number | null
    name: string
    color_scheme?: string | null
}

const props = defineProps<{
    open: boolean
    items: Orderable[]
    theme: string | null
}>()

const localItems = ref([...props.items])
watch(() => props.items, (val) => { localItems.value = [...val] })

const emit = defineEmits<{
    'update:open': [boolean]
    'save': [Orderable[]]
}>()

const selectedIndex = ref<number | null>(null)

function close() {
    emit('update:open', false)
}

function save() {
    emit('save', localItems.value.map((item, idx) => ({ ...item, order: idx + 1 })))
    close()
}

function move(from: number, to: number) {
    const clamped = Math.max(0, Math.min(localItems.value.length - 1, to))
    const item = localItems.value.splice(from, 1)[0]
    if (!item) return
    localItems.value.splice(clamped, 0, item)
    selectedIndex.value = clamped
}

function up() { if (selectedIndex.value !== null) move(selectedIndex.value, selectedIndex.value - 1) }
function down() { if (selectedIndex.value !== null) move(selectedIndex.value, selectedIndex.value + 1) }
function top() { if (selectedIndex.value !== null) move(selectedIndex.value, 0) }
function bottom() { if (selectedIndex.value !== null) move(selectedIndex.value, localItems.value.length - 1) }
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="fixed w-full h-full bg-gray-700/80 z-40 top-0 left-0" @click.self="close" :data-model-theme="theme ?? 'gray'">
            <div class="h-full max-w-5xl mx-auto flex justify-center items-center p-2" @click.self="close">
                <div class="max-h-full w-2xl space-y-2 p-2 bg-white rounded-md shadow-md overflow-y-auto">
                    <h3 v-if="selectedIndex === null" class="text-lg font-semibold mb-4">Click an item to select for reordering</h3>
                    <div v-if="selectedIndex !== null" class="flex justify-around mb-4 mt-2 text-xl text-gray-800">
                        <div class="cursor-pointer rounded-full border border-gray-700 p-4 bg-main" @click="bottom">
                            <font-awesome-icon icon="arrows-down-to-line" />
                        </div>
                        <div class="cursor-pointer rounded-full border border-gray-700 p-4 bg-main" @click="down">
                            <font-awesome-icon icon="arrow-down" />
                        </div>
                        <div class="cursor-pointer rounded-full border border-gray-700 p-4 bg-main" @click="up">
                            <font-awesome-icon icon="arrow-up" />
                        </div>
                        <div class="cursor-pointer rounded-full border border-gray-700 p-4 bg-main" @click="top">
                            <font-awesome-icon icon="arrows-up-to-line" />
                        </div>
                    </div>
                    <template v-for="(item, idx) in localItems" :key="item.id">
                        <div :data-model-theme="item.color_scheme ?? theme" class="flex rounded-md flex-grow border border-gray-500 cursor-pointer" :class="selectedIndex === idx ? 'bg-intense' : 'bg-light'" @click="selectedIndex = idx">
                            <div class="w-7 border-r text-right pr-1 py-1">{{ idx + 1 }}</div>
                            <div class="pl-1 py-1">{{ item.name }}</div>
                        </div>
                    </template>
                    <div class="ml-auto rounded-md bg-sky-400 w-fit px-2 py-1 border-2 border-gray-800 cursor-pointer" @click="save">Save</div>
                </div>
            </div>
        </div>
    </Teleport>
</template>
