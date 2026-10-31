import { describe, expect, it, vi } from 'vitest'
import MessageEventEmitter, { type Call, type Notify, type Push } from '../src/index'

type EventsMap = {
  sum: Call<(...numbers: number[]) => number>
  'get-numbers': Call<(count: number) => number[]>
  notify: Notify<(payload: string) => void>
  news: Push<(item: string) => void>
}

function createPair() {
  const publisherHandlers: Array<(data: any) => void> = []
  const subscriberHandlers: Array<(data: any) => void> = []

  const publisher = MessageEventEmitter.createPublisher<EventsMap>({
    subscribe: fn => publisherHandlers.push(fn),
    publish: data => subscriberHandlers.forEach(fn => fn(data)),
    serialize: JSON.stringify,
    deserialize: JSON.parse
  })

  const subscriber = MessageEventEmitter.createSubscriber<EventsMap>({
    subscribe: fn => subscriberHandlers.push(fn),
    publish: data => publisherHandlers.forEach(fn => fn(data)),
    serialize: JSON.stringify,
    deserialize: JSON.parse
  })

  return { publisher, subscriber }
}

describe('MessageEventEmitter', () => {
  it('loops back events by default', () => {
    const emitter = new MessageEventEmitter()
    const fn = vi.fn()
    emitter.on('hello', fn)
    emitter.emit('hello', 1, 'a')
    expect(fn).toHaveBeenCalledWith(1, 'a')
  })

  it('bridges publisher and subscriber with serialization', () => {
    const { publisher, subscriber } = createPair()
    const results: number[] = []

    subscriber.on('sum', (...numbers) => {
      subscriber.emit(
        'sum',
        numbers.reduce((a, b) => a + b, 0)
      )
    })
    publisher.on('sum', result => {
      results.push(result)
    })

    publisher.emit('sum', 1, 2, 3)
    expect(results).toEqual([6])
  })

  it('supports one-way events in both directions', () => {
    const { publisher, subscriber } = createPair()
    const received: string[] = []

    subscriber.on('news', item => received.push(`subscriber:${item}`))
    publisher.on('notify', payload => received.push(`publisher:${payload}`))

    publisher.emit('news', 'yo')
    subscriber.emit('notify', 'hi')

    expect(received).toEqual(['subscriber:yo', 'publisher:hi'])
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

  it('once returns an unsubscribe function', () => {
    const emitter = new MessageEventEmitter()
    const fn = vi.fn()
    const unsubscribe = emitter.once('foo', fn)

    unsubscribe()
    emitter.emit('foo')
    expect(fn).not.toHaveBeenCalled()
    expect(emitter.listenerCount('foo')).toBe(0)
  })

  it('a throwing once listener is still removed', () => {
    const emitter = new MessageEventEmitter()
    const fn = vi.fn(() => {
      throw new Error('boom')
    })
    emitter.once('foo', fn)

    expect(() => emitter.emit('foo')).toThrow('boom')
    expect(emitter.listenerCount('foo')).toBe(0)
  })

  it('a re-entrant once listener fires only once', () => {
    const emitter = new MessageEventEmitter()
    const fn = vi.fn(() => {
      emitter.emit('foo')
    })
    emitter.once('foo', fn)

    emitter.emit('foo')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(emitter.listenerCount('foo')).toBe(0)
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

describe('createNamespace', () => {
  it('shares listeners with the core string API', () => {
    const emitter = new MessageEventEmitter()
    const events = MessageEventEmitter.createNamespace(emitter)
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

  it('works across a bridged publisher/subscriber pair', () => {
    const { publisher, subscriber } = createPair()
    const publisherEvents = MessageEventEmitter.createNamespace(publisher)
    const subscriberEvents = MessageEventEmitter.createNamespace(subscriber)
    const results: number[][] = []

    subscriberEvents['get-numbers'].on(count => {
      subscriberEvents['get-numbers'].emit(Array.from({ length: count }, (_, i) => i))
    })
    publisherEvents['get-numbers'].on(numbers => {
      results.push(numbers)
    })

    publisherEvents['get-numbers'].emit(3)
    expect(results).toEqual([[0, 1, 2]])
  })

  it('on returns an unsubscribe function', () => {
    const events = MessageEventEmitter.createNamespace(new MessageEventEmitter())
    const fn = vi.fn()
    const unsubscribe = events.foo.on(fn)

    unsubscribe()
    events.foo.emit()
    expect(fn).not.toHaveBeenCalled()
  })

  it('once fires only once', () => {
    const events = MessageEventEmitter.createNamespace(new MessageEventEmitter())
    const fn = vi.fn()
    events.foo.once(fn)

    events.foo.emit(1)
    events.foo.emit(2)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('off removes a specific listener, off() removes them all', () => {
    const events = MessageEventEmitter.createNamespace(new MessageEventEmitter())
    const a = vi.fn()
    const b = vi.fn()
    events.foo.on(a)
    events.foo.on(b)
    expect(events.foo.listenerCount()).toBe(2)

    events.foo.off(a)
    expect(events.foo.listenerCount()).toBe(1)

    events.foo.off()
    expect(events.foo.listenerCount()).toBe(0)
    events.foo.emit()
    expect(a).not.toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
  })

  it('supports symbol event names', () => {
    const events = MessageEventEmitter.createNamespace(new MessageEventEmitter())
    const sym = Symbol('sym')
    const fn = vi.fn()

    events[sym].on(fn)
    events[sym].emit('data')
    expect(fn).toHaveBeenCalledWith('data')
  })

  it('caches one event object per key', () => {
    const events = MessageEventEmitter.createNamespace(new MessageEventEmitter())
    expect(events.foo).toBe(events.foo)
    expect(events.foo).not.toBe(events.bar)
  })

  it('does not modify the emitter instance', () => {
    const emitter = new MessageEventEmitter()
    const events = MessageEventEmitter.createNamespace(emitter)

    events.foo.on(() => {})
    expect('foo' in emitter).toBe(false)
    expect(emitter.listenerCount('foo')).toBe(1)
  })

  it('returns one namespace per emitter', () => {
    const a = new MessageEventEmitter()
    const b = new MessageEventEmitter()

    expect(MessageEventEmitter.createNamespace(a)).toBe(MessageEventEmitter.createNamespace(a))
    expect(MessageEventEmitter.createNamespace(a)).not.toBe(MessageEventEmitter.createNamespace(b))
  })

  it('is not thenable', async () => {
    const events = MessageEventEmitter.createNamespace(new MessageEventEmitter())

    await expect(Promise.resolve(events)).resolves.toBe(events)
  })
})
