/**
 * `@junjiangao/dsh-web-search-tavily`: registers a Tavily-backed
 * `WebSearchProvider` with `ctx.web`. A function/namespace plugin (NOT a
 * default-export service): it registers INTO the seam's provider registry,
 * exactly as `@deepseek-ai/dsh-web-search-deepseek` registers a provider into
 * `ctx.web`. Without a resolved API key the provider runs in Tavily's keyless
 * mode.
 *
 * dsh 0.1.7 owns plugin configuration through the Loader entry itself: the
 * exported `Config` schema below is what the settings page renders, and every
 * field is `volatile()` so a committed edit reaches the next search through
 * its `Volatile` ref without re-registering the provider. There is no
 * `settings.installSection` wiring and no client face.
 *
 * @module @junjiangao/dsh-web-search-tavily
 */

import type { Context, Volatile } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
// Type-only import keeps the seam's cordis service augmentation visible
// (`ctx.web`) without adding a runtime edge.
import type {} from '@deepseek-ai/dsh-web'
import {
  TAVILY_DEFAULT_BASE_URL,
  TAVILY_DEFAULT_SEARCH_DEPTH,
  TavilySearchProvider,
} from './provider.ts'
import type { TavilySearchDepth, TavilySearchProviderOptions, TavilyTimeRange, TavilyTopic } from './provider.ts'

export {
  TAVILY_DEFAULT_BASE_URL,
  TAVILY_DEFAULT_SEARCH_DEPTH,
  TAVILY_MAX_RESULTS,
  TAVILY_PROVIDER_ID,
  TavilySearchProvider,
} from './provider.ts'
export type {
  TavilySearchDepth,
  TavilySearchProviderOptions,
  TavilyTimeRange,
  TavilyTopic,
} from './provider.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-tavily'

/** The web seam this provider registers into. */
export const inject = ['web']

const DEFAULT_API_KEY_ENV = 'TAVILY_API_KEY'

/** Environment variable naming this provider's endpoint. */
const BASE_URL_ENV = 'TAVILY_BASE_URL'

/**
 * Plugin config — the Loader entry's schema, which is also the form the
 * settings page renders. Every field is a `Volatile` ref at runtime, so
 * `apply` reads the current value per search instead of freezing the entry
 * value; `apply` fills env-var and constant defaults.
 */
export interface Config {
  /** Literal Tavily API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
  apiKey: Volatile<string | undefined>
  /** Credential reference / environment variable carrying the key; defaults to `TAVILY_API_KEY` (schema default). */
  apiKeyEnv: Volatile<string>
  /** Endpoint base; `/search` is appended. Defaults to the public API, overridable via `TAVILY_BASE_URL`. */
  baseURL: Volatile<string | undefined>
  /** Retrieval depth sent as `search_depth`. Defaults to `basic` (schema default). */
  searchDepth: Volatile<TavilySearchDepth>
  /** Topic filter sent as `topic`. */
  topic: Volatile<TavilyTopic | undefined>
  /** Relative recency window sent as `time_range`. */
  timeRange: Volatile<TavilyTimeRange | undefined>
  /** Absolute start date (YYYY-MM-DD) sent as `start_date`. */
  startDate: Volatile<string | undefined>
  /** Absolute end date (YYYY-MM-DD) sent as `end_date`. */
  endDate: Volatile<string | undefined>
  /** Day window sent as `days`. */
  days: Volatile<number | undefined>
  /** Default result count when a request carries no `maxResults`. Must be a positive integer. */
  maxResults: Volatile<number | undefined>
  /** Domains that must appear in results, sent as `include_domains`. Empty when unset. */
  includeDomains: Volatile<string[]>
  /** Domains excluded from results, sent as `exclude_domains`. Empty when unset. */
  excludeDomains: Volatile<string[]>
  /** Ask Tavily for a generated answer, sent as `include_answer`. Defaults to `false` (omitted). */
  includeAnswer: Volatile<boolean | 'basic' | 'advanced' | undefined>
  /** Ask Tavily for raw page content, sent as `include_raw_content`. Defaults to `false` (omitted). */
  includeRawContent: Volatile<boolean | 'markdown' | 'text' | undefined>
  /** Ask Tavily for image results, sent as `include_images`. */
  includeImages: Volatile<boolean | undefined>
  /** Ask Tavily for AI image descriptions, sent as `include_image_descriptions`. */
  includeImageDescriptions: Volatile<boolean | undefined>
  /** Ask Tavily for favicon URLs, sent as `include_favicon`. */
  includeFavicon: Volatile<boolean | undefined>
  /** Ask Tavily for credit-usage info, sent as `include_usage`. */
  includeUsage: Volatile<boolean | undefined>
  /** Let Tavily auto-configure parameters, sent as `auto_parameters`. */
  autoParameters: Volatile<boolean | undefined>
  /** Exact-match mode, sent as `exact_match`. */
  exactMatch: Volatile<boolean | undefined>
  /** Preferred result language, sent as `language`. */
  language: Volatile<string | undefined>
  /** Filter results to `language`, sent as `filter_by_language`. */
  filterByLanguage: Volatile<boolean | undefined>
  /** Country boost, sent as `country`. */
  country: Volatile<string | undefined>
  /** Chunks per source for advanced/fast depths, sent as `chunks_per_source`. Must be a positive integer. */
  chunksPerSource: Volatile<number | undefined>
}

export const Config = z.object({
  apiKey: z.string().role('secret').volatile(),
  apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV).volatile(),
  // Declared here rather than only at the use site: a configuration surface
  // renders the resolved section, so a default the schema does not carry reads
  // there as no value at all.
  // No default here: `apply` resolves config → $TAVILY_BASE_URL → default,
  // and a schema default would shadow the environment fallback.
  baseURL: z.string().volatile(),
  searchDepth: z.union(['ultra-fast', 'fast', 'basic', 'advanced'] as const).default(TAVILY_DEFAULT_SEARCH_DEPTH).volatile(),
  topic: z.union(['general', 'news', 'finance'] as const).volatile(),
  timeRange: z.union(['day', 'week', 'month', 'year'] as const).volatile(),
  startDate: z.string().volatile(),
  endDate: z.string().volatile(),
  days: z.number().step(1).min(1).volatile(),
  maxResults: z.number().step(1).min(1).volatile(),
  // Schemastery fills an absent array with [] (it has no .optional() in this
  // version), so the resolved section always carries an array; empty arrays
  // are omitted from the request body by the provider.
  includeDomains: z.array(z.string()).volatile(),
  excludeDomains: z.array(z.string()).volatile(),
  includeAnswer: z.union([z.boolean(), z.union(['basic', 'advanced'] as const)]).volatile(),
  includeRawContent: z.union([z.boolean(), z.union(['markdown', 'text'] as const)]).volatile(),
  includeImages: z.boolean().volatile(),
  includeImageDescriptions: z.boolean().volatile(),
  includeFavicon: z.boolean().volatile(),
  includeUsage: z.boolean().volatile(),
  autoParameters: z.boolean().volatile(),
  exactMatch: z.boolean().volatile(),
  language: z.string().volatile(),
  filterByLanguage: z.boolean().volatile(),
  country: z.string().volatile(),
  chunksPerSource: z.number().step(1).min(1).volatile(),
})

/** Settings namespace carrying this provider's endpoint, options, and key reference. The namespace is the Loader entry id. */
export const WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = 'web-search-tavily'

/**
 * Project the current config values into the options the provider serves its
 * next search with. Environment fallbacks stay here rather than in the
 * provider: every value it reads is already fully defaulted. Keyless mode is
 * the fallback when every key source is empty — this is not an error.
 * @param ctx - plugin context supplying the credential and environment planes.
 * @param config - the config values read from their `Volatile` refs.
 * @returns options for one search.
 */
function resolveOptions(
  ctx: Context, config: { [K in keyof Config]: ReturnType<Config[K]['get']> },
): TavilySearchProviderOptions {
  // The schema default guarantees both values; the constants stay for defaults.
  const apiKeyEnv = credentialRef(config.apiKeyEnv)
  const literalApiKey = config.apiKey !== undefined && config.apiKey.length > 0
    ? config.apiKey
    : undefined
  return {
    ...literalApiKey === undefined ? {} : { apiKey: literalApiKey },
    resolveApiKey: async () => {
      const credentials = ctx.get('credentials')
      if (credentials !== undefined) return (await credentials.resolve(apiKeyEnv))?.value
      // Without the seam the environment is the whole credential plane.
      const ambient = launchEnvironmentOf(ctx).get(apiKeyEnv)
      return ambient !== undefined && ambient.value.length > 0 ? ambient.value : undefined
    },
    baseURL: config.baseURL
      ?? launchEnvironmentOf(ctx).get(BASE_URL_ENV)?.value
      ?? TAVILY_DEFAULT_BASE_URL,
    searchDepth: config.searchDepth,
    ...config.topic !== undefined ? { topic: config.topic } : {},
    ...config.timeRange !== undefined ? { timeRange: config.timeRange } : {},
    ...config.startDate !== undefined ? { startDate: config.startDate } : {},
    ...config.endDate !== undefined ? { endDate: config.endDate } : {},
    ...config.days !== undefined ? { days: config.days } : {},
    ...config.maxResults !== undefined ? { maxResults: config.maxResults } : {},
    // Volatile snapshots are readonly; the provider only reads them, but the
    // option shape stays a plain array.
    includeDomains: [...config.includeDomains],
    excludeDomains: [...config.excludeDomains],
    ...config.includeAnswer !== undefined ? { includeAnswer: config.includeAnswer } : {},
    ...config.includeRawContent !== undefined ? { includeRawContent: config.includeRawContent } : {},
    ...config.includeImages !== undefined ? { includeImages: config.includeImages } : {},
    ...config.includeImageDescriptions !== undefined ? { includeImageDescriptions: config.includeImageDescriptions } : {},
    ...config.includeFavicon !== undefined ? { includeFavicon: config.includeFavicon } : {},
    ...config.includeUsage !== undefined ? { includeUsage: config.includeUsage } : {},
    ...config.autoParameters !== undefined ? { autoParameters: config.autoParameters } : {},
    ...config.exactMatch !== undefined ? { exactMatch: config.exactMatch } : {},
    ...config.language !== undefined ? { language: config.language } : {},
    ...config.filterByLanguage !== undefined ? { filterByLanguage: config.filterByLanguage } : {},
    ...config.country !== undefined ? { country: config.country } : {},
    ...config.chunksPerSource !== undefined ? { chunksPerSource: config.chunksPerSource } : {},
  }
}

/** Register the Tavily search provider with `ctx.web`. */
export function apply(ctx: Context, config: Config): void {
  // Every field is volatile: the Loader updates these refs in place when the
  // settings document commits, so each search projects the current values and
  // the provider is registered exactly once.
  ctx.web.registerSearchProvider(new TavilySearchProvider(() => resolveOptions(ctx, {
    apiKey: config.apiKey.get(),
    apiKeyEnv: config.apiKeyEnv.get(),
    baseURL: config.baseURL.get(),
    searchDepth: config.searchDepth.get(),
    topic: config.topic.get(),
    timeRange: config.timeRange.get(),
    startDate: config.startDate.get(),
    endDate: config.endDate.get(),
    days: config.days.get(),
    maxResults: config.maxResults.get(),
    includeDomains: config.includeDomains.get(),
    excludeDomains: config.excludeDomains.get(),
    includeAnswer: config.includeAnswer.get(),
    includeRawContent: config.includeRawContent.get(),
    includeImages: config.includeImages.get(),
    includeImageDescriptions: config.includeImageDescriptions.get(),
    includeFavicon: config.includeFavicon.get(),
    includeUsage: config.includeUsage.get(),
    autoParameters: config.autoParameters.get(),
    exactMatch: config.exactMatch.get(),
    language: config.language.get(),
    filterByLanguage: config.filterByLanguage.get(),
    country: config.country.get(),
    chunksPerSource: config.chunksPerSource.get(),
  })))
}
