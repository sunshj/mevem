<template>
  <nav>
    <RouterLink to="/">index</RouterLink>|
    <RouterLink to="/about">about</RouterLink>
  </nav>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import MessageEventEmitter from 'mevem'
import CalcWorker from './calc.worker?worker'
import { provide } from 'vue'
import { workerInjectKey, type ClientEventsMap, type WorkerEventsMap } from './utils'

const worker = new CalcWorker()

const client = new MessageEventEmitter<ClientEventsMap, WorkerEventsMap>({
  on: fn => worker.addEventListener('message', fn),
  post: data => worker.postMessage(data),
  deserialize: ({ data }) => data
})

provide(workerInjectKey, client)
</script>

<style scoped>
nav {
  display: flex;
  justify-content: center;
  gap: 1rem;
}
</style>
