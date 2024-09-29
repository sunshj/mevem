<template>
  <h2>about page</h2>
</template>

<script setup lang="ts">
import { inject, onMounted } from 'vue'
import { workerInjectKey } from '../utils'

const worker = inject(workerInjectKey)!

onMounted(() => {
  console.log(worker)
  console.log(worker.listeners('generate-numbers'))
})
</script>
