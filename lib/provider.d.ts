/**
 * `TavilySearchProvider`: a `WebSearchProvider` backed by the Tavily search API
 * (`POST /search`). With a resolved API key it sends `Authorization: Bearer`
 * and the full official search parameter surface; without one it runs in
 * Tavily's keyless mode — no authorization header, `x-tavily-access-mode:
 * keyless`, and the `-keyless` client-source suffix, matching the official SDK
 * convention. `answer` maps to `content`; each result maps to a
 * `WebSearchSource` with the snippet preferring `content` and falling back to
 * `raw_content`.
 * @module @deepseek-ai/dsh-web-search-tavily/provider
 */
import type { WebSearchProvider, WebSearchRequest, WebSearchResult, WebSearchSource } from '@deepseek-ai/dsh-web';
import type { TavilyErrorBody, TavilyResult, TavilySearchResponse } from './types.ts';
/** Stable id this provider registers under. */
export declare const TAVILY_PROVIDER_ID = "tavily";
/** Default Tavily endpoint; `/search` is the operation. */
export declare const TAVILY_DEFAULT_BASE_URL = "https://api.tavily.com";
/** Default search depth (Tavily's own default; cheapest general-purpose depth). */
export declare const TAVILY_DEFAULT_SEARCH_DEPTH = "basic";
/** Tavily's documented upper bound for `max_results`. */
export declare const TAVILY_MAX_RESULTS = 20;
/** Search depth values Tavily accepts. */
export type TavilySearchDepth = 'ultra-fast' | 'fast' | 'basic' | 'advanced';
/** Topic values Tavily accepts. */
export type TavilyTopic = 'general' | 'news' | 'finance';
/** Relative recency window values Tavily accepts. */
export type TavilyTimeRange = 'day' | 'week' | 'month' | 'year';
/**
 * Resolved provider options for one search operation. The plugin's `apply`
 * supplies the credential resolver and constant defaults via a thunk so the
 * settings section can change between searches without re-registration.
 */
export interface TavilySearchProviderOptions {
    /** Literal Tavily API key; when present it wins over {@link resolveApiKey}. */
    apiKey?: string;
    /** Resolve the current Tavily API key for one search operation. */
    resolveApiKey?: () => Promise<string | undefined>;
    /** Endpoint base; `/search` is appended. */
    baseURL: string;
    /** Retrieval depth sent as `search_depth`. */
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
    /** Default result count when a request carries no `maxResults`. */
    maxResults?: number;
    /** Domains that must appear in results, sent as `include_domains`. */
    includeDomains?: string[];
    /** Domains excluded from results, sent as `exclude_domains`. */
    excludeDomains?: string[];
    /** Ask Tavily for a generated answer, sent as `include_answer`. */
    includeAnswer?: boolean | 'basic' | 'advanced';
    /** Ask Tavily for raw page content, sent as `include_raw_content`. */
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
    /** Chunks per source for advanced/fast depths, sent as `chunks_per_source`. */
    chunksPerSource?: number;
}
/**
 * Map one Tavily result to a normalized source. Blank optional fields are
 * omitted rather than emitted empty; the snippet prefers `content` and falls
 * back to `raw_content` (present when `include_raw_content` was requested).
 *
 * @param result - one entry of Tavily's `results[]`.
 * @returns the normalized source, or `undefined` when the entry carries no URL.
 */
export declare function mapTavilyResult(result: TavilyResult): WebSearchSource | undefined;
/**
 * Map a Tavily response envelope to a normalized search result. The generated
 * `answer` becomes `content` when present; URL-less results are dropped. The
 * web service owns the final `maxResults` truncation, so `truncated` is
 * always `false` here.
 *
 * @param response - the parsed `POST /search` response body.
 * @returns the normalized result.
 */
export declare function mapTavilyResponse(response: TavilySearchResponse): WebSearchResult;
/**
 * Extract the most specific error detail from a Tavily error body, or
 * `undefined` when the body carries none.
 *
 * @param body - the parsed error response body.
 * @returns the error message, or `undefined` when no detail is present.
 */
export declare function tavilyErrorDetail(body: TavilyErrorBody): string | undefined;
/** The Tavily-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export declare class TavilySearchProvider implements WebSearchProvider {
    private readonly resolveOptions;
    readonly id = "tavily";
    /**
     * @param resolveOptions - the options for the NEXT operation, snapshotted
     * once at each operation's entry so one search never mixes two sections. A
     * thunk rather than a value because the plugin's settings section can change
     * between searches.
     */
    constructor(resolveOptions: () => TavilySearchProviderOptions);
    available(): boolean;
    search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult>;
    /**
     * Resolve one operation's credential without retaining it on the provider.
     * @param options - the caller's snapshot, so the key and the endpoint it is
     * sent to come from one section.
     * @param signal - abort signal for the surrounding search.
     * @returns the resolved key, or `undefined` for keyless mode.
     */
    private apiKey;
}
//# sourceMappingURL=provider.d.ts.map