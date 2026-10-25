import { describe, expectTypeOf, it } from 'vitest'
import MessageEventEmitter, { type Call, type Notify, type Push } from '../src/index'

/** One map for both ends: Call, Notify and Push only differ by direction. */
type EventsMap = {
  sum: Call<(...numbers: number[]) => number>
  'get-numbers': Call<(count: number) => number[]>
  notify: Notify<(payload: string) => void>
  news: Push<(item: string) => void>
}

describe('sender types', () => {
  const client = new MessageEventEmitter<EventsMap>()

  it('emits the client-side events', () => {
    client.emit('sum', 1, 2, 3)
    client.emit('get-numbers', 5)
    client.emit('notify', 'hi')
    // @ts-expect-error wrong argument type
    client.emit('get-numbers', 'nope')
    // @ts-expect-error push events are sent by the server
    client.emit('news', 'x')
    // @ts-expect-error unknown event name
    client.emit('unknown', 1)
  })

  it('listens to the server-side events', () => {
    client.on('sum', result => {
      expectTypeOf(result).toEqualTypeOf<number>()
    })
    client.on('get-numbers', numbers => {
      expectTypeOf(numbers).toEqualTypeOf<number[]>()
    })
    client.on('news', item => {
      expectTypeOf(item).toEqualTypeOf<string>()
    })
    // @ts-expect-error notify events are received by the server
    client.on('notify', () => {})
    // @ts-expect-error unknown event name
    client.on('unknown', () => {})
  })
})

describe('receiver types', () => {
  const server = MessageEventEmitter.createReceiver<EventsMap>()

  it('is equivalent to passing the side as a type argument', () => {
    expectTypeOf(server).toEqualTypeOf<MessageEventEmitter<EventsMap, 'receiver'>>()
  })

  it('listens to the client-side events', () => {
    server.on('sum', (...numbers) => {
      expectTypeOf(numbers).toEqualTypeOf<number[]>()
    })
    server.on('get-numbers', count => {
      expectTypeOf(count).toEqualTypeOf<number>()
    })
    server.on('notify', payload => {
      expectTypeOf(payload).toEqualTypeOf<string>()
    })
    // @ts-expect-error push events are received by the client
    server.on('news', () => {})
  })

  it('emits the server-side events', () => {
    server.emit('sum', 6)
    server.emit('get-numbers', [0, 1, 2])
    server.emit('news', 'hello')
    // @ts-expect-error wrong argument type
    server.emit('sum', 'nope')
    // @ts-expect-error notify events have no reply
    server.emit('notify')
    // @ts-expect-error the client-side arguments are not what a receiver sends
    server.emit('get-numbers', 5)
  })
})

describe('per-event handles', () => {
  it('sender side', () => {
    const events = MessageEventEmitter.createNamespace(new MessageEventEmitter<EventsMap>())

    events.sum.on(result => {
      expectTypeOf(result).toEqualTypeOf<number>()
    })
    events['get-numbers'].once(numbers => {
      expectTypeOf(numbers).toEqualTypeOf<number[]>()
    })
    events.news.on(item => {
      expectTypeOf(item).toEqualTypeOf<string>()
    })

    expectTypeOf(events.sum.emit).parameters.toEqualTypeOf<number[]>()
    expectTypeOf(events['get-numbers'].emit).parameters.toEqualTypeOf<[count: number]>()
    // @ts-expect-error push events are sent by the server
    events.news.emit('x')

    expectTypeOf(events.sum.on(() => {})).toEqualTypeOf<() => void>()
    expectTypeOf(events.sum.once(() => {})).toEqualTypeOf<() => void>()
  })

  it('receiver side', () => {
    const events = MessageEventEmitter.createNamespace(MessageEventEmitter.createReceiver<EventsMap>())

    events.sum.on((...numbers) => {
      expectTypeOf(numbers).toEqualTypeOf<number[]>()
    })

    expectTypeOf(events.sum.emit).parameters.toEqualTypeOf<[number]>()
    expectTypeOf(events.news.emit).parameters.toEqualTypeOf<[item: string]>()
  })

  it('data-style event maps are not supported', () => {
    type DataEvents = { join: { room: string } }
    const dataEvents = MessageEventEmitter.createNamespace(new MessageEventEmitter<DataEvents>())

    expectTypeOf(dataEvents.join.emit).parameters.toEqualTypeOf<never>()
    // @ts-expect-error data-style values are not callable events
    dataEvents.join.emit({ room: 'a' })
  })
})
