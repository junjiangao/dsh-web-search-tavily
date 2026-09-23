/**
 * Wire types for the Tavily search API (`POST https://api.tavily.com/search`).
 * Types only — no runtime code. Tavily returns an optional generated `answer`,
 * a flat `results[]` with per-result content, and (when requested) images and
 * usage metadata that this provider requests but the web seam does not surface.
 *
 * @module @junjiangao/dsh-web-search-tavily/types
 */
/** Request body sent to Tavily's search endpoint (official parameter surface). */
export interface TavilySearchRequest {
    query: string;
    /** Retrieval depth: ultra-fast, fast, basic, or advanced. */
    search_depth: 'ultra-fast' | 'fast' | 'basic' | 'advanced';
    /** Result-count control; Tavily caps this at 20 and the provider clamps to it. */
    max_results?: number;
    /** Topic filter: general, news, or finance. */
    topic?: 'general' | 'news' | 'finance';
    /** Relative recency window. */
    time_range?: 'day' | 'week' | 'month' | 'year';
    /** Absolute start date (YYYY-MM-DD). */
    start_date?: string;
    /** Absolute end date (YYYY-MM-DD). */
    end_date?: string;
    /** Day window (SDK-era parameter; the endpoint still honors it). */
    days?: number;
    /** Return `published_date` per result; `topic=news` enables it automatically. */
    include_published_date?: boolean;
    /** Drop results whose date falls outside the requested window (and undated ones). */
    filter_by_published_date?: boolean;
    /** Domains that must appear in results. */
    include_domains?: string[];
    /** How `include_domains` applies; requires it to be set. */
    include_domains_mode?: 'restrict' | 'prefer';
    /** Domains excluded from results. */
    exclude_domains?: string[];
    /** Ask Tavily for a generated answer: true, basic, or advanced. */
    include_answer?: boolean | 'basic' | 'advanced';
    /** Ask Tavily for raw page content: true, markdown, or text. */
    include_raw_content?: boolean | 'markdown' | 'text';
    /** Let Tavily auto-configure parameters from query intent. */
    auto_parameters?: boolean;
    /** Exact-match mode. */
    exact_match?: boolean;
    /** Preferred result language. */
    language?: string;
    /** Filter results to `language`; requires `language`. */
    filter_by_language?: boolean;
    /** Country boost; honored only with `topic=general`. */
    country?: string;
    /** Chunks per source for advanced/basic/fast depths. */
    chunks_per_source?: number;
    /** Drop adult/unsafe results; unsupported by the fast and ultra-fast depths. */
    safe_search?: boolean;
}
/** One entry of Tavily's flat `results[]`. */
export interface TavilyResult {
    url: string;
    title?: string | null;
    /** NLP summary / snippet text. */
    content?: string | null;
    /** Full page content, present when `include_raw_content` was requested. */
    raw_content?: string | null;
    /** Semantic relevance score (0-1). */
    score?: number;
    /**
     * Provider-supplied publication date in Tavily's own RFC-1123 form
     * (`Tue, 11 Mar 2025 17:00:00 GMT`); the provider normalizes it to ISO-8601
     * before it reaches the seam.
     */
    published_date?: string | null;
}
/** Tavily's search response envelope. */
export interface TavilySearchResponse {
    /** AI-generated answer, present when `include_answer` was requested. */
    answer?: string | null;
    results?: TavilyResult[];
    /** Image results; always present as `[]` and never requested by this provider. */
    images?: unknown[];
}
/** Tavily's error response envelope (best-effort; fields vary by failure). */
export interface TavilyErrorBody {
    /** Keyless-limit envelope: `{error: {code, message, ...}}`. */
    error?: {
        code?: string;
        message?: string;
    } | string;
    /** Regular API error body: `{detail: {error: "..."}}` or a plain string. */
    detail?: {
        error?: string;
    } | string;
    message?: string;
}
//# sourceMappingURL=types.d.ts.map