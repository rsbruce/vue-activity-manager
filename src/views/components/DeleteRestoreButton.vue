<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ deletedAt: string | number | null }>()

const emit = defineEmits<{
    trash: []
    restore: []
}>()

const confirming = ref(false)

const confirm = (action: 'trash' | 'restore') => {
    confirming.value = false
    if (action === 'trash') emit('trash')
    else emit('restore')
}
</script>

<template>
    <div>
        <template v-if="!deletedAt">
            <button v-if="!confirming" type="button" @click="confirming = true" class="bg-red-500 text-white rounded-md border-2 border-black w-full cursor-pointer">
                Delete
            </button>
            <div v-else class="flex gap-1">
                <button type="button" @click="confirming = false" class="w-1/2 bg-gray-200 text-black rounded-md border-2 border-black cursor-pointer">Cancel</button>
                <button type="button" @click="confirm('trash')" class="w-1/2 bg-red-500 text-white rounded-md border-2 border-black cursor-pointer">Confirm</button>
            </div>
        </template>

        <template v-else>
            <button v-if="!confirming" type="button" @click="confirming = true" class="bg-purple-500 text-white rounded-md border-2 border-black w-full cursor-pointer">
                Restore
            </button>
            <div v-else class="flex gap-1">
                <button type="button" @click="confirming = false" class="w-1/2 bg-gray-200 text-black rounded-md border-2 border-black cursor-pointer">Cancel</button>
                <button type="button" @click="confirm('restore')" class="w-1/2 bg-purple-500 text-white rounded-md border-2 border-black cursor-pointer">Confirm</button>
            </div>
        </template>
    </div>
</template>
