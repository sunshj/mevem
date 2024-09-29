<template>
  <div>
    <h2>{{ numbers.join('+') }} = {{ result ?? '?' }}</h2>
    <div class="controls">
      <button @click="reset">reset</button>
      <button @click="calc">calc</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, onBeforeUnmount, ref } from 'vue'
import { wait, workerInjectKey } from '../utils'

const worker = inject(workerInjectKey)!

const numbers = ref<number[]>([])
const result = ref<number | undefined>(undefined)

function calc() {
  worker.emit('sum', ...numbers.value)
}

function reset() {
  result.value = undefined
  worker.emit('generate-numbers', 4)
}

async function handleGenerateNumbers(data: number[]) {
  numbers.value = data
  await wait(100)
}

worker.on('generate-numbers', handleGenerateNumbers)

const cleanUpSumHandler = worker.on('sum', data => {
  result.value = data
})

console.log('[generate-numbers]', worker.listenerCount('generate-numbers'))
console.log('[sum]', worker.listenerCount('sum'))

reset()

onBeforeUnmount(() => {
  cleanUpSumHandler()
  worker.off('generate-numbers', handleGenerateNumbers)
})
</script>

<style scoped>
.controls {
  display: flex;
  gap: 10px;
}
</style>
