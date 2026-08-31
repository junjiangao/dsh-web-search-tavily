/**
 * Build the client bundle (`lib/client.js`) for the DSH Web shell.
 *
 * The shell's module loader expects a factory-form module:
 *
 *   window.__ModuleLoader__.load({
 *     id: "<package>",
 *     factory: (require) => { var module = {exports:{}}; ...; return module.exports }
 *   })
 *
 * esbuild compiles the client sources to a CJS body whose `require` calls
 * resolve through the shell's static module table / boot graph (the dsh 0.1.2
 * PLATFORM_MODULES baseline); this script wraps that body in the factory shell.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE_ID = '@junjiangao/dsh-web-search-tavily'

/**
 * Specifiers the shell resolves itself. dsh 0.1.2 seeds a frozen
 * PLATFORM_MODULES table (`react`, `react/jsx-runtime`, `react-dom`,
 * `react-dom/client`, `@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-store`,
 * `@deepseek-ai/dsh-client-ui-slots`, `@deepseek-ai/dsh-client-ui-primitives`);
 * only the keys this bundle actually imports at runtime are listed, so
 * esbuild leaves them as `require` calls instead of bundling them.
 */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-primitives',
]

// esbuild resolves from `node_modules` on a normal install; the workspace
// vendor copy covers sandboxed builds that cannot touch the pnpm store.
let esbuild
for (const specifier of ['esbuild', '../.vendor/node_modules/esbuild/lib/main.js']) {
  try {
    esbuild = await import(specifier)
    break
  } catch {
    // try the next candidate
  }
}
if (esbuild === undefined) {
  throw new Error('build-client: esbuild not found — run `pnpm install` (or npm install into .vendor) first')
}

const result = await esbuild.build({
  entryPoints: [join(ROOT, 'client-src/client.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  write: false,
  external: EXTERNALS,
  logLevel: 'warning',
})

const body = result.outputFiles[0].text
const wrapped = [
  'window.__ModuleLoader__.load({',
  `\tid: ${JSON.stringify(PACKAGE_ID)},`,
  '\tfactory: (require) => {',
  '\t\t"use strict";',
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  body.replace(/^/gm, '\t\t'),
  '\t\treturn module.exports;',
  '\t}',
  '});',
  '',
].join('\n')

await writeFile(join(ROOT, 'lib/client.js'), wrapped)
console.log(`client bundle written: lib/client.js (${wrapped.length} bytes)`)
