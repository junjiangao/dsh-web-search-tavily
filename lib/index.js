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
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import z from '@deepseek-ai/schemastery';
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings';
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
    apiKey: z.string().role('secret'),
    apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
    // Declared here rather than only at the use site: a configuration surface
    // renders the resolved section, so a default the schema does not carry reads
    // there as no value at all.
    // No default here: `apply` resolves config → $TAVILY_BASE_URL → default,
    // and a schema default would shadow the environment fallback.
    baseURL: z.string(),
    searchDepth: z.union(['ultra-fast', 'fast', 'basic', 'advanced']).default(TAVILY_DEFAULT_SEARCH_DEPTH),
    topic: z.union(['general', 'news', 'finance']),
    timeRange: z.union(['day', 'week', 'month', 'year']),
    startDate: z.string(),
    endDate: z.string(),
    days: z.number().step(1).min(1),
    maxResults: z.number().step(1).min(1),
    // Schemastery fills an absent array with [] (it has no .optional() in this
    // version), so the resolved section always carries an array; empty arrays
    // are omitted from the request body by the provider.
    includeDomains: z.array(z.string()),
    excludeDomains: z.array(z.string()),
    includeAnswer: z.union([z.boolean(), z.union(['basic', 'advanced'])]),
    includeRawContent: z.union([z.boolean(), z.union(['markdown', 'text'])]),
    includeImages: z.boolean(),
    includeImageDescriptions: z.boolean(),
    includeFavicon: z.boolean(),
    includeUsage: z.boolean(),
    autoParameters: z.boolean(),
    exactMatch: z.boolean(),
    language: z.string(),
    filterByLanguage: z.boolean(),
    country: z.string(),
    chunksPerSource: z.number().step(1).min(1),
});
/** Settings namespace carrying this provider's endpoint, options, and key reference. */
export const WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = settingsNamespace('web-search-tavily');
/**
 * Project one resolved section into the options the provider serves its next
 * search with. Environment fallbacks stay here rather than in the provider:
 * every value it reads is already fully defaulted. Keyless mode is the fallback
 * when every key source is empty — this is not an error.
 * @param ctx - plugin context supplying the credential and environment planes.
 * @param config - the currently authoritative section.
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
        includeDomains: config.includeDomains,
        excludeDomains: config.excludeDomains,
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
    let current = () => config;
    installSettingsSection(ctx, WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, Config, config, {
        setSource: (source) => {
            current = source;
        },
        // The registration carries no resolved value: the provider projects the
        // section per search, so a committed change needs no re-registration.
        onChange: () => { },
    });
    ctx.web.registerSearchProvider(new TavilySearchProvider(() => resolveOptions(ctx, current())));
}
//# sourceMappingURL=index.js.map