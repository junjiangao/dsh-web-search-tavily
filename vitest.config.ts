import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The client bundle's runtime import only exists inside the DSH Web
      // shell; tests resolve it to a local stub with the same surface.
      '@deepseek-ai/dsh-client-runtime/client': fileURLToPath(
        new URL('./tests/stubs/runtime-client.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    // One worker, sequential files: v8 coverage merges across parallel
    // workers inconsistently, and the per-file 100% gate needs one source of
    // truth for each src file.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // src/types.ts is type-only: it emits no runtime code to cover.
      exclude: ['src/types.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        perFile: true,
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
})
