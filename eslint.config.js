import { defineConfig } from '@sunshj/eslint-config'

export default defineConfig({
  files: ['src/**/*.ts'],
  rules: {
    'import/no-default-export': 'error'
  }
})
