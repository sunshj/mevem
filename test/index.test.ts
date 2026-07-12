import { describe, expect, it, vi } from 'vitest'
import MessageEventEmitter from '../src/index'

type ClientEmitsMap = {
  sum: (...numbers: number[]) => void
  'get-numbers': (count: number) => void
}

type ServerEmitsMap = {
  sum: (result: number) => void
  'get-numbers': (numbers: number[]) => void
}

function createPair() {
  const clientHandlers: Array<(data: any) => void> = []
  const serverHandlers: Array<(data: any) => void> = []

  const client = new MessageEventEmitter<ClientEmitsMap, ServerEmitsMap>({
    on: fn => clientHandlers.push(fn),
    post: data => serverHandlers.forEach(fn => fn(data)),
    serialize: JSON.stringify,
    deserialize: JSON.parse
  })

  const server = new MessageEventEmitter<ServerEmitsMap, ClientEmitsMap>({
    on: fn => serverHandlers.push(fn),
    post: data => clientHandlers.forEach(fn => fn(data)),
    serialize: JSON.stringify,
    deserialize: JSON.parse
  })

  return { client, server }
}

describe('MessageEventEmitter', () => {
  it('loops back events by default', () => {
    const emitter = new MessageEventEmitter()
    const fn = vi.fn()
    emitter.on('hello', fn)
    emitter.emit('hello', 1, 'a')
    expect(fn).toHaveBeenCalledWith(1, 'a')
  })

  it('bridges client and server with serialization', () => {
    const { client, server } = createPair()
    const results: number[] = []

    server.on('sum', (...numbers) => {
      server.emit(
        'sum',
        numbers.reduce((a, b) => a + b, 0)
      )
    })
    client.on('sum', result => {
      results.push(result)
    })

    client.emit('sum', 1, 2, 3)
    expect(results).toEqual([6])
  })

  it('on returns an unsubscribe function', () => {
    const emitter = new MessageEventEmitter()
    const fn = vi.fn()
    const unsubscribe = emitter.on('foo', fn)

    unsubscribe()
    emitter.emit('foo')
    expect(fn).not.toHaveBeenCalled()
  })

  it('once fires only once', () => {
    const emitter = new MessageEventEmitter()
    const fn = vi.fn()
    emitter.once('foo', fn)

    emitter.emit('foo', 1)
    emitter.emit('foo', 2)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)
  })

  it('off removes a specific listener', () => {
    const emitter = new MessageEventEmitter()
    const a = vi.fn()
    const b = vi.fn()
    emitter.on('foo', a)
    emitter.on('foo', b)

    emitter.off('foo', a)
    emitter.emit('foo')
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('off without listener removes all listeners for the event', () => {
    const emitter = new MessageEventEmitter()
    const a = vi.fn()
    const b = vi.fn()
    emitter.on('foo', a)
    emitter.on('foo', b)

    emitter.off('foo')
    emitter.emit('foo')
    expect(a).not.toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
  })

  it('tracks eventNames and listenerCount', () => {
    const emitter = new MessageEventEmitter()
    emitter.on('foo', () => {})
    emitter.on('foo', () => {})
    emitter.on('bar', () => {})

    expect(emitter.eventNames).toEqual(['foo', 'bar'])
    expect(emitter.listenerCount('foo')).toBe(2)
    expect(emitter.listenerCount('bar')).toBe(1)
    expect(emitter.listenerCount('baz')).toBe(0)
  })

  it('removeAllListeners clears everything', () => {
    const emitter = new MessageEventEmitter()
    const fn = vi.fn()
    emitter.on('foo', fn)
    emitter.on('bar', fn)

    emitter.removeAllListeners()
    emitter.emit('foo')
    emitter.emit('bar')
    expect(fn).not.toHaveBeenCalled()
    expect(emitter.eventNames).toEqual([])
  })
})

describe('withNamespace', () => {
  it('shares listeners with the core string API', () => {
    const emitter = new MessageEventEmitter()
    const events = MessageEventEmitter.withNamespace(emitter)
    const viaNamespace = vi.fn()
    const viaString = vi.fn()

    events.greet.on(viaNamespace)
    emitter.on('greet', viaString)

    events.greet.emit('hi')
    expect(viaNamespace).toHaveBeenCalledWith('hi')
    expect(viaString).toHaveBeenCalledWith('hi')

    emitter.emit('greet', 'yo')
    expect(viaNamespace).toHaveBeenCalledWith('yo')
    expect(viaNamespace).toHaveBeenCalledTimes(2)
  })

  it('works across a bridged client/server pair', () => {
    const { client, server } = createPair()
    const clientEvents = MessageEventEmitter.withNamespace(client)
    const serverEvents = MessageEventEmitter.withNamespace(server)
    const results: number[][] = []

    serverEvents['get-numbers'].on(count => {
      serverEvents['get-numbers'].emit(Array.from({ length: count }, (_, i) => i))
    })
    clientEvents['get-numbers'].on(numbers => {
      results.push(numbers)
    })

    clientEvents['get-numbers'].emit(3)
    expect(results).toEqual([[0, 1, 2]])
  })

  it('on returns an unsubscribe function', () => {
    const events = MessageEventEmitter.withNamespace(new MessageEventEmitter())
    const fn = vi.fn()
    const unsubscribe = events.foo.on(fn)

    unsubscribe()
    events.foo.emit()
    expect(fn).not.toHaveBeenCalled()
  })

  it('once fires only once', () => {
    const events = MessageEventEmitter.withNamespace(new MessageEventEmitter())
    const fn = vi.fn()
    events.foo.once(fn)

    events.foo.emit(1)
    events.foo.emit(2)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('off removes a specific listener, clear removes all', () => {
    const events = MessageEventEmitter.withNamespace(new MessageEventEmitter())
    const a = vi.fn()
    const b = vi.fn()
    events.foo.on(a)
    events.foo.on(b)
    expect(events.foo.listenerCount()).toBe(2)

    events.foo.off(a)
    expect(events.foo.listenerCount()).toBe(1)

    events.foo.clear()
    expect(events.foo.listenerCount()).toBe(0)
    events.foo.emit()
    expect(a).not.toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
  })

  it('supports symbol event names', () => {
    const events = MessageEventEmitter.withNamespace(new MessageEventEmitter())
    const sym = Symbol('sym')
    const fn = vi.fn()

    events[sym].on(fn)
    events[sym].emit('data')
    expect(fn).toHaveBeenCalledWith('data')
  })

  it('caches one event object per key', () => {
    const events = MessageEventEmitter.withNamespace(new MessageEventEmitter())
    expect(events.foo).toBe(events.foo)
    expect(events.foo).not.toBe(events.bar)
  })

  it('does not modify the emitter instance', () => {
    const emitter = new MessageEventEmitter()
    const events = MessageEventEmitter.withNamespace(emitter)

    events.foo.on(() => {})
    expect('foo' in emitter).toBe(false)
    expect(emitter.listenerCount('foo')).toBe(1)
  })
})
