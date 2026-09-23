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
import { credentialRef, isCredentialRefName } from '@deepseek-ai/dsh-credentials';
import z from '@deepseek-ai/schemastery';
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment';
import { WebError } from '@deepseek-ai/dsh-web';
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
    // The one deliberate deviation from Tavily's own default: dates are additive
    // metadata that the tool output renders, so they are on unless a deployment
    // opts out.
    includePublishedDate: z.boolean().default(true).volatile(),
    filterByPublishedDate: z.boolean().volatile(),
    maxResults: z.number().step(1).min(1).volatile(),
    // Schemastery fills an absent array with [] (it has no .optional() in this
    // version), so the resolved section always carries an array; empty arrays
    // are omitted from the request body by the provider.
    includeDomains: z.array(z.string()).volatile(),
    includeDomainsMode: z.union(['restrict', 'prefer']).volatile(),
    excludeDomains: z.array(z.string()).volatile(),
    includeAnswer: z.union([z.boolean(), z.union(['basic', 'advanced'])]).volatile(),
    includeRawContent: z.union([z.boolean(), z.union(['markdown', 'text'])]).volatile(),
    autoParameters: z.boolean().volatile(),
    exactMatch: z.boolean().volatile(),
    language: z.string().volatile(),
    filterByLanguage: z.boolean().volatile(),
    country: z.string().volatile(),
    chunksPerSource: z.number().step(1).min(1).volatile(),
    safeSearch: z.boolean().volatile(),
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
    // A reference outside the credential grammar has nothing to resolve, and
    // `credentialRef` answers that with a bare `TypeError` — outside the seam's
    // error vocabulary, so a caller cannot route on it and the message never
    // names the setting that is wrong. Reported here instead, at use time rather
    // than at load: a typo must not take the plugin (and the settings card that
    // fixes it) down at boot.
    if (!isCredentialRefName(config.apiKeyEnv)) {
        throw new WebError(`Tavily search: apiKeyEnv "${config.apiKeyEnv}" is not a credential reference name`
            + ` (expected an environment-variable name such as ${DEFAULT_API_KEY_ENV})`, 'TAVILY_INVALID_CREDENTIAL_REF');
    }
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
        // Schema-defaulted, so the resolved value is always a boolean.
        includePublishedDate: config.includePublishedDate,
        ...config.filterByPublishedDate !== undefined ? { filterByPublishedDate: config.filterByPublishedDate } : {},
        // Volatile snapshots are readonly; the provider only reads them, but the
        // option shape stays a plain array.
        includeDomains: [...config.includeDomains],
        ...config.includeDomainsMode !== undefined ? { includeDomainsMode: config.includeDomainsMode } : {},
        excludeDomains: [...config.excludeDomains],
        ...config.includeAnswer !== undefined ? { includeAnswer: config.includeAnswer } : {},
        ...config.includeRawContent !== undefined ? { includeRawContent: config.includeRawContent } : {},
        ...config.autoParameters !== undefined ? { autoParameters: config.autoParameters } : {},
        ...config.exactMatch !== undefined ? { exactMatch: config.exactMatch } : {},
        ...config.language !== undefined ? { language: config.language } : {},
        ...config.filterByLanguage !== undefined ? { filterByLanguage: config.filterByLanguage } : {},
        ...config.country !== undefined ? { country: config.country } : {},
        ...config.chunksPerSource !== undefined ? { chunksPerSource: config.chunksPerSource } : {},
        ...config.safeSearch !== undefined ? { safeSearch: config.safeSearch } : {},
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
        includePublishedDate: config.includePublishedDate.get(),
        filterByPublishedDate: config.filterByPublishedDate.get(),
        maxResults: config.maxResults.get(),
        includeDomains: config.includeDomains.get(),
        includeDomainsMode: config.includeDomainsMode.get(),
        excludeDomains: config.excludeDomains.get(),
        includeAnswer: config.includeAnswer.get(),
        includeRawContent: config.includeRawContent.get(),
        autoParameters: config.autoParameters.get(),
        exactMatch: config.exactMatch.get(),
        language: config.language.get(),
        filterByLanguage: config.filterByLanguage.get(),
        country: config.country.get(),
        chunksPerSource: config.chunksPerSource.get(),
        safeSearch: config.safeSearch.get(),
    })));
}
//# sourceMappingURL=index.js.map