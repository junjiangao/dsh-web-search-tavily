/** The `web-search-tavily` configuration form, driven through its Loader entry. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import WebRuntime from '@deepseek-ai/dsh-web'
import * as tavilyPlugin from '../src/index.ts'
import { Config, WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE } from '../src/index.ts'
import { liveConfig } from './live-config.ts'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
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

describe('web-search-tavily configuration form', () => {
  it('serves an edited value to the next search without re-registering the provider', async () => {
    const ctx = new Context()
    await ctx.plugin(WebRuntime, {})
    const live = await liveConfig(ctx, tavilyPlugin, {
      apiKey: 'entry-key',
      baseURL: 'https://entry.test',
      searchDepth: 'basic',
    })
    expect((await searchOnce(ctx)).url).toContain('https://entry.test/search')

    await live.update({
      baseURL: 'https://settings.test',
      searchDepth: 'advanced',
      maxResults: 7,
      includeAnswer: true,
      includeDomains: ['a.test'],
    })

    const { url, init } = await searchOnce(ctx)
    expect(url).toContain('https://settings.test/search')
    expect(JSON.parse(init.body as string)).toMatchObject({
      search_depth: 'advanced',
      max_results: 7,
      include_answer: true,
      include_domains: ['a.test'],
    })
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer entry-key')
    await ctx.fiber.dispose()
  })

  it('declares every config field volatile, so the settings page can edit it live', () => {
    expect(WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE).toBe('web-search-tavily')
    const dict = (Config as unknown as { dict: Record<string, { meta?: { volatile?: boolean; role?: string } }> }).dict
    const fields = Object.entries(dict)
    expect(fields.length).toBeGreaterThan(0)
    for (const [field, schema] of fields) {
      expect(schema.meta?.volatile, field).toBe(true)
    }
    // The key is a secret (redacted on every wire surface) and the env-var
    // field is a credential reference, exactly as the official provider
    // declares them.
    expect(dict.apiKey?.meta?.role).toBe('secret')
    expect(dict.apiKeyEnv?.meta?.role).toBe('credential-ref')
  })

  it('releases the provider when the entry unloads', async () => {
    const ctx = new Context()
    await ctx.plugin(WebRuntime, {})
    const live = await liveConfig(ctx, tavilyPlugin, {})
    await live.fiber.dispose()
    await expect(ctx.web.search({ query: 'after-unload' })).rejects.toThrow()
    await ctx.fiber.dispose()
  })

  it('asks for publication dates by default, and can be turned off', async () => {
    const ctx = new Context()
    await ctx.plugin(WebRuntime, {})
    const live = await liveConfig(ctx, tavilyPlugin, {})
    expect(JSON.parse((await searchOnce(ctx)).init.body as string)).toMatchObject({ include_published_date: true })

    await live.update({ includePublishedDate: false })
    expect(JSON.parse((await searchOnce(ctx)).init.body as string)).not.toHaveProperty('include_published_date')
    await live.fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('keeps parameters the card does not render reachable through the entry config', async () => {
    const ctx = new Context()
    await ctx.plugin(WebRuntime, {})
    const live = await liveConfig(ctx, tavilyPlugin, { safeSearch: true, chunksPerSource: 2, maxResults: 6 })
    expect(JSON.parse((await searchOnce(ctx)).init.body as string)).toMatchObject({
      safe_search: true,
      chunks_per_source: 2,
      max_results: 6,
    })
    await live.fiber.dispose()
    await ctx.fiber.dispose()
  })
})
