import { randomInt } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import MessageEventEmitter from 'mevem'
import { WebSocketServer } from 'ws'

const emitter = new MessageEventEmitter()

const server = createServer((req, res) => {
  function send(body: any, status = 200, headers: Record<string, string> = {}) {
    res.writeHead(status, headers)
    return res.end(body)
  }

  emitter.on('/', async () => {
    const html = await readFile(path.join(__dirname, '../public', 'index.html'))
    send(html.toString('utf-8'), 200, { 'Content-Type': 'text/html' })
  })

  emitter.on('/main.js', async () => {
    const js = await readFile(path.join(__dirname, '../public', 'main.js'))
    send(js.toString('utf-8'), 200, { 'Content-Type': 'application/javascript' })
  })

  emitter.on('/mevem.js', async () => {
    const js = await readFile(require.resolve('mevem/dist/index.browser.js'))
    send(js.toString('utf-8'), 200, { 'Content-Type': 'application/javascript' })
  })

  emitter.emit(req.url!)
})

const wss = new WebSocketServer({ server })

wss.on('connection', ws => {
  const socket = new MessageEventEmitter<ServerEvents, ClientEvents>({
    on: fn => ws.addEventListener('message', fn),
    post: data => ws.send(data),
    deserialize: ({ data }) => JSON.parse(data),
    serialize: JSON.stringify
  })

  socket.on('sum', (...numbers) => {
    const result = numbers.reduce((a, b) => a + b, 0)
    socket.emit('sum', result)
  })

  socket.on('get-numbers', n => {
    const result = Array.from({ length: n }, () => randomInt(1, 10))
    socket.emit('get-numbers', result)
  })
})

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
