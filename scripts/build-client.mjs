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
 * resolve through the shell's static module table / boot graph (declared in
 * `dsh.client.external`); this script wraps that body in the factory shell.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE_ID = '@deepseek-ai/dsh-web-search-tavily'

/** Specifiers the shell resolves itself — must match `dsh.client.external`. */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-runtime/client',
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
