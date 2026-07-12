# mevem

[npm version][npm-version-href]
[npm downloads][npm-downloads-href]
[bundle][bundle-href]
[JSDocs][jsdocs-href]

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

```ts
// client emits
type ClientEmitsMap = {
  sum: (...numbers: number[]) => void
}

// server emits
type ServerEmitsMap = {
  sum: (result: number) => void
}

// client side
const client = new MessageEventEmitter<ClientEmitsMap, ServerEmitsMap>({})

// server side
const server = new MessageEventEmitter<ServerEmitsMap, ClientEmitsMap>({})
```

### Namespaced Events

`MessageEventEmitter.withNamespace` wraps an emitter and exposes each event as
an object with a consistent API. It is fully decoupled from the core
string-based API — both styles operate on the same listeners.

Event maps use function-style definitions, same as the core API.

```ts
import MessageEventEmitter from 'mevem'

type ClientEmitsMap = {
  sum: (...numbers: number[]) => void
  'get-numbers': (count: number) => void
}

type ServerEmitsMap = {
  sum: (result: number) => void
  'get-numbers': (numbers: number[]) => void
}

const client = new MessageEventEmitter<ClientEmitsMap, ServerEmitsMap>({
  on: fn => ws.addEventListener('message', fn),
  post: data => ws.send(data),
  deserialize: ({ data }) => JSON.parse(data),
  serialize: JSON.stringify
})

const events = MessageEventEmitter.withNamespace(client)

// listener parameters are inferred from OnEvents
events.sum.on(result => {
  console.log(result) // number
})

// emit parameters are inferred from EmitEvents
events.sum.emit(1, 2, 3)
events['get-numbers'].emit(5)

// consistent per-event API
const unsubscribe = events.sum.on(listener)
events.sum.once(listener)
events.sum.off(listener)
events.sum.listenerCount()
events.sum.clear()
```

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
