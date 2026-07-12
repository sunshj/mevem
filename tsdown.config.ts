import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: 'esm',
    dts: true,
    outExtensions: () => ({ js: '.js', dts: '.d.ts' })
  },
  {
    entry: ['src/index.ts'],
    format: 'cjs',
    dts: false,
    outExtensions: () => ({ js: '.cjs' })
  },
  {
    entry: ['src/index.ts'],
    format: 'iife',
    dts: false,
    globalName: 'MessageEventEmitter',
    outputOptions: {
      entryFileNames: 'index.browser.js'
    }
  }
])
