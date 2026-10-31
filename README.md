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
  subscribe: fn => ws.addEventListener('message', fn),
  publish: data => ws.send(data),
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
    subscribe: fn => ws.on('message', fn),
    publish: data => ws.send(data),
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
  subscribe: fn => worker.addEventListener('message', fn),
  publish: data => worker.postMessage(data),
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
  subscribe: fn => self.addEventListener('message', fn),
  publish: data => self.postMessage(data),
  deserialize: ({ data }) => data
})

worker.on('sum', (...numbers) => {
  const result = numbers.reduce((acc, cur) => acc + cur, 0)
  worker.emit('sum', result)
})
```

### Type-Safe Events

Define the events **once** and share the same map between both ends. Each shape
takes a single function signature and declares a direction, written from the
publisher's side:

| Shape       | Signature means                                                  | Who emits  | Who listens |
| ----------- | ---------------------------------------------------------------- | ---------- | ----------- |
| `Call<F>`   | publisher sends `F`'s arguments, subscriber replies `F`'s return | both       | both        |
| `Push<F>`   | publisher sends `F`'s arguments                                  | publisher  | subscriber  |
| `Notify<F>` | subscriber sends `F`'s arguments                                 | subscriber | publisher   |

```ts
import MessageEventEmitter, { type Call, type Notify, type Push } from 'mevem'

type EventsMap = {
  sum: Call<(...numbers: number[]) => number>
  'get-numbers': Call<(count: number) => number[]>
  news: Push<(item: string) => void>
  notify: Notify<(payload: string) => void>
}

// the ws client is the publisher: it sends the request half of every event
const client = MessageEventEmitter.createPublisher<EventsMap>({
  subscribe: fn => ws.addEventListener('message', fn),
  publish: data => ws.send(data),
  deserialize: ({ data }) => JSON.parse(data),
  serialize: JSON.stringify
})

// the ws server is the mirror image, from the same map
const server = MessageEventEmitter.createSubscriber<EventsMap>({
  subscribe: fn => ws.on('message', fn),
  publish: data => ws.send(data),
  deserialize: v => JSON.parse(v),
  serialize: JSON.stringify
})
```

Each end only gets the halves it is allowed to use:

```ts
// client (publisher)
client.emit('sum', 1, 2, 3) // ✔
client.on('sum', result => {}) // result: number
client.emit('news', 'x') // ✔ one-way to the subscriber
client.on('notify', payload => {}) // payload: string
client.emit('notify', 'hi') // ✘ Notify events are sent by the subscriber

// server (subscriber)
server.on('sum', (...numbers) => {}) // numbers: number[]
server.emit('sum', 6) // ✔
server.emit('notify', 'hi') // ✔ one-way to the publisher
server.on('news', item => {}) // item: string
server.emit('news', 'x') // ✘ Push events are sent by the publisher
```

A `Call` reply is a single value — `F`'s return type. To send several fields
back, return an object (or destructure a tuple on the listener side).

`MessageEventEmitter.createPublisher<EventsMap>(...)` is the same as
`new MessageEventEmitter<EventsMap>()`, and `createSubscriber` is the same as
`new MessageEventEmitter<EventsMap, 'subscriber'>()`.

### Namespaced Events

`MessageEventEmitter.createNamespace` wraps an emitter and exposes every event as
an object with a consistent API. It is fully decoupled from the string-based API
— both styles operate on the same listeners, and the result is cached per emitter.

Event maps use the same `Call` / `Push` / `Notify` definitions as the core API.

```ts
import MessageEventEmitter, { type Call, type Notify, type Push } from 'mevem'

type EventsMap = {
  sum: Call<(...numbers: number[]) => number>
  'get-numbers': Call<(count: number) => number[]>
  news: Push<(item: string) => void>
  notify: Notify<(payload: string) => void>
}

const client = MessageEventEmitter.createPublisher<EventsMap>({
  subscribe: fn => ws.addEventListener('message', fn),
  publish: data => ws.send(data),
  deserialize: ({ data }) => JSON.parse(data),
  serialize: JSON.stringify
})

const events = MessageEventEmitter.createNamespace(client)

events.sum.on(result => {
  console.log(result) // number
})

events.sum.emit(1, 2, 3)
events['get-numbers'].emit(5)
events.news.emit('hi')

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
