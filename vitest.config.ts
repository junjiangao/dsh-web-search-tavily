import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The client bundle's runtime import only exists inside the DSH Web
      // shell; tests resolve it to a local stub with the same surface.
      '@deepseek-ai/dsh-client-store': fileURLToPath(
        new URL('./tests/stubs/client-store.ts', import.meta.url),
      ),
      // Same for react: the card module imports it at scope; controller tests
      // never render, so a minimal stub stands in.
      react: fileURLToPath(new URL('./tests/stubs/react.ts', import.meta.url)),
      // The native primitives icon (like the official cards render) resolves
      // from the shell's static table; tests stub it.
      '@deepseek-ai/dsh-client-ui-primitives': fileURLToPath(
        new URL('./tests/stubs/ui-primitives.ts', import.meta.url),
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
      // client-src/** must be excluded explicitly: vitest 4.x matches
      // coverage patterns with picomatch "contains" semantics, so
      // 'src/**/*.ts' also substring-matches 'client-src/*.ts'
      // ('client-src/client.ts' contains 'src/client.ts') and would drag the
      // per-file 100% gate onto the under-tested card UI.
      exclude: ['src/types.ts', 'client-src/**'],
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
