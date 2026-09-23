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
 * its `Volatile` ref without re-registering the provider. The card that renders
 * the curated subset lives in `client-src/` and is published as the bundle's
 * `web` client face.
 *
 * @module @junjiangao/dsh-web-search-tavily
 */
import type { Context, Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { TavilyDomainMode, TavilySearchDepth, TavilyTimeRange, TavilyTopic } from './provider.ts';
export { TAVILY_DEFAULT_BASE_URL, TAVILY_DEFAULT_SEARCH_DEPTH, TAVILY_MAX_RESULTS, TAVILY_PROVIDER_ID, TavilySearchProvider, } from './provider.ts';
export type { TavilyDomainMode, TavilySearchDepth, TavilySearchProviderOptions, TavilyTimeRange, TavilyTopic, } from './provider.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "web-search-tavily";
/** The web seam this provider registers into. */
export declare const inject: string[];
/**
 * Plugin config — the Loader entry's schema, which is also the form the
 * settings page renders. Every field is a `Volatile` ref at runtime, so
 * `apply` reads the current value per search instead of freezing the entry
 * value; `apply` fills env-var and constant defaults.
 *
 * The schema and the settings card deliberately disagree: the schema carries
 * the whole Tavily parameter surface (so a profile patch can still reach any
 * of it), while `client-src/fields.ts` renders only the parameters whose value
 * a deployment can meaningfully choose *and* whose change improves result
 * quality. Everything else stays at Tavily's own default and is invisible in
 * the UI — see the README table for the per-parameter rationale.
 */
export interface Config {
    /** Literal Tavily API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
    apiKey: Volatile<string | undefined>;
    /** Credential reference / environment variable carrying the key; defaults to `TAVILY_API_KEY` (schema default). */
    apiKeyEnv: Volatile<string>;
    /** Endpoint base; `/search` is appended. Defaults to the public API, overridable via `TAVILY_BASE_URL`. */
    baseURL: Volatile<string | undefined>;
    /** Retrieval depth sent as `search_depth`. Defaults to `basic` (schema default). */
    searchDepth: Volatile<TavilySearchDepth>;
    /** Topic filter sent as `topic`. Defaults to `general` (omitted); query-level intent, so it is not surfaced. */
    topic: Volatile<TavilyTopic | undefined>;
    /** Relative recency window sent as `time_range`. Query-level intent, so it is not surfaced. */
    timeRange: Volatile<TavilyTimeRange | undefined>;
    /** Absolute start date (YYYY-MM-DD) sent as `start_date`. Query-level intent, so it is not surfaced. */
    startDate: Volatile<string | undefined>;
    /** Absolute end date (YYYY-MM-DD) sent as `end_date`. Query-level intent, so it is not surfaced. */
    endDate: Volatile<string | undefined>;
    /** Day window sent as `days`. Query-level intent, so it is not surfaced. */
    days: Volatile<number | undefined>;
    /**
     * Return `published_date` per result, sent as `include_published_date`.
     * Defaults to `true`: the date is additive metadata the tool output renders
     * as `(date)`, which lets the model weigh freshness. Tavily's own default is
     * `false`; set it here (or in a patch) to opt out.
     */
    includePublishedDate: Volatile<boolean>;
    /** Drop out-of-window and undated results, sent as `filter_by_published_date`. Defaults to `false`, which keeps undated results. */
    filterByPublishedDate: Volatile<boolean | undefined>;
    /** Default result count when a request carries no `maxResults`. Must be a positive integer. */
    maxResults: Volatile<number | undefined>;
    /** Domains that must appear in results, sent as `include_domains`. Empty when unset. */
    includeDomains: Volatile<string[]>;
    /** How `include_domains` applies, sent as `include_domains_mode`. Dropped when no domains are set, which would otherwise be a 400. */
    includeDomainsMode: Volatile<TavilyDomainMode | undefined>;
    /** Domains excluded from results, sent as `exclude_domains`. Empty when unset. */
    excludeDomains: Volatile<string[]>;
    /** Ask Tavily for a generated answer, sent as `include_answer`. Defaults to `false` (omitted); a harness with its own model synthesizes its own answer. */
    includeAnswer: Volatile<boolean | 'basic' | 'advanced' | undefined>;
    /** Ask Tavily for raw page content, sent as `include_raw_content`. Defaults to `false` (omitted); the snippet already prefers `content`. */
    includeRawContent: Volatile<boolean | 'markdown' | 'text' | undefined>;
    /** Let Tavily auto-configure parameters, sent as `auto_parameters`. Defaults to `false`, which keeps `search_depth` authoritative (auto mode can silently pick `advanced`). */
    autoParameters: Volatile<boolean | undefined>;
    /** Exact-match mode, sent as `exact_match`. Defaults to `false`; only meaningful when the query carries quoted phrases. */
    exactMatch: Volatile<boolean | undefined>;
    /** Preferred result language, sent as `language`. */
    language: Volatile<string | undefined>;
    /** Filter results to `language`, sent as `filter_by_language`. Dropped without a language, which would otherwise be a 400. */
    filterByLanguage: Volatile<boolean | undefined>;
    /** Country boost, sent as `country`. Defaults to unset; only honored with `topic=general`, which is not surfaced. */
    country: Volatile<string | undefined>;
    /** Chunks per source for advanced/basic/fast depths, sent as `chunks_per_source`. Tavily's default of 3 is already the maximum, so it is not surfaced. */
    chunksPerSource: Volatile<number | undefined>;
    /** Drop adult/unsafe results, sent as `safe_search`. Defaults to `false`; unsupported by `fast`/`ultra-fast`. */
    safeSearch: Volatile<boolean | undefined>;
}
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    apiKey: z<string, string, "volatile">;
    apiKeyEnv: z<string, string, "volatile-defined">;
    baseURL: z<string, string, "volatile">;
    searchDepth: z<"ultra-fast" | "fast" | "basic" | "advanced", "ultra-fast" | "fast" | "basic" | "advanced", "volatile-defined">;
    topic: z<"general" | "news" | "finance", "general" | "news" | "finance", "volatile">;
    timeRange: z<"day" | "week" | "month" | "year", "day" | "week" | "month" | "year", "volatile">;
    startDate: z<string, string, "volatile">;
    endDate: z<string, string, "volatile">;
    days: z<number, number, "volatile">;
    includePublishedDate: z<boolean, boolean, "volatile-defined">;
    filterByPublishedDate: z<boolean, boolean, "volatile">;
    maxResults: z<number, number, "volatile">;
    includeDomains: z<NoInfer<string[]>, NoInfer<string[]>, "volatile">;
    includeDomainsMode: z<"restrict" | "prefer", "restrict" | "prefer", "volatile">;
    excludeDomains: z<NoInfer<string[]>, NoInfer<string[]>, "volatile">;
    includeAnswer: z<boolean | "basic" | "advanced", boolean | "basic" | "advanced", "volatile">;
    includeRawContent: z<boolean | "markdown" | "text", boolean | "markdown" | "text", "volatile">;
    autoParameters: z<boolean, boolean, "volatile">;
    exactMatch: z<boolean, boolean, "volatile">;
    language: z<string, string, "volatile">;
    filterByLanguage: z<boolean, boolean, "volatile">;
    country: z<string, string, "volatile">;
    chunksPerSource: z<number, number, "volatile">;
    safeSearch: z<boolean, boolean, "volatile">;
}>>, Schemastery.ObjectT<NoInfer<{
    apiKey: z<string, string, "volatile">;
    apiKeyEnv: z<string, string, "volatile-defined">;
    baseURL: z<string, string, "volatile">;
    searchDepth: z<"ultra-fast" | "fast" | "basic" | "advanced", "ultra-fast" | "fast" | "basic" | "advanced", "volatile-defined">;
    topic: z<"general" | "news" | "finance", "general" | "news" | "finance", "volatile">;
    timeRange: z<"day" | "week" | "month" | "year", "day" | "week" | "month" | "year", "volatile">;
    startDate: z<string, string, "volatile">;
    endDate: z<string, string, "volatile">;
    days: z<number, number, "volatile">;
    includePublishedDate: z<boolean, boolean, "volatile-defined">;
    filterByPublishedDate: z<boolean, boolean, "volatile">;
    maxResults: z<number, number, "volatile">;
    includeDomains: z<NoInfer<string[]>, NoInfer<string[]>, "volatile">;
    includeDomainsMode: z<"restrict" | "prefer", "restrict" | "prefer", "volatile">;
    excludeDomains: z<NoInfer<string[]>, NoInfer<string[]>, "volatile">;
    includeAnswer: z<boolean | "basic" | "advanced", boolean | "basic" | "advanced", "volatile">;
    includeRawContent: z<boolean | "markdown" | "text", boolean | "markdown" | "text", "volatile">;
    autoParameters: z<boolean, boolean, "volatile">;
    exactMatch: z<boolean, boolean, "volatile">;
    language: z<string, string, "volatile">;
    filterByLanguage: z<boolean, boolean, "volatile">;
    country: z<string, string, "volatile">;
    chunksPerSource: z<number, number, "volatile">;
    safeSearch: z<boolean, boolean, "volatile">;
}>>, "plain">;
/** Settings namespace carrying this provider's endpoint, options, and key reference. The namespace is the Loader entry id. */
export declare const WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = "web-search-tavily";
/** Register the Tavily search provider with `ctx.web`. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map