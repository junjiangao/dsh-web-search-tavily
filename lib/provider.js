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
import { WebError } from '@deepseek-ai/dsh-web';
/** Stable id this provider registers under. */
export const TAVILY_PROVIDER_ID = 'tavily';
/** Default Tavily endpoint; `/search` is the operation. */
export const TAVILY_DEFAULT_BASE_URL = 'https://api.tavily.com';
/** Default search depth (Tavily's own default; cheapest general-purpose depth). */
export const TAVILY_DEFAULT_SEARCH_DEPTH = 'basic';
/** Tavily's documented upper bound for `max_results`. */
export const TAVILY_MAX_RESULTS = 20;
/** Attribution header sent on every request. Bump with the package version. */
const USER_AGENT = 'deepseek-harness/0.0.1';
const TAVILY_SEARCH_DEPTHS = ['ultra-fast', 'fast', 'basic', 'advanced'];
const TAVILY_TOPICS = ['general', 'news', 'finance'];
const TAVILY_TIME_RANGES = ['day', 'week', 'month', 'year'];
/**
 * Map one Tavily result to a normalized source. Blank optional fields are
 * omitted rather than emitted empty; the snippet prefers `content` and falls
 * back to `raw_content` (present when `include_raw_content` was requested).
 *
 * @param result - one entry of Tavily's `results[]`.
 * @returns the normalized source, or `undefined` when the entry carries no URL.
 */
export function mapTavilyResult(result) {
    if (result.url.length === 0)
        return undefined;
    const title = nonBlank(result.title);
    const snippet = nonBlank(result.content) ?? nonBlank(result.raw_content);
    const publishedAt = nonBlank(result.published_date);
    return {
        url: result.url,
        ...title !== undefined ? { title } : {},
        ...snippet !== undefined ? { snippet } : {},
        ...publishedAt !== undefined ? { publishedAt } : {},
    };
}
/**
 * Map a Tavily response envelope to a normalized search result. The generated
 * `answer` becomes `content` when present; URL-less results are dropped. The
 * web service owns the final `maxResults` truncation, so `truncated` is
 * always `false` here.
 *
 * @param response - the parsed `POST /search` response body.
 * @returns the normalized result.
 */
export function mapTavilyResponse(response) {
    const answer = nonBlank(response.answer);
    const sources = (response.results ?? [])
        .map(mapTavilyResult)
        .filter((source) => source !== undefined);
    return {
        ...answer !== undefined ? { content: answer } : {},
        sources,
        truncated: false,
    };
}
/**
 * Extract the most specific error detail from a Tavily error body, or
 * `undefined` when the body carries none.
 *
 * @param body - the parsed error response body.
 * @returns the error message, or `undefined` when no detail is present.
 */
export function tavilyErrorDetail(body) {
    if (typeof body.error === 'object' && body.error !== null) {
        const message = body.error.message;
        if (message !== undefined && message.length > 0)
            return message;
    }
    if (typeof body.error === 'string' && body.error.length > 0)
        return body.error;
    if (typeof body.detail === 'object' && body.detail !== null) {
        const error = body.detail.error;
        if (error !== undefined && error.length > 0)
            return error;
    }
    if (typeof body.detail === 'string' && body.detail.length > 0)
        return body.detail;
    if (body.message !== undefined && body.message.length > 0)
        return body.message;
    return undefined;
}
/** The Tavily-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class TavilySearchProvider {
    resolveOptions;
    id = TAVILY_PROVIDER_ID;
    /**
     * @param resolveOptions - the options for the NEXT operation, snapshotted
     * once at each operation's entry so one search never mixes two sections. A
     * thunk rather than a value because the plugin's settings section can change
     * between searches.
     */
    constructor(resolveOptions) {
        this.resolveOptions = resolveOptions;
    }
    // Availability checks stay beside the provider's config contract. Keyless
    // mode is legitimate, so an empty key never makes the provider unavailable.
    /* jscpd:ignore-start */
    available() {
        const options = this.resolveOptions();
        return URL.canParse(options.baseURL)
            && TAVILY_SEARCH_DEPTHS.includes(options.searchDepth)
            && validOptionalEnum(options.topic, TAVILY_TOPICS)
            && validOptionalEnum(options.timeRange, TAVILY_TIME_RANGES)
            && (options.maxResults === undefined || isPositiveInteger(options.maxResults))
            && (options.days === undefined || isPositiveInteger(options.days))
            && (options.chunksPerSource === undefined || isPositiveInteger(options.chunksPerSource));
    }
    /* jscpd:ignore-end */
    async search(request, signal) {
        // One snapshot for the whole operation: credential resolution awaits, and a
        // settings write landing inside that await must not send the key resolved
        // from the old section to the endpoint named by the new one.
        const options = this.resolveOptions();
        const apiKey = await this.apiKey(options, signal);
        throwIfSearchAborted(signal);
        // A per-request bound wins over the configured default; either may be absent.
        const numResults = request.maxResults ?? options.maxResults;
        const body = buildSearchRequest(request.query, options, numResults);
        let response;
        try {
            response = await fetch(`${options.baseURL}/search`, {
                method: 'POST',
                redirect: 'error',
                headers: {
                    ...apiKey !== undefined ? { 'authorization': `Bearer ${apiKey}` } : {},
                    ...apiKey === undefined ? { 'x-tavily-access-mode': 'keyless' } : {},
                    'content-type': 'application/json',
                    'accept': 'application/json',
                    'user-agent': USER_AGENT,
                    'x-client-source': apiKey !== undefined ? 'dsh-web-search-tavily' : 'dsh-web-search-tavily-keyless',
                },
                body: JSON.stringify(body),
                ...signal !== undefined ? { signal } : {},
            });
        }
        catch (error) {
            if (signal?.aborted === true || isAbortError(error))
                throw searchAborted(signal, error);
            throw new WebError(`Tavily search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error });
        }
        if (!response.ok) {
            const status = response.status;
            let message = `Tavily API error (HTTP ${status})`;
            try {
                const parsed = await response.json();
                const detail = tavilyErrorDetail(parsed);
                if (detail !== undefined)
                    message = detail;
            }
            catch (error) {
                // An abort fired mid-body must surface as WEB_ABORTED, not be swallowed
                // into a generic HTTP-error message — cancellation is not a provider
                // error (the seam's cancellation contract).
                if (signal?.aborted === true || isAbortError(error))
                    throw searchAborted(signal, error);
                // Otherwise: the HTTP status is already captured in `message` above; a
                // malformed/non-JSON error body can only cost a richer provider message.
            }
            throw new WebError(message, 'WEB_PROVIDER_ERROR');
        }
        try {
            const payload = await response.json();
            return mapTavilyResponse(payload);
        }
        catch (error) {
            if (signal?.aborted === true || isAbortError(error))
                throw searchAborted(signal, error);
            throw new WebError(`Tavily returned an unprocessable response body: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error });
        }
    }
    /**
     * Resolve one operation's credential without retaining it on the provider.
     * @param options - the caller's snapshot, so the key and the endpoint it is
     * sent to come from one section.
     * @param signal - abort signal for the surrounding search.
     * @returns the resolved key, or `undefined` for keyless mode.
     */
    async apiKey(options, signal) {
        throwIfSearchAborted(signal);
        if (options.apiKey !== undefined && options.apiKey.length > 0)
            return options.apiKey;
        if (options.resolveApiKey === undefined)
            return undefined;
        try {
            return await abortable(options.resolveApiKey(), signal);
        }
        catch (error) {
            if (signal?.aborted === true || isAbortError(error))
                throw searchAborted(signal, error);
            throw new WebError(`Tavily search credential resolution failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error });
        }
    }
}
/**
 * Assemble the official Tavily request body; only options that are set are
 * sent, and `max_results` is clamped to Tavily's documented upper bound.
 */
function buildSearchRequest(query, options, numResults) {
    return {
        query,
        search_depth: options.searchDepth,
        ...numResults !== undefined ? { max_results: Math.min(numResults, TAVILY_MAX_RESULTS) } : {},
        ...options.topic !== undefined ? { topic: options.topic } : {},
        ...options.timeRange !== undefined ? { time_range: options.timeRange } : {},
        ...options.startDate !== undefined ? { start_date: options.startDate } : {},
        ...options.endDate !== undefined ? { end_date: options.endDate } : {},
        ...options.days !== undefined ? { days: options.days } : {},
        ...options.includeDomains !== undefined && options.includeDomains.length > 0 ? { include_domains: options.includeDomains } : {},
        ...options.excludeDomains !== undefined && options.excludeDomains.length > 0 ? { exclude_domains: options.excludeDomains } : {},
        ...options.includeAnswer !== undefined && options.includeAnswer !== false ? { include_answer: options.includeAnswer } : {},
        ...options.includeRawContent !== undefined && options.includeRawContent !== false ? { include_raw_content: options.includeRawContent } : {},
        ...options.includeImages === true ? { include_images: true } : {},
        ...options.includeImageDescriptions === true ? { include_image_descriptions: true } : {},
        ...options.includeFavicon === true ? { include_favicon: true } : {},
        ...options.includeUsage === true ? { include_usage: true } : {},
        ...options.autoParameters === true ? { auto_parameters: true } : {},
        ...options.exactMatch === true ? { exact_match: true } : {},
        ...options.language !== undefined ? { language: options.language } : {},
        ...options.filterByLanguage === true ? { filter_by_language: true } : {},
        ...options.country !== undefined ? { country: options.country } : {},
        ...options.chunksPerSource !== undefined ? { chunks_per_source: options.chunksPerSource } : {},
    };
}
/** True for a request limit that can be sent to Tavily (a positive whole number). */
function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
}
/** True when `value` is a member of `allowed`, or absent. */
function validOptionalEnum(value, allowed) {
    return value === undefined || allowed.includes(value);
}
/** `value` trimmed of blanks, or `undefined` when blank/absent. */
function nonBlank(value) {
    return value !== undefined && value !== null && value.trim().length > 0 ? value : undefined;
}
/**
 * Race a same-process asynchronous preflight against caller cancellation. The
 * attached settlement handlers keep observing an uncooperative operation after
 * abort so a later rejection cannot become unhandled.
 */
function abortable(operation, signal) {
    if (signal === undefined)
        return operation;
    if (signal.aborted)
        return Promise.reject(searchAborted(signal));
    return new Promise((resolve, reject) => {
        const onAbort = () => { reject(searchAborted(signal)); };
        signal.addEventListener('abort', onAbort, { once: true });
        void operation.then((value) => {
            signal.removeEventListener('abort', onAbort);
            resolve(value);
        }, (error) => {
            signal.removeEventListener('abort', onAbort);
            reject(new Error(String(error).replace(/^Error: /u, ''), { cause: error }));
        });
    });
}
/** Throw the provider's stable cancellation error when the caller already aborted. */
function throwIfSearchAborted(signal) {
    if (signal?.aborted === true)
        throw searchAborted(signal);
}
/** Build the provider's stable cancellation error while retaining the caller's reason. */
function searchAborted(signal, fallback) {
    return new WebError('Tavily search aborted', 'WEB_ABORTED', {
        cause: signal?.aborted === true ? signal.reason : fallback,
    });
}
/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error) {
    return error instanceof DOMException && error.name === 'AbortError';
}
//# sourceMappingURL=provider.js.map