type Fn = (...args: any[]) => any

type EventName = string | symbol

type IsAny<T> = 0 extends 1 & T ? true : false

type ReplyOf<F extends Fn> = IsAny<ReturnType<F>> extends true ? any[] : [ReturnType<F>] extends [void] ? [] : [ReturnType<F>]

/** Client sends the arguments, server replies with the return value. */
export type Call<F extends Fn> = {
  readonly send: Parameters<F>
  readonly recv: ReplyOf<F>
}

/** Client → server, no reply. */
export type Notify<F extends Fn> = {
  readonly send: Parameters<F>
}

/** Server → client, no reply. */
export type Push<F extends Fn> = {
  readonly recv: Parameters<F>
}

/** Which end of the event map an emitter is. */
export type EventSide = 'sender' | 'receiver'

type DefaultEventsMap = Record<EventName, Call<Fn>>

/** Flattens a type so IDE hover shows the resolved members. */
type Prettify<T> = { [K in keyof T]: T[K] } & {}

type SendOf<Event> = Event extends { readonly send: infer Args extends any[] } ? Args : never

type RecvOf<Event> = Event extends { readonly recv: infer Args extends any[] } ? Args : never

type SentArgs<Event, Side extends EventSide> = [Side] extends ['sender'] ? SendOf<Event> : RecvOf<Event>

type ReceivedArgs<Event, Side extends EventSide> = [Side] extends ['sender'] ? RecvOf<Event> : SendOf<Event>

/** `never` for the events this end is not allowed to send / receive. */
type SentKeys<Events, Side extends EventSide> = {
  [K in keyof Events]: [SentArgs<Events[K], Side>] extends [never] ? never : K
}[keyof Events]

type ReceivedKeys<Events, Side extends EventSide> = {
  [K in keyof Events]: [ReceivedArgs<Events[K], Side>] extends [never] ? never : K
}[keyof Events]

export interface Options {
  /** The function that will be called when a message is received. */
  on?: (fn: Fn) => void
  /** The function that will be called when a message is sent. */
  post?: (data: any) => void
  /** The function that will be called to serialize data before sending it. */
  serialize?: (v: any) => any
  /** The function that will be called to deserialize data after receiving it. */
  deserialize?: (v: any) => any
}

class MessageEventEmitter<Events extends object = DefaultEventsMap, Side extends EventSide = 'sender'> {
  #listeners: Map<keyof Events, Set<Fn>> = new Map()

  constructor(private options: Options = {}) {
    this.options = {
      on: fn => fn,
      post: data => this.#dispatchEvent(data),
      deserialize: v => v,
      serialize: v => v,
      ...options
    }

    this.options.on?.(e => this.#dispatchEvent(e))
  }

  static createSender<Events extends object>(options?: Options) {
    return new MessageEventEmitter<Events, 'sender'>(options)
  }

  static createReceiver<Events extends object>(options?: Options) {
    return new MessageEventEmitter<Events, 'receiver'>(options)
  }

  /** Exposes every event as an object, backed by the same listeners. */
  static createNamespace<Events extends object, Side extends EventSide>(
    emitter: MessageEventEmitter<Events, Side>
  ): NamespacedEvents<Events, Side> {
    const cached = namespaces.get(emitter)
    if (cached) return cached as NamespacedEvents<Events, Side>

    const cache = new Map<PropertyKey, MessageEvent<any, any>>()

    const namespace = new Proxy(Object.create(null), {
      get(_, key) {
        // A thenable namespace would break `await emitter` and `Promise.resolve`.
        if (key === 'then') return undefined

        if (!cache.has(key)) {
          const event: MessageEvent<any, any> = {
            on: listener => emitter.on(key as ReceivedKeys<Events, Side>, listener),
            once: listener => emitter.once(key as ReceivedKeys<Events, Side>, listener),
            off: listener => emitter.off(key as ReceivedKeys<Events, Side>, listener),
            emit: (...args) => (emitter.emit as Fn)(key, ...args),
            listenerCount: () => emitter.listenerCount(key as keyof Events)
          }

          cache.set(key, event)
        }

        return cache.get(key)
      }
    }) as NamespacedEvents<Events, Side>

    namespaces.set(emitter, namespace)

    return namespace
  }

  #dispatchEvent(event: any) {
    const [type, ...args] = this.options.deserialize?.(event) ?? event
    this.listeners(type as keyof Events)?.forEach(listener => listener(...args))
  }

  on<K extends ReceivedKeys<Events, Side>>(type: K, listener: (...args: ReceivedArgs<Events[K], Side>) => unknown) {
    if (!this.#listeners.has(type)) {
      this.#listeners.set(type, new Set())
    }

    this.listeners(type)?.add(listener)

    return () => {
      this.off(type, listener)
    }
  }

  emit<K extends SentKeys<Events, Side>>(type: K, ...args: SentArgs<Events[K], Side>) {
    this.options.post?.(this.options.serialize?.([type, ...args]))
  }

  off<K extends ReceivedKeys<Events, Side>>(type: K, listener?: (...args: ReceivedArgs<Events[K], Side>) => unknown) {
    if (!listener) {
      this.#listeners.delete(type)
      return
    }
    this.listeners(type)?.delete(listener)
    if (this.listenerCount(type) === 0) {
      this.#listeners.delete(type)
    }
  }

  once<K extends ReceivedKeys<Events, Side>>(type: K, listener: (...args: ReceivedArgs<Events[K], Side>) => unknown) {
    const onceListener = (...args: ReceivedArgs<Events[K], Side>) => {
      // Remove first: a throwing or re-entrant listener must not fire twice.
      this.off(type, onceListener)
      listener(...args)
    }

    return this.on(type, onceListener)
  }

  get eventNames() {
    return [...this.#listeners.keys()]
  }

  listeners<K extends keyof Events>(type: K) {
    return this.#listeners.get(type)
  }

  listenerCount<K extends keyof Events>(type: K) {
    return this.listeners(type)?.size || 0
  }

  removeAllListeners() {
    this.#listeners.clear()
  }
}

const namespaces = new WeakMap<object, NamespacedEvents<any, any>>()

interface MessageEvent<Event, Side extends EventSide = 'sender'> {
  on: (listener: (...args: ReceivedArgs<Event, Side>) => unknown) => () => void
  once: (listener: (...args: ReceivedArgs<Event, Side>) => unknown) => () => void
  off: (listener?: (...args: ReceivedArgs<Event, Side>) => unknown) => void
  emit: (...args: SentArgs<Event, Side>) => void
  listenerCount: () => number
}

/**
 * Homomorphic (`[K in keyof Events]`) so IDE "Go to Definition" still lands on
 * the original event declaration.
 */
export type NamespacedEvents<Events extends object, Side extends EventSide = 'sender'> = {
  readonly [K in keyof Events]: Prettify<MessageEvent<Events[K], Side>>
}

export default MessageEventEmitter
