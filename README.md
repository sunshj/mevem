# mevem

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]

mevem (<b>M</b>essage <b>Ev</b>ent <b>Em</b>itter) is a type-safe EventEmitter designed to simplify message events.

## Install

```bash
npm install mevem
```

## Usages

<!-- eslint-skip -->

```js
// ESM
import MessageEventEmitter from 'mevem'

// CommonJS
const MessageEventEmitter = require('mevem')

// Browser
<script src="https://unpkg.com/mevem/dist/index.browser.js"></script>
```

### Using WebSocket

```js
// client.js
const ws = new WebSocket('ws://...')

const client = new MessageEventEmitter({
  on: fn => ws.addEventListener('message', fn),
  post: data => ws.send(data),
  deserialize: ({ data }) => JSON.parse(data),
  serialize: v => JSON.stringify(v)
})

client.on('sum', result => {
  console.log(result)
})

client.emit('sum', 1, 2, 3, 4)
```

```js
// server.js
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer()

wss.on('connection', ws => {
  const socket = new MessageEventEmitter({
    on: fn => ws.on('message', fn),
    post: data => ws.send(data),
    deserialize: v => JSON.parse(v),
    serialize: v => JSON.stringify(v)
  })

  socket.on('sum', (...numbers) => {
    const result = numbers.reduce((a, b) => a + b, 0)
    socket.emit('sum', result)
  })
})
```

### Using WebWorkers

```js
// main.js
const worker = new Worker('./worker.js')

const client = new MessageEventEmitter({
  on: fn => worker.addEventListener('message', fn),
  post: data => worker.postMessage(data),
  deserialize: ({ data }) => data
})

client.on('sum', result => {
  console.log(result)
})

client.emit('sum', 1, 2, 3)
```

```js
// worker.js
const worker = new MessageEventEmitter({
  on: fn => self.addEventListener('message', fn),
  post: data => self.postMessage(data),
  deserialize: ({ data }) => data
})

worker.on('sum', (...numbers) => {
  const result = numbers.reduce((acc, cur) => acc + cur, 0)
  worker.emit('sum', result)
})
```

### Type-Safe Events

Define the events **once** and share the same map between both ends. Each shape
takes a single function signature and declares a direction:

| Shape       | Signature means                                           | Who emits | Who listens |
| ----------- | --------------------------------------------------------- | --------- | ----------- |
| `Call<F>`   | client sends `F`'s arguments, server replies `F`'s return | both      | both        |
| `Notify<F>` | client sends `F`'s arguments                              | client    | server      |
| `Push<F>`   | server sends `F`'s arguments                              | server    | client      |

```ts
import MessageEventEmitter, { type Call, type Notify, type Push } from 'mevem'

type EventsMap = {
  sum: Call<(...numbers: number[]) => number>
  'get-numbers': Call<(count: number) => number[]>
  notify: Notify<(payload: string) => void>
  news: Push<(item: string) => void>
}

// client: sends the client-side events, listens for the server ones
const client = MessageEventEmitter.createSender<EventsMap>({
  on: fn => ws.addEventListener('message', fn),
  post: data => ws.send(data),
  deserialize: ({ data }) => JSON.parse(data),
  serialize: JSON.stringify
})

// server: the mirror image, same map
const server = MessageEventEmitter.createReceiver<EventsMap>({
  on: fn => ws.on('message', fn),
  post: data => ws.send(data),
  deserialize: v => JSON.parse(v),
  serialize: JSON.stringify
})
```

Each end only gets the halves it is allowed to use:

```ts
// client
client.emit('sum', 1, 2, 3) // ✔
client.on('sum', result => {}) // result: number
client.emit('notify', 'hi') // ✔ one-way to the server
client.on('news', item => {}) // item: string
client.emit('news', 'x') // ✘ Push events are sent by the server

// server
server.on('sum', (...numbers) => {}) // numbers: number[]
server.emit('sum', 6) // ✔
server.emit('news', 'yo') // ✔ one-way to the client
server.on('notify', payload => {}) // payload: string
server.emit('notify') // ✘ Notify events have no answer
```

A `Call` reply is a single value — `F`'s return type. To send several fields
back, return an object (or destructure a tuple on the listener side).

`MessageEventEmitter.createSender<EventsMap>(...)` is the same as
`new MessageEventEmitter<EventsMap>()`, and `receiver` is the same as
`new MessageEventEmitter<EventsMap, 'receiver'>()`.

### Namespaced Events

`MessageEventEmitter.createNamespace` wraps an emitter and exposes every event as
an object with a consistent API. It is fully decoupled from the string-based API
— both styles operate on the same listeners, and the result is cached per emitter.

Event maps use the same `Call` / `Notify` / `Push` definitions as the core API.

```ts
import MessageEventEmitter, { type Call, type Notify, type Push } from 'mevem'

type EventsMap = {
  sum: Call<(...numbers: number[]) => number>
  'get-numbers': Call<(count: number) => number[]>
  notify: Notify<(payload: string) => void>
  news: Push<(item: string) => void>
}

const client = MessageEventEmitter.createSender<EventsMap>({
  on: fn => ws.addEventListener('message', fn),
  post: data => ws.send(data),
  deserialize: ({ data }) => JSON.parse(data),
  serialize: JSON.stringify
})

const events = MessageEventEmitter.createNamespace(client)

events.sum.on(result => {
  console.log(result) // number
})

events.sum.emit(1, 2, 3)
events['get-numbers'].emit(5)
events.notify.emit('hi')

// consistent per-event API
const unsubscribe = events.sum.on(listener)
const cancelOnce = events.sum.once(listener)
events.sum.off(listener)
events.sum.off() // drop every listener of that event
events.sum.listenerCount()
```

Events this end never sends or receives are still present, but typed with
`never` arguments — calling them is a compile error, same as the string API.

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/mevem?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/mevem
[npm-downloads-src]: https://img.shields.io/npm/dm/mevem?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/mevem
[bundle-src]: https://img.shields.io/bundlephobia/minzip/mevem?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=mevem
[license-src]: https://img.shields.io/github/license/sunshj/mevem.svg?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/mevem
