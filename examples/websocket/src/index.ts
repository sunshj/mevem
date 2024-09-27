import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MessageEventEmitter } from 'mevem'
import { WebSocketServer } from 'ws'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const _require = createRequire(import.meta.url)

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
    const js = await readFile(_require.resolve('mevem/dist/index.browser.js'))
    res.writeHead(200, { 'Content-Type': 'application/javascript' })
    res.end(js.toString('utf-8'))
  }
})

const wss = new WebSocketServer({ server })

type ServerEvents = {
  sum: (result: number) => void
}

type ClientEvents = {
  sum: (...numbers: number[]) => void
}

wss.on('connection', ws => {
  const socket = new MessageEventEmitter<ServerEvents, ClientEvents>({
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

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
