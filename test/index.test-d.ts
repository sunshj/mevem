import { describe, expectTypeOf, it } from 'vitest'
import MessageEventEmitter, { type Call, type Notify, type Push } from '../src/index'

/** One map for both ends: Call, Push and Notify only differ by direction. */
type EventsMap = {
  sum: Call<(...numbers: number[]) => number>
  'get-numbers': Call<(count: number) => number[]>
  news: Push<(item: string) => void>
  notify: Notify<(payload: string) => void>
}

describe('publisher types', () => {
  const publisher = new MessageEventEmitter<EventsMap>()

  it('emits the publisher-side events', () => {
    publisher.emit('sum', 1, 2, 3)
    publisher.emit('get-numbers', 5)
    publisher.emit('news', 'x')
    // @ts-expect-error wrong argument type
    publisher.emit('get-numbers', 'nope')
    // @ts-expect-error notify events are sent by the subscriber
    publisher.emit('notify', 'hi')
    // @ts-expect-error unknown event name
    publisher.emit('unknown', 1)
  })

  it('listens to the subscriber-side events', () => {
    publisher.on('sum', result => {
      expectTypeOf(result).toEqualTypeOf<number>()
    })
    publisher.on('get-numbers', numbers => {
      expectTypeOf(numbers).toEqualTypeOf<number[]>()
    })
    publisher.on('notify', payload => {
      expectTypeOf(payload).toEqualTypeOf<string>()
    })
    // @ts-expect-error push events are received by the subscriber
    publisher.on('news', () => {})
    // @ts-expect-error unknown event name
    publisher.on('unknown', () => {})
  })
})

describe('subscriber types', () => {
  const subscriber = MessageEventEmitter.createSubscriber<EventsMap>()

  it('is equivalent to passing the side as a type argument', () => {
    expectTypeOf(subscriber).toEqualTypeOf<MessageEventEmitter<EventsMap, 'subscriber'>>()
  })

  it('listens to the publisher-side events', () => {
    subscriber.on('sum', (...numbers) => {
      expectTypeOf(numbers).toEqualTypeOf<number[]>()
    })
    subscriber.on('get-numbers', count => {
      expectTypeOf(count).toEqualTypeOf<number>()
    })
    subscriber.on('news', item => {
      expectTypeOf(item).toEqualTypeOf<string>()
    })
    // @ts-expect-error notify events are received by the publisher
    subscriber.on('notify', () => {})
  })

  it('emits the subscriber-side events', () => {
    subscriber.emit('sum', 6)
    subscriber.emit('get-numbers', [0, 1, 2])
    subscriber.emit('notify', 'hi')
    // @ts-expect-error wrong argument type
    subscriber.emit('sum', 'nope')
    // @ts-expect-error push events are sent by the publisher
    subscriber.emit('news', 'x')
    // @ts-expect-error the publisher-side arguments are not what a subscriber sends
    subscriber.emit('get-numbers', 5)
  })
})

describe('per-event handles', () => {
  it('publisher side', () => {
    const events = MessageEventEmitter.createNamespace(new MessageEventEmitter<EventsMap>())

    events.sum.on(result => {
      expectTypeOf(result).toEqualTypeOf<number>()
    })
    events['get-numbers'].once(numbers => {
      expectTypeOf(numbers).toEqualTypeOf<number[]>()
    })
    events.notify.on(payload => {
      expectTypeOf(payload).toEqualTypeOf<string>()
    })

    expectTypeOf(events.sum.emit).parameters.toEqualTypeOf<number[]>()
    expectTypeOf(events['get-numbers'].emit).parameters.toEqualTypeOf<[count: number]>()
    expectTypeOf(events.news.emit).parameters.toEqualTypeOf<[item: string]>()
    // @ts-expect-error notify events are sent by the subscriber
    events.notify.emit('x')

    expectTypeOf(events.sum.on(() => {})).toEqualTypeOf<() => void>()
    expectTypeOf(events.sum.once(() => {})).toEqualTypeOf<() => void>()
  })

  it('subscriber side', () => {
    const events = MessageEventEmitter.createNamespace(MessageEventEmitter.createSubscriber<EventsMap>())

    events.sum.on((...numbers) => {
      expectTypeOf(numbers).toEqualTypeOf<number[]>()
    })
    events.news.on(item => {
      expectTypeOf(item).toEqualTypeOf<string>()
    })

    expectTypeOf(events.sum.emit).parameters.toEqualTypeOf<[number]>()
    expectTypeOf(events.notify.emit).parameters.toEqualTypeOf<[payload: string]>()
  })

  it('data-style event maps are not supported', () => {
    type DataEvents = { join: { room: string } }
    const dataEvents = MessageEventEmitter.createNamespace(new MessageEventEmitter<DataEvents>())

    expectTypeOf(dataEvents.join.emit).parameters.toEqualTypeOf<never>()
    // @ts-expect-error data-style values are not callable events
    dataEvents.join.emit({ room: 'a' })
  })
})
