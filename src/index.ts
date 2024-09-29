type Awaitable<T> = T | PromiseLike<T>

type Fn = (...args: any[]) => void

type DefaultEventsMap = Record<string, Fn>

interface Options {
  /** The function that will be called when a message is received. */
  on?: (fn: Fn) => void
  /** The function that will be called when a message is sent. */
  post?: (data: any) => void
  /** The function that will be called to serialize data before sending it. */
  serialize?: (v: any) => any
  /** The function that will be called to deserialize data after receiving it. */
  deserialize?: (v: any) => any
  experimental?: {
    /** Whether to automatically emit a same type message when a listener returns a value. */
    returnValue?: boolean
  }
}

const defaultOptions: Options = {
  on: fn => fn,
  deserialize: v => v,
  serialize: v => v,
  experimental: {
    returnValue: false
  }
}

class MessageEventEmitter<
  EmitEvents extends DefaultEventsMap = DefaultEventsMap,
  OnEvents extends DefaultEventsMap = DefaultEventsMap
> {
  #listeners: Map<keyof OnEvents, Set<Fn>> = new Map()

  constructor(private options: Options = {}) {
    this.options = Object.assign<Options, Options>(
      {
        ...defaultOptions,
        post: data => this.#dispatchEvent(data)
      },
      this.options
    )
    this.options.on?.(e => this.#dispatchEvent(e))
  }

  #post(type: any, ...args: any[]) {
    this.options.post!(this.options.serialize!([type, ...args]))
  }

  #dispatchEvent(event: any) {
    const [type, ...args] = this.options.deserialize!(event)
    this.listeners(type)?.forEach(listener => listener(...args))
  }

  #hasReturnValue(listener: Fn) {
    // ? should also work in arrow functions
    // ? should be a return statement, not a string
    return listener.toString().includes('return ')
  }

  on<K extends keyof OnEvents>(
    type: K,
    listener: (...args: Parameters<OnEvents[K]>) => Awaitable<ReturnType<OnEvents[K]> | void>
  ) {
    if (!this.#listeners.has(type)) {
      this.#listeners.set(type, new Set())
    }

    const listenerWithReturnValue = async (...args: Parameters<OnEvents[K]>) => {
      const returnValue = await listener(...args)
      if (returnValue !== undefined) {
        this.#post(type, returnValue)
      }
    }

    if (this.#hasReturnValue(listener) && this.options.experimental?.returnValue) {
      this.listeners(type)!.add(listenerWithReturnValue)
    } else {
      this.listeners(type)!.add(listener)
    }

    return () => {
      if (this.listeners(type)?.has(listenerWithReturnValue)) {
        this.off(type, listenerWithReturnValue)
      } else {
        this.off(type, listener)
      }
    }
  }

  emit<K extends keyof EmitEvents>(type: K, ...args: Parameters<EmitEvents[K]>) {
    this.#post(type, ...args)
  }

  off<K extends keyof OnEvents>(
    type: K,
    listener?: (...args: Parameters<OnEvents[K]>) => Awaitable<ReturnType<OnEvents[K]> | void>
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

  once<K extends keyof OnEvents>(
    type: K,
    listener: (...args: Parameters<OnEvents[K]>) => Awaitable<ReturnType<OnEvents[K]> | void>
  ) {
    const onceListener = (...onceArgs: Parameters<OnEvents[K]>) => {
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
}

export default MessageEventEmitter
