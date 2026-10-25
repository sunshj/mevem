import { defineConfig, type UserConfig } from 'tsdown'

const sharedConfig: UserConfig = {
  entry: ['src/index.ts'],
  dts: false,
  clean: true,
  fixedExtension: false,
  globalName: 'MessageEventEmitter'
}

export default defineConfig([
  {
    ...sharedConfig,
    format: 'esm',
    dts: true
  },
  {
    ...sharedConfig,
    format: 'cjs'
  },
  {
    ...sharedConfig,
    format: 'iife',
    outputOptions: {
      entryFileNames: 'index.browser.js'
    }
  }
])
