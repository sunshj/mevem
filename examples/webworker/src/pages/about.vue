<template>
  <h2>about page - {{ nowTime }}</h2>
  <button @click="getTime">getTime</button>
</template>

<script setup lang="ts">
import { inject, onBeforeMount, ref } from 'vue'
import { workerInjectKey } from '../utils'
import EventEmitter from 'mevem'

const worker = inject(workerInjectKey)!
const emitter = new EventEmitter()

const nowTime = ref('')

emitter.on('time', data => {
  nowTime.value = data
})

function getTime() {
  emitter.emit('time', new Date().toLocaleTimeString())
}

onBeforeMount(() => {
  console.log('[worker] numbersListeners:', worker.listeners('generate-numbers'))

  getTime()
  console.log('[emitter] timeListeners: ', emitter.listeners('time'))
})
</script>
