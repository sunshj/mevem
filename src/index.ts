type Fn = (...args: any[]) => any

type EventName = string | symbol

type IsAny<T> = 0 extends 1 & T ? true : false

type ReplyOf<F extends Fn> = IsAny<ReturnType<F>> extends true ? any[] : [ReturnType<F>] extends [void] ? [] : [ReturnType<F>]

/** Publisher publishes the arguments, subscriber replies with the return value. */
export type Call<F extends Fn> = {
  readonly _pub: Parameters<F>
  readonly _sub: ReplyOf<F>
}

/** Publisher → subscriber, no reply. */
export type Push<F extends Fn> = {
  readonly _pub: Parameters<F>
}

/** Subscriber → publisher, no reply. */
export type Notify<F extends Fn> = {
  readonly _sub: Parameters<F>
}

/** Which end of the map an emitter is; the map is written from the publisher's side. */
export type EventSide = 'publisher' | 'subscriber'

type DefaultEventsMap = Record<EventName, Call<Fn>>

type PublishOf<Event> = Event extends { readonly _pub: infer Args extends any[] } ? Args : never

type SubscribeOf<Event> = Event extends { readonly _sub: infer Args extends any[] } ? Args : never

type EmitArgs<Event, Side extends EventSide> = [Side] extends ['publisher'] ? PublishOf<Event> : SubscribeOf<Event>

type ListenerArgs<Event, Side extends EventSide> = [Side] extends ['publisher'] ? SubscribeOf<Event> : PublishOf<Event>

/** `never` for the events this end cannot emit / listen to. */
type EmitKeys<Events, Side extends EventSide> = {
  [K in keyof Events]: [EmitArgs<Events[K], Side>] extends [never] ? never : K
}[keyof Events]

type ListenerKeys<Events, Side extends EventSide> = {
  [K in keyof Events]: [ListenerArgs<Events[K], Side>] extends [never] ? never : K
}[keyof Events]

export interface Options {
  /** Subscribes to the transport: calls `fn` for every incoming message. */
  subscribe?: (fn: Fn) => void
  /** Sends a message over the transport. */
  publish?: (data: any) => void
  /** The function that will be called to serialize data before sending it. */
  serialize?: (v: any) => any
  /** The function that will be called to deserialize data after receiving it. */
  deserialize?: (v: any) => any
}

class MessageEventEmitter<Events extends object = DefaultEventsMap, Side extends EventSide = 'publisher'> {
  #listeners: Map<keyof Events, Set<Fn>> = new Map()

  constructor(private options: Options = {}) {
    this.options = {
      subscribe: fn => fn,
      publish: data => this.#dispatchEvent(data),
      deserialize: v => v,
      serialize: v => v,
      ...options
    }

    this.options.subscribe?.(e => this.#dispatchEvent(e))
  }

  /** Owns the `publish` half of the map: it publishes `Call` and `Push` events. */
  static createPublisher<Events extends object>(options?: Options) {
    return new MessageEventEmitter<Events, 'publisher'>(options)
  }

  /** The mirror end: it answers `Call`, receives `Push`, and notifies back with `Notify`. */
  static createSubscriber<Events extends object>(options?: Options) {
    return new MessageEventEmitter<Events, 'subscriber'>(options)
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
            on: listener => emitter.on(key as ListenerKeys<Events, Side>, listener),
            once: listener => emitter.once(key as ListenerKeys<Events, Side>, listener),
            off: listener => emitter.off(key as ListenerKeys<Events, Side>, listener),
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

  on<K extends ListenerKeys<Events, Side>>(type: K, listener: (...args: ListenerArgs<Events[K], Side>) => unknown) {
    if (!this.#listeners.has(type)) {
      this.#listeners.set(type, new Set())
    }

    this.listeners(type)?.add(listener)

    return () => {
      this.off(type, listener)
    }
  }

  emit<K extends EmitKeys<Events, Side>>(type: K, ...args: EmitArgs<Events[K], Side>) {
    this.options.publish?.(this.options.serialize?.([type, ...args]))
  }

  off<K extends ListenerKeys<Events, Side>>(type: K, listener?: (...args: ListenerArgs<Events[K], Side>) => unknown) {
    if (!listener) {
      this.#listeners.delete(type)
      return
    }
    this.listeners(type)?.delete(listener)
    if (this.listenerCount(type) === 0) {
      this.#listeners.delete(type)
    }
  }

  once<K extends ListenerKeys<Events, Side>>(type: K, listener: (...args: ListenerArgs<Events[K], Side>) => unknown) {
    const onceListener = (...args: ListenerArgs<Events[K], Side>) => {
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

interface MessageEvent<Event, Side extends EventSide = 'publisher'> {
  on: (listener: (...args: ListenerArgs<Event, Side>) => unknown) => () => void
  once: (listener: (...args: ListenerArgs<Event, Side>) => unknown) => () => void
  off: (listener?: (...args: ListenerArgs<Event, Side>) => unknown) => void
  emit: (...args: EmitArgs<Event, Side>) => void
  listenerCount: () => number
}

/**
 * Homomorphic (`[K in keyof Events]`) so IDE "Go to Definition" still lands on
 * the original event declaration.
 */
export type NamespacedEvents<Events extends object, Side extends EventSide = 'publisher'> = {
  readonly [K in keyof Events]: MessageEvent<Events[K], Side>
}

export default MessageEventEmitter
