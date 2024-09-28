const ws = new WebSocket('ws://localhost:3000')

const client = new window.MessageEventEmitter({
  on: fn => ws.addEventListener('message', fn),
  post: data => ws.send(data),
  deserialize: ({ data }) => JSON.parse(data),
  serialize: JSON.stringify
})

const numbersEl = document.querySelector('#numbers')
const resultEl = document.querySelector('#result')
const resetBtn = document.querySelector('#reset')
const calcBtn = document.querySelector('#calc')

/**@type {{numbers: number[]}} */
const state = new Proxy(
  {
    numbers: []
  },
  {
    set(target, key, value) {
      return Reflect.set(target, key, value)
    },
    get(target, key) {
      return Reflect.get(target, key)
    }
  }
)

/**
 * @param {Element | null} el
 * @param {string} content
 */
function render(el, content) {
  if (!el) return
  el.textContent = content
}

const cleanUpSum = client.on('sum', result => {
  if (!resultEl) return
  resultEl.textContent = result.toString()
})

const cleanUpGetNumbers = client.on('get-numbers', numbers => {
  state.numbers = numbers
  render(numbersEl, numbers.join('+'))
})

resetBtn?.addEventListener('click', () => {
  render(resultEl, '?')
  client.emit('get-numbers', 4)
})

calcBtn?.addEventListener('click', () => {
  client.emit('sum', ...state.numbers)
})

ws.addEventListener('open', () => {
  client.emit('get-numbers', 4)
})

window.addEventListener('beforeunload', () => {
  cleanUpSum()
  cleanUpGetNumbers()
  ws.close()
})
