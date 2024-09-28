type Fn = (...args: any[]) => void

type DefaultEventsMap = Record<string, Fn>

type MessageEventData<T extends DefaultEventsMap, K extends keyof T = keyof T> = [
  K,
  ...Parameters<T[K]>
]

interface Options {
  on: (fn: Fn) => void
  post: (data: any) => void
  serialize?: (v: any) => any
  deserialize?: (v: any) => any
}

const defaultSerialize = (v: any) => v
const defaultDeserialize = defaultSerialize

class MessageEventEmitter<
  EmitEvents extends DefaultEventsMap = DefaultEventsMap,
  OnEvents extends DefaultEventsMap = DefaultEventsMap
> {
  private listeners: Map<keyof OnEvents, Set<Fn>> = new Map()

  constructor(private options: Options) {
    this.options.serialize ??= defaultSerialize
    this.options.deserialize ??= defaultDeserialize
    this.options.on(this.handleMessage.bind(this))
  }

  private handleMessage(event: MessageEvent<MessageEventData<OnEvents>>) {
    const [type, ...args] = this.options.deserialize!(event)
    const typeListeners = this.listeners.get(type)
    if (typeListeners) {
      typeListeners.forEach(listener => listener(...args))
    }
  }

  on<K extends keyof OnEvents>(type: K, listener: (...args: Parameters<OnEvents[K]>) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)

    return () => {
      this.off(type, listener)
    }
  }

  emit<K extends keyof EmitEvents>(type: K, ...args: Parameters<EmitEvents[K]>) {
    this.options.post!(this.options.serialize!([type, ...args]))
  }

  off<K extends keyof OnEvents>(type: K, listener?: (...args: Parameters<OnEvents[K]>) => void) {
    if (!listener) {
      this.listeners.delete(type)
      return
    }
    const typeListeners = this.listeners.get(type)
    if (typeListeners) {
      typeListeners.delete(listener)
      if (typeListeners.size === 0) {
        this.listeners.delete(type)
      }
    }
  }

  once<K extends keyof OnEvents>(type: K, listener: (...args: Parameters<OnEvents[K]>) => void) {
    const onceListener = (...onceArgs: Parameters<OnEvents[K]>) => {
      listener(...onceArgs)
      this.off(type, onceListener)
    }
    this.on(type, onceListener)
  }

  get eventNames() {
    return [...this.listeners.keys()]
  }

  getListeners<K extends keyof OnEvents>(type: K) {
    return [...(this.listeners.get(type) || new Set())]
  }

  getListenerCount<K extends keyof OnEvents>(type: K) {
    return this.getListeners(type).length
  }

  removeAllListeners() {
    this.listeners.clear()
  }
}

export default MessageEventEmitter
