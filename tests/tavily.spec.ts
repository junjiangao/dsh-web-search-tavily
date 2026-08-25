import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { WebSearchProvider } from '@deepseek-ai/dsh-web'
import WebRuntime from '@deepseek-ai/dsh-web'
import * as tavilyPlugin from '../src/index.ts'
import {
  TAVILY_PROVIDER_ID,
  TavilySearchProvider,
  mapTavilyResponse,
  mapTavilyResult,
  tavilyErrorDetail,
} from '../src/provider.ts'
import type { TavilySearchProviderOptions } from '../src/provider.ts'

const ENV_KEYS = ['TAVILY_API_KEY', 'TAVILY_BASE_URL', 'MY_TAVILY_KEY'] as const
const savedEnv = new Map<string, string | undefined>()

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv.set(key, process.env[key])
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv.get(key)
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

function makeOptions(overrides: Partial<TavilySearchProviderOptions> = {}): TavilySearchProviderOptions {
  return { baseURL: 'https://api.tavily.test', searchDepth: 'basic', ...overrides }
}

function makeProvider(options: TavilySearchProviderOptions = makeOptions()): TavilySearchProvider {
  return new TavilySearchProvider(() => options)
}

async function mount(
  config: Record<string, unknown> = {},
  webConfig: Record<string, unknown> = { searchProvider: TAVILY_PROVIDER_ID },
): Promise<{ ctx: Context; fiber: Awaited<ReturnType<Context['plugin']>> }> {
  const ctx = new Context()
  await ctx.plugin(WebRuntime, webConfig)
  const fiber = await ctx.plugin(tavilyPlugin, config)
  return { ctx, fiber }
}

describe('Tavily result mapping', () => {
  it('maps a full result entry', () => {
    expect(mapTavilyResult({
      url: 'https://a.test',
      title: 'A',
      content: 'snippet text',
      raw_content: 'raw text',
      published_date: '2026-01-01',
    })).toEqual({ url: 'https://a.test', title: 'A', snippet: 'snippet text', publishedAt: '2026-01-01' })
  })

  it('falls back to raw_content when content is blank', () => {
    expect(mapTavilyResult({ url: 'https://a.test', content: '  ', raw_content: 'raw text' }))
      .toEqual({ url: 'https://a.test', snippet: 'raw text' })
  })

  it('omits blank/null optional fields rather than emitting them', () => {
    expect(mapTavilyResult({ url: 'https://a.test', title: null, content: null, raw_content: null, published_date: null }))
      .toEqual({ url: 'https://a.test' })
    expect(mapTavilyResult({ url: 'https://a.test', title: '', content: '', raw_content: '', published_date: '' }))
      .toEqual({ url: 'https://a.test' })
  })

  it('drops a result with no URL', () => {
    expect(mapTavilyResult({ url: '' })).toBeUndefined()
  })

  it('maps a response with answer to content and filters URL-less sources', () => {
    const result = mapTavilyResponse({
      answer: 'generated answer',
      results: [
        { url: 'https://a.test', content: 'one' },
        { url: '' },
        { url: 'https://c.test', title: 'C', content: 'three' },
      ],
    })
    expect(result).toEqual({
      content: 'generated answer',
      sources: [
        { url: 'https://a.test', snippet: 'one' },
        { url: 'https://c.test', title: 'C', snippet: 'three' },
      ],
      truncated: false,
    })
  })

  it('omits content and tolerates a missing results array', () => {
    const result = mapTavilyResponse({ answer: '', results: undefined })
    expect(result.sources).toEqual([])
    expect(result.content).toBeUndefined()
  })
})

describe('tavilyErrorDetail', () => {
  it('prefers the keyless envelope message', () => {
    expect(tavilyErrorDetail({ error: { code: 'KEYLESS_LIMIT', message: 'rate limited' } })).toBe('rate limited')
  })

  it('falls through an envelope without a message', () => {
    expect(tavilyErrorDetail({ error: { code: 'X' } })).toBeUndefined()
    expect(tavilyErrorDetail({ error: null })).toBeUndefined()
  })

  it('accepts string, detail, and message bodies', () => {
    expect(tavilyErrorDetail({ error: 'plain error' })).toBe('plain error')
    expect(tavilyErrorDetail({ detail: { error: 'detail error' } })).toBe('detail error')
    expect(tavilyErrorDetail({ detail: { error: '' } })).toBeUndefined()
    expect(tavilyErrorDetail({ detail: 'detail string' })).toBe('detail string')
    expect(tavilyErrorDetail({ message: 'message body' })).toBe('message body')
    expect(tavilyErrorDetail({})).toBeUndefined()
  })
})

describe('TavilySearchProvider availability', () => {
  it('is available without any key (keyless mode)', () => {
    expect(makeProvider().available()).toBe(true)
  })

  it('is available with a literal key', () => {
    expect(makeProvider(makeOptions({ apiKey: 'tvly-key' })).available()).toBe(true)
  })

  it('is misconfigured when the base URL is unparseable', () => {
    expect(makeProvider(makeOptions({ baseURL: 'not a url' })).available()).toBe(false)
  })

  it('is misconfigured when an enum value is invalid', () => {
    expect(makeProvider(makeOptions({ searchDepth: 'bogus' as TavilySearchProviderOptions['searchDepth'] })).available()).toBe(false)
    expect(makeProvider(makeOptions({ topic: 'bogus' as TavilySearchProviderOptions['topic'] })).available()).toBe(false)
    expect(makeProvider(makeOptions({ timeRange: 'bogus' as TavilySearchProviderOptions['timeRange'] })).available()).toBe(false)
  })

  it('is misconfigured when a numeric option is not a positive integer', () => {
    expect(makeProvider(makeOptions({ maxResults: 0 })).available()).toBe(false)
    expect(makeProvider(makeOptions({ maxResults: 1.5 })).available()).toBe(false)
    expect(makeProvider(makeOptions({ days: 0 })).available()).toBe(false)
    expect(makeProvider(makeOptions({ chunksPerSource: 1.5 })).available()).toBe(false)
  })

  it('accepts valid numeric options', () => {
    expect(makeProvider(makeOptions({ maxResults: 5, days: 3, chunksPerSource: 2 })).available()).toBe(true)
  })
})

describe('TavilySearchProvider request mapping', () => {
  it('sends bearer auth and no keyless headers with a key', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await makeProvider(makeOptions({ apiKey: 'tvly-key' })).search({ query: 'hello', maxResults: 5 })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.tavily.test/search')
    expect(init).toMatchObject({ method: 'POST', redirect: 'error' })
    const headers = init.headers as Record<string, string>
    expect(headers['authorization']).toBe('Bearer tvly-key')
    expect(headers['x-tavily-access-mode']).toBeUndefined()
    expect(headers['x-client-source']).toBe('dsh-web-search-tavily')
    expect(JSON.parse(init.body as string)).toEqual({ query: 'hello', search_depth: 'basic', max_results: 5 })
  })

  it('sends keyless mode headers without a key', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await makeProvider().search({ query: 'hello' })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['authorization']).toBeUndefined()
    expect(headers['x-tavily-access-mode']).toBe('keyless')
    expect(headers['x-client-source']).toBe('dsh-web-search-tavily-keyless')
    expect(JSON.parse(init.body as string)).toEqual({ query: 'hello', search_depth: 'basic' })
  })

  it('sends every configured official search parameter', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = makeProvider(makeOptions({
      apiKey: 'tvly-key',
      searchDepth: 'advanced',
      topic: 'news',
      timeRange: 'week',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      days: 7,
      maxResults: 10,
      includeDomains: ['a.test'],
      excludeDomains: ['b.test'],
      includeAnswer: 'advanced',
      includeRawContent: 'markdown',
      includeImages: true,
      includeImageDescriptions: true,
      includeFavicon: true,
      includeUsage: true,
      autoParameters: true,
      exactMatch: true,
      language: 'zh',
      filterByLanguage: true,
      country: 'china',
      chunksPerSource: 3,
    }))
    await provider.search({ query: 'hello' })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      query: 'hello',
      search_depth: 'advanced',
      max_results: 10,
      topic: 'news',
      time_range: 'week',
      start_date: '2026-01-01',
      end_date: '2026-02-01',
      days: 7,
      include_domains: ['a.test'],
      exclude_domains: ['b.test'],
      include_answer: 'advanced',
      include_raw_content: 'markdown',
      include_images: true,
      include_image_descriptions: true,
      include_favicon: true,
      include_usage: true,
      auto_parameters: true,
      exact_match: true,
      language: 'zh',
      filter_by_language: true,
      country: 'china',
      chunks_per_source: 3,
    })
  })

  it('omits false/empty options rather than sending them', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = makeProvider(makeOptions({
      includeAnswer: false,
      includeRawContent: false,
      includeImages: false,
      includeDomains: [],
      excludeDomains: [],
    }))
    await provider.search({ query: 'q' })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ query: 'q', search_depth: 'basic' })
  })

  it('lets a request maxResults win over the configured default', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await makeProvider(makeOptions({ maxResults: 7 })).search({ query: 'q', maxResults: 2 })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({ max_results: 2 })
  })

  it('falls back to the configured maxResults when a request omits it', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await makeProvider(makeOptions({ maxResults: 7 })).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({ max_results: 7 })
  })

  it('clamps max_results to the documented Tavily bound of 20', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await makeProvider().search({ query: 'q', maxResults: 25 })
    await makeProvider().search({ query: 'q', maxResults: 5 })
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string))
    expect(bodies.map((body: { max_results?: number }) => body.max_results)).toEqual([20, 5])
  })

  it('forwards the abort signal', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await makeProvider().search({ query: 'q' }, controller.signal)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.signal).toBe(controller.signal)
  })

  it('lets a literal key win over the resolver', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = makeProvider(makeOptions({
      apiKey: 'literal-key',
      resolveApiKey: async () => 'resolved-key',
    }))
    await provider.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer literal-key')
  })

  it('resolves the key when no signal is passed', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await makeProvider(makeOptions({ resolveApiKey: async () => 'resolved-key' })).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer resolved-key')
  })

  it('resolves the key under an active signal', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await makeProvider(makeOptions({ resolveApiKey: async () => 'resolved-key' })).search({ query: 'q' }, controller.signal)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer resolved-key')
  })

  it('falls through an empty literal key to the resolver', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await makeProvider(makeOptions({ apiKey: '', resolveApiKey: async () => 'resolved-key' })).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer resolved-key')
  })
})

describe('TavilySearchProvider error handling', () => {
  it('maps an HTTP error to WEB_PROVIDER_ERROR with the provider message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ detail: { error: 'bad key' } }, { status: 401 })))
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'bad key' }))
  })

  it('keeps a status-line message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('gateway down', { status: 502 })))
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'Tavily API error (HTTP 502)' }))
  })

  it('keeps the status-line message when the JSON error body carries no detail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: null }, { status: 500 })))
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'Tavily API error (HTTP 500)' }))
  })

  it('keeps the status-line message for an envelope without a message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: { code: 'LIMIT' } }, { status: 429 })))
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'Tavily API error (HTTP 429)' }))
  })

  it('surfaces the keyless envelope message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(
      { error: { code: 'KEYLESS_LIMIT', message: 'rate limited', retry_after_seconds: 60 } },
      { status: 429 },
    )))
    await expect(makeProvider().search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'rate limited' }))
  })

  it('maps a network failure to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('connection refused'))))
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: expect.stringContaining('Tavily search request failed') }))
  })

  it('maps an abort to WEB_ABORTED', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new DOMException('aborted', 'AbortError'))))
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('rejects a search whose signal already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }, controller.signal))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('maps an unparseable success body to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })))
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: expect.stringContaining('unprocessable response body') }))
  })

  it('maps a well-formed body of the wrong shape to WEB_PROVIDER_ERROR, not a raw TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ results: {} }, { status: 200 })))
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })

  it('surfaces an abort during success-body parse as WEB_ABORTED', async () => {
    const body = { json: () => Promise.reject(new DOMException('aborted', 'AbortError')), ok: true, status: 200 }
    vi.stubGlobal('fetch', vi.fn(async () => body as unknown as Response))
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('surfaces an abort during error-body parse as WEB_ABORTED', async () => {
    const body = { json: () => Promise.reject(new DOMException('aborted', 'AbortError')), ok: false, status: 500 }
    vi.stubGlobal('fetch', vi.fn(async () => body as unknown as Response))
    await expect(makeProvider(makeOptions({ apiKey: 'k' })).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('maps a credential resolution failure to WEB_PROVIDER_ERROR', async () => {
    const provider = makeProvider(makeOptions({ resolveApiKey: async () => { throw new Error('boom') } }))
    await expect(provider.search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({
        code: 'WEB_PROVIDER_ERROR',
        message: expect.stringContaining('Tavily search credential resolution failed'),
      }))
  })

  it('wraps a credential resolution rejection under an active signal', async () => {
    const controller = new AbortController()
    const provider = makeProvider(makeOptions({ resolveApiKey: async () => { throw new Error('boom') } }))
    await expect(provider.search({ query: 'q' }, controller.signal))
      .rejects.toThrow(expect.objectContaining({
        code: 'WEB_PROVIDER_ERROR',
        message: expect.stringContaining('Tavily search credential resolution failed'),
      }))
  })

  it('maps an abort during credential resolution to WEB_ABORTED', async () => {
    const controller = new AbortController()
    const provider = makeProvider(makeOptions({ resolveApiKey: () => new Promise(() => {}) }))
    const promise = provider.search({ query: 'q' }, controller.signal)
    controller.abort()
    await expect(promise).rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('races a signal aborted during key access against the pending resolution', async () => {
    const controller = new AbortController()
    let accesses = 0
    // Built directly (not through the spread helper) so the getter survives:
    // object spread reads getters once and copies the value.
    const options: TavilySearchProviderOptions = {
      baseURL: 'https://api.tavily.test',
      searchDepth: 'basic',
      get resolveApiKey() {
        accesses += 1
        if (accesses === 2) controller.abort()
        return () => Promise.resolve('key')
      },
    }
    const provider = new TavilySearchProvider(() => options)
    await expect(provider.search({ query: 'q' }, controller.signal))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })
})

describe('web-search-tavily plugin registration', () => {
  it('registers the provider into ctx.web (HMR-safe)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ results: [] })))
    const { ctx, fiber } = await mount({ apiKey: 'tavily-key' })
    await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ sources: [], truncated: false })
    await fiber.dispose()
    await expect(ctx.web.search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_CONFIGURED_MISSING' }))
  })

  it('has no default export (namespace plugin export shape)', () => {
    expect('default' in tavilyPlugin).toBe(false)
  })

  it('threads every configured option into the request', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, fiber } = await mount({
      apiKey: 'cfg-key',
      baseURL: 'https://cfg.tavily.test',
      searchDepth: 'advanced',
      topic: 'news',
      timeRange: 'month',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      days: 3,
      maxResults: 9,
      includeDomains: ['a.test'],
      excludeDomains: ['b.test'],
      includeAnswer: true,
      includeRawContent: 'text',
      includeImages: true,
      includeImageDescriptions: true,
      includeFavicon: true,
      includeUsage: true,
      autoParameters: true,
      exactMatch: true,
      language: 'en',
      filterByLanguage: true,
      country: 'us',
      chunksPerSource: 2,
    })
    await ctx.web.search({ query: 'q' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://cfg.tavily.test/search')
    expect(JSON.parse(init.body as string)).toMatchObject({
      search_depth: 'advanced',
      topic: 'news',
      time_range: 'month',
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      days: 3,
      max_results: 9,
      include_domains: ['a.test'],
      exclude_domains: ['b.test'],
      include_answer: true,
      include_raw_content: 'text',
      include_images: true,
      include_image_descriptions: true,
      include_favicon: true,
      include_usage: true,
      auto_parameters: true,
      exact_match: true,
      language: 'en',
      filter_by_language: true,
      country: 'us',
      chunks_per_source: 2,
    })
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer cfg-key')
    await fiber.dispose()
  })

  it('falls back to $TAVILY_API_KEY and the default base URL when config omits them', async () => {
    process.env.TAVILY_API_KEY = 'env-key'
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, fiber } = await mount({})
    await ctx.web.search({ query: 'q' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.tavily.com/search')
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer env-key')
    await fiber.dispose()
  })

  it('lets a literal config key win over the environment', async () => {
    process.env.TAVILY_API_KEY = 'env-key'
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, fiber } = await mount({ apiKey: 'cfg-key' })
    await ctx.web.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer cfg-key')
    await fiber.dispose()
  })

  it('honors a custom apiKeyEnv name', async () => {
    process.env.MY_TAVILY_KEY = 'custom-env-key'
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, fiber } = await mount({ apiKeyEnv: 'MY_TAVILY_KEY' })
    await ctx.web.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer custom-env-key')
    await fiber.dispose()
  })

  it('falls back to $TAVILY_BASE_URL when config omits baseURL', async () => {
    process.env.TAVILY_BASE_URL = 'https://env.tavily.test'
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, fiber } = await mount({})
    await ctx.web.search({ query: 'q' })
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toBe('https://env.tavily.test/search')
    await fiber.dispose()
  })

  it('runs keyless with an empty config and an empty environment', async () => {
    delete process.env.TAVILY_API_KEY
    delete process.env.TAVILY_BASE_URL
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, fiber } = await mount({})
    await ctx.web.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['authorization']).toBeUndefined()
    expect(headers['x-tavily-access-mode']).toBe('keyless')
    await fiber.dispose()
  })

  it('runs keyless when a config key is empty', async () => {
    delete process.env.TAVILY_API_KEY
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, fiber } = await mount({ apiKey: '' })
    await ctx.web.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['x-tavily-access-mode']).toBe('keyless')
    await fiber.dispose()
  })

  it('runs keyless when the environment key is empty', async () => {
    process.env.TAVILY_API_KEY = ''
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const { ctx, fiber } = await mount({})
    await ctx.web.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['x-tavily-access-mode']).toBe('keyless')
    await fiber.dispose()
  })
})

describe('web-search-tavily provider selection with multiple providers', () => {
  const fakeExa: WebSearchProvider = {
    id: 'exa',
    available: () => true,
    search: async () => ({ sources: [{ url: 'https://exa.test' }], truncated: false }),
  }

  it('is ambiguous when multiple usable providers are registered and none is configured', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ results: [] })))
    const ctx = new Context()
    await ctx.plugin(WebRuntime, {})
    ctx.web.registerSearchProvider(fakeExa)
    await ctx.plugin(tavilyPlugin, {})
    await expect(ctx.web.search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_AMBIGUOUS' }))
  })

  it('uses tavily when searchProvider pins it', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: TAVILY_PROVIDER_ID })
    const exaSearch = vi.fn(fakeExa.search)
    ctx.web.registerSearchProvider({ ...fakeExa, search: exaSearch })
    await ctx.plugin(tavilyPlugin, {})
    await ctx.web.search({ query: 'q' })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(exaSearch).not.toHaveBeenCalled()
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toBe('https://api.tavily.com/search')
  })

  it('uses the other provider when searchProvider pins it', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: 'exa' })
    const exaSearch = vi.fn(fakeExa.search)
    ctx.web.registerSearchProvider({ ...fakeExa, search: exaSearch })
    await ctx.plugin(tavilyPlugin, {})
    await ctx.web.search({ query: 'q' })
    expect(exaSearch).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
