/** Standard-bundle shape and the package-owned invariant companion. */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import * as invariantPlugin from '../src/invariant.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('standard bundle shape', () => {
  it('declares dsh.bundle pointing at an existing cordis.patch.yml', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      dsh?: { bundle?: { patch?: string } }
      files?: string[]
    }
    const patch = manifest.dsh?.bundle?.patch
    expect(patch).toBe('./cordis.patch.yml')
    if (patch === undefined) throw new Error('dsh.bundle.patch is missing')
    expect(existsSync(join(root, patch))).toBe(true)
    expect(manifest.files).toContain('cordis.patch.yml')
  })

  it('inserts only the web-search-tavily row and never overrides the web row', () => {
    const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
    expect(patch).toContain('id: web-search-tavily')
    expect(patch).toContain("name: '@junjiangao/dsh-web-search-tavily'")
    const webOverrides = patch.split('\n').filter(line => /^\s*- id: web\s*$/.test(line))
    expect(webOverrides).toEqual([])
  })
})

describe('web-search-tavily invariant companion', () => {
  it('registers the package manifest with an empty installer', async () => {
    const register = vi.fn(() => () => {})
    const ctx = { invariants: { register } } as unknown as Context
    const dispose = await invariantPlugin.apply(ctx)
    expect(register).toHaveBeenCalledOnce()
    const [packageName, installer] = register.mock.calls[0] as unknown as [string, () => void]
    expect(packageName).toBe('@junjiangao/dsh-web-search-tavily')
    installer()
    dispose()
  })

  it('exports companion metadata', () => {
    expect(invariantPlugin.name).toBe('web-search-tavily-invariant')
    expect(invariantPlugin.inject).toEqual(['invariants'])
  })
})
