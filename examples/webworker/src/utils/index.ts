import type MessageEventEmitter from 'mevem'
import type { InjectionKey } from 'vue'

export const workerInjectKey = Symbol() as InjectionKey<
  MessageEventEmitter<ClientEventsMap, WorkerEventsMap>
>

/** client emits */
export type ClientEventsMap = {
  sum: (...numbers: number[]) => number
  'generate-numbers': (count: number) => number[]
}

/** worker emits */
export type WorkerEventsMap = {
  sum: (result: number) => void
  'generate-numbers': (numbers: number[]) => number
}

export function randomIn(max: number, min: number) {
  return Math.floor(Math.random() * (max - min) + min)
}

export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
