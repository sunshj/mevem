import { randomInt } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import MessageEventEmitter from 'mevem'
import { WebSocketServer } from 'ws'

const server = createServer(async (req, res) => {
  if (req.url === '/') {
    const html = await readFile(path.join(__dirname, '../public', 'index.html'))
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html.toString('utf-8'))
  }

  if (req.url === '/main.js') {
    const js = await readFile(path.join(__dirname, '../public', 'main.js'))
    res.writeHead(200, { 'Content-Type': 'application/javascript' })
    res.end(js.toString('utf-8'))
  }

  if (req.url === '/mevem.js') {
    const js = await readFile(require.resolve('mevem/dist/index.browser.js'))
    res.writeHead(200, { 'Content-Type': 'application/javascript' })
    res.end(js.toString('utf-8'))
  }
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
