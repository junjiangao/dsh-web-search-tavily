/** Standard-bundle shape and the package-owned invariant companion. */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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

describe('plugin display metadata', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    name: string
    icon?: string
    files?: string[]
  }

  /** Read one display dictionary the way the Host reads it: through the package specifier. */
  function readDictionary(language: string): { meta: Record<string, string> } {
    // The Host resolves `<specifier>/locale/<lang>.json` with the Node resolver
    // before reading it, so a file that exists but is not exported is metadata
    // the Plugins page never sees. Resolving it here keeps that true.
    const url = import.meta.resolve(`${manifest.name}/locale/${language}.json`)
    return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as { meta: Record<string, string> }
  }

  it('ships the English anchor the Host reads first', () => {
    const { meta } = readDictionary('en')
    expect(meta['title']?.trim()).not.toBe('')
    expect(meta['description']?.trim()).not.toBe('')
  })

  it('translates every language the directory carries, keyed by a language id', () => {
    // The Host reads *every* `*.json` beside the anchor and throws when a
    // filename is not a language id, so a stray file here would break the
    // plugin's metadata outright rather than being ignored.
    const anchor = Object.keys(readDictionary('en').meta).sort()
    const languages = readdirSync(join(root, 'locale')).map(entry => entry.replace(/\.json$/u, ''))
    expect(languages).toContain('en')
    for (const language of languages) {
      expect(language).toMatch(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u)
      const { meta } = readDictionary(language)
      expect(Object.keys(meta).sort()).toEqual(anchor)
      for (const value of Object.values(meta)) expect(value.trim()).not.toBe('')
    }
    // A language whose title repeats the anchor translates nothing: that is
    // what an absent file already does through the English fallback.
    expect(readDictionary('zh').meta['title']).not.toBe(readDictionary('en').meta['title'])
  })

  it('declares the locale directory in files, so the npm tarball carries it', () => {
    expect(manifest.files).toContain('locale/*.json')
  })

  it('declares an icon the Host admits: relative SVG inside the manifest directory', () => {
    // Mirrors app-boot's iconOf(): a relative path, one of four media types,
    // inside the manifest directory, at most 256 KiB.
    expect(manifest.icon).toBe('./icon.svg')
    const file = join(root, manifest.icon ?? '')
    expect(existsSync(file)).toBe(true)
    expect(statSync(file).size).toBeLessThanOrEqual(256 * 1024)
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
