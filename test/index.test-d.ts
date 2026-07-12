import { describe, expectTypeOf, it } from 'vitest'
import MessageEventEmitter from '../src/index'

type ClientEmitsMap = {
  sum: (...numbers: number[]) => void
  'get-numbers': (count: number) => void
}

type ServerEmitsMap = {
  sum: (result: number) => void
  'get-numbers': (numbers: number[]) => void
}

describe('core string API types', () => {
  const client = new MessageEventEmitter<ClientEmitsMap, ServerEmitsMap>()

  it('on listener args are inferred from OnEvents', () => {
    client.on('sum', result => {
      expectTypeOf(result).toEqualTypeOf<number>()
    })
    client.on('get-numbers', numbers => {
      expectTypeOf(numbers).toEqualTypeOf<number[]>()
    })
    // @ts-expect-error unknown event name
    client.on('unknown', () => {})
  })

  it('emit args are inferred from EmitEvents', () => {
    client.emit('sum', 1, 2, 3)
    client.emit('get-numbers', 5)
    // @ts-expect-error wrong argument type
    client.emit('get-numbers', 'nope')
    // @ts-expect-error unknown event name
    client.emit('unknown', 1)
  })
})

describe('namespace API types', () => {
  const client = new MessageEventEmitter<ClientEmitsMap, ServerEmitsMap>()
  const events = MessageEventEmitter.withNamespace(client)

  it('listener args are inferred from OnEvents', () => {
    events.sum.on(result => {
      expectTypeOf(result).toEqualTypeOf<number>()
    })
    events.sum.once(result => {
      expectTypeOf(result).toEqualTypeOf<number>()
    })
    events['get-numbers'].on(numbers => {
      expectTypeOf(numbers).toEqualTypeOf<number[]>()
    })
  })

  it('emit args are inferred from EmitEvents', () => {
    expectTypeOf(events.sum.emit).parameters.toEqualTypeOf<number[]>()
    expectTypeOf(events['get-numbers'].emit).parameters.toEqualTypeOf<[count: number]>()
    // @ts-expect-error wrong argument type
    events['get-numbers'].emit('nope')
  })

  it('on returns an unsubscribe function', () => {
    expectTypeOf(events.sum.on(() => {})).toEqualTypeOf<() => void>()
  })

  it('data-style event maps are not supported', () => {
    type DataEvents = { join: { room: string } }
    const dataEvents = MessageEventEmitter.withNamespace<DataEvents, DataEvents>(
      new MessageEventEmitter()
    )

    expectTypeOf(dataEvents.join.emit).parameters.toEqualTypeOf<never>()
    // @ts-expect-error data-style values are not callable events
    dataEvents.join.emit({ room: 'a' })
  })
})
