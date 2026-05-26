import {defineConfig} from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    // jsdom required for component tests (components/ui/__tests__/Button.test.tsx).
    // Pure-function tests in lib/__tests__/ run fine under jsdom too.
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    // Mirror the Next.js path alias `@/*` → `<site>/*` so test files can import
    // via `@/components/...` the same way runtime code does.
    alias: {
      '@': path.resolve(__dirname),
    },
  },
})
