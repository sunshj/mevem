type Awaitable<T> = T | PromiseLike<T>

type Fn = (...args: any[]) => void

type EventName = string | symbol

type DefaultEventsMap = Record<EventName, Fn>

type EventOf<Events extends object, K extends PropertyKey> = K extends keyof Events
  ? Events[K]
  : never

type EventArgs<Event> = [Event] extends [never]
  ? never
  : Event extends (...args: infer Args) => any
    ? Args
    : never

type EventResult<Event> = [Event] extends [never]
  ? void
  : Event extends (...args: any[]) => infer Result
    ? Result
    : void

type EventListener<OnEvent, EmitEvent = OnEvent> = (
  ...args: EventArgs<OnEvent>
) => Awaitable<EventResult<EmitEvent> | void>

interface Options {
  /** The function that will be called when a message is received. */
  on?: (fn: Fn) => void
  /** The function that will be called when a message is sent. */
  post?: (data: any) => void
  /** The function that will be called to serialize data before sending it. */
  serialize?: (v: any) => any
  /** The function that will be called to deserialize data after receiving it. */
  deserialize?: (v: any) => any
}

class MessageEventEmitter<
  EmitEvents extends object = DefaultEventsMap,
  OnEvents extends object = DefaultEventsMap
> {
  #listeners: Map<keyof OnEvents, Set<Fn>> = new Map()

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

  #dispatchEvent(event: any) {
    const [type, ...args] = this.options.deserialize?.(event) ?? event
    this.listeners(type as keyof OnEvents)?.forEach(listener => listener(...args))
  }

  on<K extends keyof OnEvents>(
    type: K,
    listener: EventListener<OnEvents[K], EventOf<EmitEvents, K>>
  ) {
    if (!this.#listeners.has(type)) {
      this.#listeners.set(type, new Set())
    }

    this.listeners(type)?.add(listener)

    return () => {
      this.off(type, listener)
    }
  }

  emit<K extends keyof EmitEvents>(type: K, ...args: EventArgs<EmitEvents[K]>) {
    this.options.post?.(this.options.serialize?.([type, ...args]))
  }

  off<K extends keyof OnEvents>(
    type: K,
    listener?: EventListener<OnEvents[K], EventOf<EmitEvents, K>>
  ) {
    if (!listener) {
      this.#listeners.delete(type)
      return
    }
    this.listeners(type)?.delete(listener)
    if (this.listenerCount(type) === 0) {
      this.#listeners.delete(type)
    }
  }

  once<K extends keyof OnEvents>(type: K, listener: EventListener<OnEvents[K]>) {
    const onceListener = (...onceArgs: EventArgs<OnEvents[K]>) => {
      listener(...onceArgs)
      this.off(type, onceListener)
    }
    this.on(type, onceListener)
  }

  get eventNames() {
    return [...this.#listeners.keys()]
  }

  listeners<K extends keyof OnEvents>(type: K) {
    return this.#listeners.get(type)
  }

  listenerCount<K extends keyof OnEvents>(type: K) {
    return this.listeners(type)?.size || 0
  }

  removeAllListeners() {
    this.#listeners.clear()
  }

  static withNamespace<EmitEvents extends object, OnEvents extends object>(
    emitter: MessageEventEmitter<EmitEvents, OnEvents>
  ): NamespacedEvents<EmitEvents, OnEvents> {
    const events = new Map<PropertyKey, MessageEvent<any, any>>()

    return new Proxy(Object.create(null), {
      get(_, key) {
        if (!events.has(key)) {
          const event: MessageEvent<any, any> = {
            on: listener => emitter.on(key as keyof OnEvents, listener),
            once: listener => emitter.once(key as keyof OnEvents, listener),
            off: listener => emitter.off(key as keyof OnEvents, listener),
            emit: (...args) => (emitter.emit as Fn)(key, ...args),
            listenerCount: () => emitter.listenerCount(key as keyof OnEvents),
            clear: () => emitter.off(key as keyof OnEvents)
          }

          events.set(key, event)
        }

        return events.get(key)
      }
    }) as NamespacedEvents<EmitEvents, OnEvents>
  }
}

interface MessageEvent<EmitEvent = never, OnEvent = EmitEvent> {
  on: (listener: EventListener<OnEvent, EmitEvent>) => () => void
  once: (listener: EventListener<OnEvent>) => void
  off: (listener?: EventListener<OnEvent, EmitEvent>) => void
  emit: (...args: EventArgs<EmitEvent>) => void
  listenerCount: () => number
  clear: () => void
}

/**
 * Homomorphic mapped types (`[K in keyof T]`) keep the link to the original
 * property declarations, so IDE "Go to Definition" works on each event.
 */
type NamespacedEvents<
  EmitEvents extends object = DefaultEventsMap,
  OnEvents extends object = EmitEvents
> = {
  readonly [K in keyof EmitEvents]: MessageEvent<EmitEvents[K], EventOf<OnEvents, K>>
} & {
  readonly [K in keyof OnEvents]: MessageEvent<EventOf<EmitEvents, K>, OnEvents[K]>
}

export default MessageEventEmitter
