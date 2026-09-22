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
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import z from '@deepseek-ai/schemastery';
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment';
import { TAVILY_DEFAULT_BASE_URL, TAVILY_DEFAULT_SEARCH_DEPTH, TavilySearchProvider, } from "./provider.js";
export { TAVILY_DEFAULT_BASE_URL, TAVILY_DEFAULT_SEARCH_DEPTH, TAVILY_MAX_RESULTS, TAVILY_PROVIDER_ID, TavilySearchProvider, } from "./provider.js";
/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-tavily';
/** The web seam this provider registers into. */
export const inject = ['web'];
const DEFAULT_API_KEY_ENV = 'TAVILY_API_KEY';
/** Environment variable naming this provider's endpoint. */
const BASE_URL_ENV = 'TAVILY_BASE_URL';
export const Config = z.object({
    apiKey: z.string().role('secret').volatile(),
    apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV).volatile(),
    // Declared here rather than only at the use site: a configuration surface
    // renders the resolved section, so a default the schema does not carry reads
    // there as no value at all.
    // No default here: `apply` resolves config → $TAVILY_BASE_URL → default,
    // and a schema default would shadow the environment fallback.
    baseURL: z.string().volatile(),
    searchDepth: z.union(['ultra-fast', 'fast', 'basic', 'advanced']).default(TAVILY_DEFAULT_SEARCH_DEPTH).volatile(),
    topic: z.union(['general', 'news', 'finance']).volatile(),
    timeRange: z.union(['day', 'week', 'month', 'year']).volatile(),
    startDate: z.string().volatile(),
    endDate: z.string().volatile(),
    days: z.number().step(1).min(1).volatile(),
    maxResults: z.number().step(1).min(1).volatile(),
    // Schemastery fills an absent array with [] (it has no .optional() in this
    // version), so the resolved section always carries an array; empty arrays
    // are omitted from the request body by the provider.
    includeDomains: z.array(z.string()).volatile(),
    excludeDomains: z.array(z.string()).volatile(),
    includeAnswer: z.union([z.boolean(), z.union(['basic', 'advanced'])]).volatile(),
    includeRawContent: z.union([z.boolean(), z.union(['markdown', 'text'])]).volatile(),
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
});
/** Settings namespace carrying this provider's endpoint, options, and key reference. The namespace is the Loader entry id. */
export const WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = 'web-search-tavily';
/**
 * Project the current config values into the options the provider serves its
 * next search with. Environment fallbacks stay here rather than in the
 * provider: every value it reads is already fully defaulted. Keyless mode is
 * the fallback when every key source is empty — this is not an error.
 * @param ctx - plugin context supplying the credential and environment planes.
 * @param config - the config values read from their `Volatile` refs.
 * @returns options for one search.
 */
function resolveOptions(ctx, config) {
    // The schema default guarantees both values; the constants stay for defaults.
    const apiKeyEnv = credentialRef(config.apiKeyEnv);
    const literalApiKey = config.apiKey !== undefined && config.apiKey.length > 0
        ? config.apiKey
        : undefined;
    return {
        ...literalApiKey === undefined ? {} : { apiKey: literalApiKey },
        resolveApiKey: async () => {
            const credentials = ctx.get('credentials');
            if (credentials !== undefined)
                return (await credentials.resolve(apiKeyEnv))?.value;
            // Without the seam the environment is the whole credential plane.
            const ambient = launchEnvironmentOf(ctx).get(apiKeyEnv);
            return ambient !== undefined && ambient.value.length > 0 ? ambient.value : undefined;
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
    };
}
/** Register the Tavily search provider with `ctx.web`. */
export function apply(ctx, config) {
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
    })));
}
//# sourceMappingURL=index.js.map