import type mevem from 'mevem'

declare global {
  interface Window {
    MessageEventEmitter: typeof mevem<ClientEvents, ServerEvents>
  }

  export type ServerEvents = {
    sum: (result: number) => void
    'get-numbers': (numbers: number[]) => void
  }

  export type ClientEvents = {
    sum: (...numbers: number[]) => void
    'get-numbers': (count: number) => void
  }
}

export {}
