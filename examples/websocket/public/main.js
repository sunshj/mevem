/* eslint-disable no-undef */

/**
 * @typedef {import('mevem')} Mevem
 */

/**@type {Mevem} */
const { MessageEventEmitter } = mevem

const ws = new WebSocket('ws://localhost:3000')

const client = new MessageEventEmitter({
  handle: fn => ws.addEventListener('message', fn),
  invoke: data => ws.send(data),
  deserialize: ({ data }) => JSON.parse(data),
  serialize: JSON.stringify
})

const resultEl = document.querySelector('#result')
const calcBtn = document.querySelector('#calc')

client.on('sum', result => {
  resultEl.textContent = result
})

calcBtn.addEventListener('click', () => {
  client.emit('sum', 1, 2, 3, 4)
})
