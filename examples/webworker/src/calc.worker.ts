import MessageEventEmitter from 'mevem'
import { randomIn, type ClientEventsMap, type WorkerEventsMap } from './utils'

const worker = new MessageEventEmitter<WorkerEventsMap, ClientEventsMap>({
  on: fn => self.addEventListener('message', fn),
  post: data => self.postMessage(data),
  deserialize: ({ data }) => data,
  experimental: {
    returnValue: true
  }
})

worker.on('sum', (...numbers) => {
  const result = numbers.reduce((acc, curr) => acc + curr, 0)
  // worker.emit('sum', result)
  return result
})

worker.on('generate-numbers', n => {
  const numbers = Array.from({ length: n }, () => randomIn(1, 10))
  // worker.emit('generate-numbers', numbers)
  return numbers
})
