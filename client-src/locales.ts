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
  description: 'Tavily 搜索提供商（keyless 模式或 API 密钥）。',
  apiKey: 'API 密钥',
  apiKeyHint: '留空则使用 TAVILY_API_KEY 环境变量或密钥库中的凭据。',
  apiKeySet: '已配置密钥。',
  apiKeyUnset: '未配置密钥（keyless 模式）。',
  apiKeyEnv: '密钥环境变量',
  apiKeyEnvHint: '凭据引用；默认为 TAVILY_API_KEY。',
  baseURL: '接口地址',
  baseURLHint: '默认使用 Tavily 公共 API；可通过 TAVILY_BASE_URL 覆盖。',
  searchDepth: '检索深度',
  searchDepthHint: 'basic 适合常规检索，advanced 返回更全的内容。',
  maxResults: '结果数量',
  maxResultsHint: '单次搜索默认返回的结果条数。',
  includeAnswer: '生成回答',
  includeAnswerHint: '请求 Tavily 基于结果生成一段回答。',
  includeImages: '包含图片',
  includeImagesHint: '返回图片结果。',
  includeRawContent: '包含原文',
  includeRawContentHint: '返回结果的原始页面内容。',
  includeFavicon: '包含图标',
  includeFaviconHint: '返回结果站点的 favicon 地址。',
  includeUsage: '包含用量',
  includeUsageHint: '返回本次搜索的额度消耗信息。',
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
  description: 'The Tavily search provider (keyless mode or API key).',
  apiKey: 'API key',
  apiKeyHint: 'Leave blank to use the TAVILY_API_KEY environment variable or credential store.',
  apiKeySet: 'A key is configured.',
  apiKeyUnset: 'No key configured (keyless mode).',
  apiKeyEnv: 'Key environment variable',
  apiKeyEnvHint: 'Credential reference; defaults to TAVILY_API_KEY.',
  baseURL: 'Endpoint',
  baseURLHint: 'Defaults to the Tavily public API; overridable via TAVILY_BASE_URL.',
  searchDepth: 'Search depth',
  searchDepthHint: 'basic for routine retrieval, advanced for fuller content.',
  maxResults: 'Result count',
  maxResultsHint: 'Default number of results one search returns.',
  includeAnswer: 'Include answer',
  includeAnswerHint: 'Ask Tavily for a generated answer over the results.',
  includeImages: 'Include images',
  includeImagesHint: 'Return image results.',
  includeRawContent: 'Include raw content',
  includeRawContentHint: 'Return raw page content of the results.',
  includeFavicon: 'Include favicons',
  includeFaviconHint: 'Return favicon URLs of the result sites.',
  includeUsage: 'Include usage',
  includeUsageHint: 'Return credit-usage information for this search.',
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
