/** The `web-search-tavily` settings section layered over the composition entry. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Fiber } from '@deepseek-ai/cordis'
import { SettingsProvider } from '@deepseek-ai/dsh-settings'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import WebRuntime from '@deepseek-ai/dsh-web'
import * as tavilyPlugin from '../src/index.ts'
import { WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE } from '../src/index.ts'

/** The smallest real provider: one in-memory document, always writable. */
class MemorySettings extends SettingsProvider {
  doc: Record<string, unknown> = {}

  get writable(): boolean {
    return true
  }

  protected load(): Promise<Record<string, unknown>> {
    return Promise.resolve(structuredClone(this.doc))
  }

  protected persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.doc = { ...this.doc, [ns]: structuredClone(section) }
    return Promise.resolve()
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

async function boot(): Promise<{ ctx: Context; settingsFiber: Fiber; pluginFiber: Fiber }> {
  const ctx = new Context()
  await ctx.plugin(WebRuntime, {})
  const settingsFiber = ctx.plugin(MemorySettings)
  await settingsFiber.await()
  const pluginFiber = ctx.plugin(tavilyPlugin, {
    apiKey: 'entry-key',
    baseURL: 'https://entry.test',
    searchDepth: 'basic',
  })
  await pluginFiber.await()
  return { ctx, settingsFiber, pluginFiber }
}

/**
 * Run one search and answer with the request the provider issued. A fresh
 * `Response` per call because a body can only be read once, and the call
 * history is cleared because repeated `spyOn` returns the same spy.
 * @param ctx - context whose `ctx.web` serves the search.
 * @returns the URL, headers, and body the provider fetched.
 */
async function searchOnce(ctx: Context): Promise<{ url: string; init: RequestInit }> {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(jsonResponse({ results: [] })))
  fetchSpy.mockClear()
  await ctx.web.search({ query: 'anything' })
  const [url, init] = fetchSpy.mock.calls.at(-1) as unknown as [string, RequestInit] | undefined
  return { url: String(url ?? ''), init: init ?? {} }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('web-search-tavily settings section', () => {
  it('serves stored options to the next search without re-registering the provider', async () => {
    const bench = await boot()
    await bench.ctx.settings.update(WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, {
      searchDepth: 'advanced',
      topic: 'news',
      maxResults: 7,
      includeAnswer: true,
      includeDomains: ['a.test'],
      baseURL: 'https://settings.test',
    })

    const { url, init } = await searchOnce(bench.ctx)
    expect(url).toContain('https://settings.test/search')
    expect(JSON.parse(init.body as string)).toMatchObject({
      search_depth: 'advanced',
      topic: 'news',
      max_results: 7,
      include_answer: true,
      include_domains: ['a.test'],
    })
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer entry-key')
    await bench.ctx.fiber.dispose()
  })

  it('keeps the literal key out of every described layer', async () => {
    const bench = await boot()
    await bench.ctx.settings.update(WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, { apiKey: 'stored-secret' })

    const [descriptor] = bench.ctx.settings.describe({ redactSecrets: true })
      .filter(row => String(row.ns) === 'web-search-tavily')

    expect(JSON.stringify(descriptor)).not.toContain('stored-secret')
    expect(descriptor?.secrets).toEqual([{ path: ['apiKey'], set: true }])
    await bench.ctx.fiber.dispose()
  })

  it('falls back to the composition entry when the settings provider detaches', async () => {
    const bench = await boot()
    await bench.ctx.settings.update(WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, {
      searchDepth: 'advanced',
      baseURL: 'https://settings.test',
    })
    const stored = await searchOnce(bench.ctx)
    expect(stored.url).toContain('https://settings.test/search')

    await bench.settingsFiber.dispose()

    const entry = await searchOnce(bench.ctx)
    expect(entry.url).toContain('https://entry.test/search')
    expect(JSON.parse(entry.init.body as string)).toMatchObject({ search_depth: 'basic' })
    expect((entry.init.headers as Record<string, string>)['authorization']).toBe('Bearer entry-key')
    await bench.ctx.fiber.dispose()
  })

  it('releases the namespace when the plugin unloads', async () => {
    const bench = await boot()
    expect(bench.ctx.settings.describe().map(row => String(row.ns))).toContain('web-search-tavily')

    await bench.pluginFiber.dispose()

    expect(bench.ctx.settings.describe().map(row => String(row.ns))).not.toContain('web-search-tavily')
    await bench.ctx.fiber.dispose()
  })
})
