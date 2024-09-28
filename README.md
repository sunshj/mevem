# mevem

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]

mevem (Message Event Emitter)

## Install

```bash
npm install mevem
```

## Usages

```js
import MessageEventEmitter from 'mevem'
```

### Using WebSocket

```js
// client.js
const ws = new WebSocket('ws://...')

const client = new MessageEventEmitter({
  handle: fn => ws.addEventListener('message', fn),
  invoke: data => ws.send(data),
  deserialize: ({ data }) => JSON.parse(data),
  serialize: JSON.stringify
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
    handle: fn => ws.addEventListener('message', fn),
    invoke: data => ws.send(data),
    deserialize: ({ data }) => JSON.parse(data),
    serialize: JSON.stringify
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
  handle: fn => worker.addEventListener('message', fn),
  invoke: data => worker.postMessage(data),
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
  handle: fn => self.addEventListener('message', fn),
  invoke: data => self.postMessage(data),
  deserialize: ({ data }) => data
})

worker.on('sum', (...numbers) => {
  const result = numbers.reduce((acc, cur) => acc + cur, 0)
  worker.emit('sum', result)
})
```

### type-safe events

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
