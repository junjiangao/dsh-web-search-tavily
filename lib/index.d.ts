/**
 * `@deepseek-ai/dsh-web-search-tavily`: registers a Tavily-backed
 * `WebSearchProvider` with `ctx.web` and exposes its configuration as a
 * settings section. A function/namespace plugin (NOT a default-export service):
 * it registers INTO the seam's provider registry, exactly as
 * `@deepseek-ai/dsh-web-search-deepseek` registers a provider into `ctx.web`.
 * Without a resolved API key the provider runs in Tavily's keyless mode.
 *
 * @module @deepseek-ai/dsh-web-search-tavily
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { TavilySearchDepth, TavilyTimeRange, TavilyTopic } from './provider.ts';
export { TAVILY_DEFAULT_BASE_URL, TAVILY_DEFAULT_SEARCH_DEPTH, TAVILY_MAX_RESULTS, TAVILY_PROVIDER_ID, TavilySearchProvider, } from './provider.ts';
export type { TavilySearchDepth, TavilySearchProviderOptions, TavilyTimeRange, TavilyTopic, } from './provider.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "web-search-tavily";
/** The web seam this provider registers into. */
export declare const inject: string[];
/** Plugin config — the same schema powers the settings section. All fields optional; `apply` fills env-var and constant defaults. */
export interface Config {
    /** Literal Tavily API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
    apiKey?: string;
    /** Credential reference / environment variable carrying the key; defaults to `TAVILY_API_KEY` (schema default). */
    apiKeyEnv: string;
    /** Endpoint base; `/search` is appended. Defaults to the public API, overridable via `TAVILY_BASE_URL`. */
    baseURL?: string;
    /** Retrieval depth sent as `search_depth`. Defaults to `basic` (schema default). */
    searchDepth: TavilySearchDepth;
    /** Topic filter sent as `topic`. */
    topic?: TavilyTopic;
    /** Relative recency window sent as `time_range`. */
    timeRange?: TavilyTimeRange;
    /** Absolute start date (YYYY-MM-DD) sent as `start_date`. */
    startDate?: string;
    /** Absolute end date (YYYY-MM-DD) sent as `end_date`. */
    endDate?: string;
    /** Day window sent as `days`. */
    days?: number;
    /** Default result count when a request carries no `maxResults`. Must be a positive integer. */
    maxResults?: number;
    /** Domains that must appear in results, sent as `include_domains`. Empty when unset. */
    includeDomains: string[];
    /** Domains excluded from results, sent as `exclude_domains`. Empty when unset. */
    excludeDomains: string[];
    /** Ask Tavily for a generated answer, sent as `include_answer`. Defaults to `false` (omitted). */
    includeAnswer?: boolean | 'basic' | 'advanced';
    /** Ask Tavily for raw page content, sent as `include_raw_content`. Defaults to `false` (omitted). */
    includeRawContent?: boolean | 'markdown' | 'text';
    /** Ask Tavily for image results, sent as `include_images`. */
    includeImages?: boolean;
    /** Ask Tavily for AI image descriptions, sent as `include_image_descriptions`. */
    includeImageDescriptions?: boolean;
    /** Ask Tavily for favicon URLs, sent as `include_favicon`. */
    includeFavicon?: boolean;
    /** Ask Tavily for credit-usage info, sent as `include_usage`. */
    includeUsage?: boolean;
    /** Let Tavily auto-configure parameters, sent as `auto_parameters`. */
    autoParameters?: boolean;
    /** Exact-match mode, sent as `exact_match`. */
    exactMatch?: boolean;
    /** Preferred result language, sent as `language`. */
    language?: string;
    /** Filter results to `language`, sent as `filter_by_language`. */
    filterByLanguage?: boolean;
    /** Country boost, sent as `country`. */
    country?: string;
    /** Chunks per source for advanced/fast depths, sent as `chunks_per_source`. Must be a positive integer. */
    chunksPerSource?: number;
}
export declare const Config: z<Config>;
/** Settings namespace carrying this provider's endpoint, options, and key reference. */
export declare const WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Register the Tavily search provider with `ctx.web`. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map