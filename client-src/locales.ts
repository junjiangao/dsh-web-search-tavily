/**
 * Locale dictionaries for the Tavily settings card.
 *
 * The key set is the source of truth in the Chinese dictionary; the English
 * dictionary mirrors it. Keys shared with the plugin-settings shell
 * (overridden / reset / invalidNumber / save / saving / discard / unsaved /
 * saveFailed) keep the same wording the official cards use so the tab reads
 * consistently.
 */

/** The locale namespace this card registers its copy under. */
export const LOCALE_NS = 'web-search-tavily'

/** Simplified Chinese copy. */
export const zh: Record<string, string> = {
  title: 'Tavily 搜索',
  description: 'Tavily 搜索提供商（默认读取 TAVILY_API_KEY 环境变量）。',
  expand: '显示设置',
  collapse: '隐藏设置',
  recommend: '使用推荐配置',
  recommendHint: '填入 Tavily 官方默认配置（深度 basic、结果数 5、不生成回答、不包含原文/图片/图标/用量），兼容 keyless 模式，确认后保存。',
  keylessNotice: '未检测到 API 密钥（keyless 模式）：Tavily 会限流，并可能忽略或降级部分参数（结果数、深度、answer）。设置 TAVILY_API_KEY 环境变量或填写下方密钥即可。',
  apiKey: 'API 密钥',
  apiKeyHint: '留空则使用 TAVILY_API_KEY 环境变量或密钥库中的凭据；填入新密钥会保存到密钥库（不写入设置文件）。',
  apiKeySet: '已配置密钥。',
  apiKeyUnset: '未配置密钥（keyless 模式）。',
  apiKeyEnv: '密钥环境变量',
  apiKeyEnvHint: '凭据引用；默认为 TAVILY_API_KEY。',
  baseURL: '接口地址',
  baseURLHint: '默认使用 Tavily 公共 API；可通过 TAVILY_BASE_URL 覆盖。',
  searchDepth: '检索深度',
  searchDepthHint: 'basic（官方默认）适合常规检索；advanced 返回更全的内容但更慢，并消耗更多 tokens。keyless 模式可能被降级为 basic。',
  topic: '主题',
  topicHint: '按主题过滤结果：general（官方默认）/ news / finance。',
  maxResults: '结果数量',
  maxResultsHint: '默认 5（Tavily 官方默认）。结果越多，单次搜索消耗的 tokens 越大；keyless 模式可能被限制。',
  includeAnswer: '生成回答',
  includeAnswerHint: '请求 Tavily 基于结果生成一段回答，增加输出 tokens；keyless 模式可能被忽略。',
  includeImages: '包含图片',
  includeImagesHint: '返回图片结果；tokens 影响小，但结果体积明显增大。',
  includeRawContent: '包含原文',
  includeRawContentHint: '返回整页原始内容——会显著增加 tokens 与成本，请按需开启。',
  includeFavicon: '包含图标',
  includeFaviconHint: '返回结果站点的 favicon 地址；tokens 影响很小。',
  includeUsage: '包含用量',
  includeUsageHint: '返回本次搜索的额度消耗信息；不增加 tokens。',
  overridden: '已覆盖',
  reset: '恢复默认',
  invalidNumber: '请输入数字，或留空使用默认值。',
  readOnly: '当前部署以只读方式存储设置。',
  save: '保存',
  saving: '保存中…',
  discard: '放弃',
  unsaved: '未保存',
  saveFailed: '部署未接受这些值；已保留待您更正。',
}

/** English copy, checked complete against the zh key set. */
export const en: Record<string, string> = {
  title: 'Tavily Search',
  description: 'The Tavily search provider (reads the TAVILY_API_KEY environment variable by default).',
  expand: 'Show settings',
  collapse: 'Hide settings',
  recommend: 'Apply recommended settings',
  recommendHint: 'Stages the Tavily official default configuration (depth basic, 5 results, no generated answer, no raw content/images/favicons/usage), which also behaves under keyless mode; review and save.',
  keylessNotice: 'No API key detected (keyless mode): Tavily rate-limits and may ignore or downgrade some parameters (result count, depth, answer). Export TAVILY_API_KEY or enter a key below.',
  apiKey: 'API key',
  apiKeyHint: 'Leave blank to use the TAVILY_API_KEY environment variable or credential store; entering a new key saves it there (never into the settings file).',
  apiKeySet: 'A key is configured.',
  apiKeyUnset: 'No key configured (keyless mode).',
  apiKeyEnv: 'Key environment variable',
  apiKeyEnvHint: 'Credential reference; defaults to TAVILY_API_KEY.',
  baseURL: 'Endpoint',
  baseURLHint: 'Defaults to the Tavily public API; overridable via TAVILY_BASE_URL.',
  searchDepth: 'Search depth',
  searchDepthHint: 'basic (official default) for routine retrieval; advanced returns fuller content but is slower and costs more tokens. Keyless mode may downgrade it to basic.',
  topic: 'Topic',
  topicHint: 'Filter results to a topic: general (official default) / news / finance.',
  maxResults: 'Result count',
  maxResultsHint: 'Defaults to 5 (Tavily official default). More results cost more tokens per search; keyless mode may cap it.',
  includeAnswer: 'Include answer',
  includeAnswerHint: 'Ask Tavily for a generated answer over the results, adding output tokens; keyless mode may ignore it.',
  includeImages: 'Include images',
  includeImagesHint: 'Return image results; low token impact but noticeably larger payloads.',
  includeRawContent: 'Include raw content',
  includeRawContentHint: 'Return full raw page content — significantly increases tokens and cost; enable only when needed.',
  includeFavicon: 'Include favicons',
  includeFaviconHint: 'Return favicon URLs of the result sites; negligible token impact.',
  includeUsage: 'Include usage',
  includeUsageHint: 'Return credit-usage information for this search; no token impact.',
  overridden: 'Overridden',
  reset: 'Reset to default',
  invalidNumber: 'Enter a number, or leave blank to use the default.',
  readOnly: 'This deployment stores settings read-only.',
  save: 'Save',
  saving: 'Saving…',
  discard: 'Discard',
  unsaved: 'Unsaved',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
}
