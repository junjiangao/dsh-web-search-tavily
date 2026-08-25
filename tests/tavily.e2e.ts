import { describe, expect, it } from 'vitest'
import { TavilySearchProvider, TAVILY_DEFAULT_BASE_URL, TAVILY_DEFAULT_SEARCH_DEPTH } from '../src/provider.ts'

/**
 * Real-API smoke for the Tavily search provider. Self-skips without
 * `$TAVILY_API_KEY` (CI has no secrets), per the with-key e2e policy in
 * docs/testing.md. A keyless smoke is opt-in via `$TAVILY_KEYLESS_E2E=1`
 * because keyless mode is rate-limited by the Tavily server.
 */
const apiKey = process.env.TAVILY_API_KEY
const maybe = apiKey !== undefined && apiKey.length > 0 ? describe : describe.skip

maybe('TavilySearchProvider real API', () => {
  it('returns sources for a live query with a key', async () => {
    const provider = new TavilySearchProvider(() => ({
      apiKey: apiKey!,
      baseURL: process.env.TAVILY_BASE_URL ?? TAVILY_DEFAULT_BASE_URL,
      searchDepth: TAVILY_DEFAULT_SEARCH_DEPTH,
    }))
    const result = await provider.search({ query: 'DeepSeek Harness', maxResults: 5 })
    expect(result.sources.length).toBeGreaterThan(0)
    for (const source of result.sources) expect(source.url).toMatch(/^https?:\/\//)
  }, 30_000)
})

const keylessEnabled = process.env.TAVILY_KEYLESS_E2E === '1'
const maybeKeyless = keylessEnabled ? describe : describe.skip

maybeKeyless('TavilySearchProvider keyless real API', () => {
  it('returns a well-formed result envelope without a key', async () => {
    const provider = new TavilySearchProvider(() => ({
      baseURL: TAVILY_DEFAULT_BASE_URL,
      searchDepth: TAVILY_DEFAULT_SEARCH_DEPTH,
    }))
    const result = await provider.search({ query: 'DeepSeek', maxResults: 3 })
    expect(Array.isArray(result.sources)).toBe(true)
    expect(result.truncated).toBe(false)
  }, 30_000)
})
