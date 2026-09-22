/**
 * Build the client bundle (`lib/client.js`) for the DSH Web shell.
 *
 * The shell's module loader expects a closure-factory module:
 *
 *   window.__ModuleLoader__.load({
 *     id: "<package>",
 *     factory: (require) => { var module = {exports:{}}; ...; return module.exports }
 *   })
 *
 * esbuild compiles the client sources to a CJS body whose `require` calls
 * resolve through the shell's frozen module table (dsh 0.1.7 PLATFORM_MODULES);
 * this script wraps that body in the factory shell.
 */

import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE_ID = '@junjiangao/dsh-web-search-tavily'

/**
 * Specifiers the shell resolves itself (dsh 0.1.7 `PLATFORM_MODULES`). Only
 * the keys this bundle imports at runtime are listed, so esbuild leaves them as
 * `require` calls instead of bundling them; the boot graph resolves each one
 * from the shell's static module table.
 */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

const esbuild = await import('esbuild')

const result = await esbuild.build({
  entryPoints: [join(ROOT, 'client-src/client.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
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
