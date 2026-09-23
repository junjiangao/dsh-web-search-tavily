/**
 * The Plugins page copy for the Tavily provider's configuration card.
 *
 * Keys are addressed by the card as `field.<name>` and `hint.<name>`, so a
 * field added to {@link TAVILY_FIELDS} without copy renders its raw name
 * instead of failing the page.
 */

/** Dictionary namespace owned by this plugin's client half. */
export const NS = 'webSearchTavily'

const zh: Record<string, string> = {
  title: 'Tavily 搜索',
  summary: '通过 Tavily 提供网络搜索；未配置密钥时进入无密钥模式。',
  credentialConfigured: '密钥已配置',
  credentialUnset: '密钥未配置，将使用无密钥模式',
  save: '保存',
  saving: '保存中…',
  readOnly: '当前部署以只读方式保存配置，修改不会写入。',
  unavailable: '该插件当前未由 Host 提供配置。',
  saveFailed: 'Host 未接受这次保存，草稿已保留。',
  overridden: '已覆盖',
  reset: '恢复默认',
  invalidNumber: '请输入数字',
  unsetOption: '默认（不设置）',
  'group.credential': '凭据',
  'group.search': '检索',
  'group.advanced': '高级',
  'field.apiKey': '字面 API 密钥',
  'hint.apiKey': '直接写入配置文件的密钥；更推荐下面用凭据引用。',
  'field.apiKeyEnv': '凭据引用 / 环境变量',
  'hint.apiKeyEnv': '保存密钥的环境变量名，默认 TAVILY_API_KEY。',
  'field.searchDepth': '检索深度',
  'hint.searchDepth': 'basic 兼顾速度与质量；advanced 召回更全，但更慢也更贵。',
  'field.includeDomains': '限定域名',
  'hint.includeDomains': '逗号分隔，例如 a.com, b.com；留空则不限制来源。',
  'field.includeDomainsMode': '域名限定方式',
  'hint.includeDomainsMode': 'restrict 只检索这些域名；prefer 仅加权，仍检索全网。',
  'locked.includeDomainsMode': '需先填写「限定域名」后可用。',
  'field.excludeDomains': '排除域名',
  'hint.excludeDomains': '逗号分隔，例如 a.com, b.com。',
  'field.includePublishedDate': '返回发布日期',
  'hint.includePublishedDate': '结果附带发布日期，便于判断信息时效；Tavily 自身默认不返回。',
  'field.language': '结果语言',
  'hint.language': '语言代码，例如 zh、en；留空不限定。',
  'field.filterByLanguage': '严格按语言过滤',
  'hint.filterByLanguage': '丢弃其他语言的结果，比「结果语言」更严格。',
  'locked.filterByLanguage': '需先填写「结果语言」后可用。',
}

const en: Record<string, string> = {
  title: 'Tavily search',
  summary: 'Serves web search through Tavily; runs keyless until a key is configured.',
  credentialConfigured: 'Key configured',
  credentialUnset: 'No key configured, searches run keyless',
  save: 'Save',
  saving: 'Saving…',
  readOnly: 'This deployment stores settings read-only; edits are not written.',
  unavailable: 'The Host does not serve configuration for this plugin.',
  saveFailed: 'The Host refused this save; the drafts were kept.',
  overridden: 'Overridden',
  reset: 'Reset',
  invalidNumber: 'Enter a number',
  unsetOption: 'Default (not set)',
  'group.credential': 'Credentials',
  'group.search': 'Retrieval',
  'group.advanced': 'Advanced',
  'field.apiKey': 'Literal API key',
  'hint.apiKey': 'A key written into the configuration file; prefer the credential reference below.',
  'field.apiKeyEnv': 'Credential reference / environment variable',
  'hint.apiKeyEnv': 'Environment variable holding the key; defaults to TAVILY_API_KEY.',
  'field.searchDepth': 'Search depth',
  'hint.searchDepth': 'basic balances speed and quality; advanced recalls more but is slower and costs more.',
  'field.includeDomains': 'Include domains',
  'hint.includeDomains': 'Comma separated, e.g. a.com, b.com; blank leaves sources unrestricted.',
  'field.includeDomainsMode': 'Domain restriction mode',
  'hint.includeDomainsMode': 'restrict searches only those domains; prefer weights them but still searches the web.',
  'locked.includeDomainsMode': 'Set include domains first.',
  'field.excludeDomains': 'Exclude domains',
  'hint.excludeDomains': 'Comma separated, e.g. a.com, b.com.',
  'field.includePublishedDate': 'Return publication dates',
  'hint.includePublishedDate': 'Attach each result\'s publication date so freshness is visible; Tavily omits it by default.',
  'field.language': 'Result language',
  'hint.language': 'Language code, e.g. zh, en; blank leaves it open.',
  'field.filterByLanguage': 'Filter strictly by language',
  'hint.filterByLanguage': 'Drops results in other languages, stricter than result language.',
  'locked.filterByLanguage': 'Set result language first.',
}

/** Dictionaries registered under {@link NS}. */
export const dictionaries: Record<string, Record<string, string>> = { zh, en }
