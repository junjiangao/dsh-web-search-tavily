# @junjiangao/dsh-web-search-tavily

[English](README.md) | 中文

由 [Tavily](https://tavily.com) 支持的 `WebSearchProvider`，用于 DeepSeek Harness 的 [web 能力 seam](https://github.com/deepseek-ai/deepseek-harness)（`ctx.web`），实现参考 `packages/web/web-search-*` 家族。它向 `ctx.web` 注册提供方——不拥有 `ctx.web`，也不注册面向模型的工具（后者属于 `@deepseek-ai/dsh-tool-web`）。

亮点：

- **Keyless 模式**——config、设置、凭据、环境变量均无 key 时，请求进入 Tavily keyless 模式：不带 `Authorization`、携带 `x-tavily-access-mode: keyless`、client-source 为 `dsh-web-search-tavily-keyless`。
- **只暴露能提升检索质量的参数**——设置页只渲染 9 个字段：凭据（`apiKey`、`apiKeyEnv`）、检索深度、限定/排除域名与限定方式、发布日期、结果语言与严格语言过滤。其余 Tavily 参数（主题、时间窗、结果数、answer、raw content、国家、自动参数、精确匹配、安全搜索等）保持 Tavily 默认值、不进表单，但仍可通过 profile patch 覆盖。
- **分组且不会配出 400 的表单**——三段（凭据／检索／高级），只有「高级」默认折叠；依赖伴随值的控件（严格语言过滤、域名限定方式）在伴随值为空时锁定并说明原因。
- **原生配置表单**——插件在插件页注册配置卡片（`plugins.bundle.config`，位于 bundle 自己的页面，键为 profile 声明的 bundle 名），用 dsh 0.1.7 的共享设置表单承载上述精选字段；所有字段 `volatile()`，修改后下一次搜索即生效，无需重启。密钥走 `dsh-credentials`、字面量 `apiKey` 或环境变量。
- **标准 bundle**——声明 `dsh.bundle`，支持 `dsh plugin add` 安装。
- **要求 dsh 0.1.7+**——host 半持有 Loader 条目、其 schema 与搜索提供方；client 半是一个很小的 bundle，只负责注册条目的配置卡片。无 `settingsScope`、无 `settings.installSection` 接线。插件图标采用 harness 的 web-search 图形（`icon.svg`）。

## 安装

本包以 GitHub 仓库形式分发（暂不发布 npm）。用 `dsh plugin` 安装到 profile（内部转发 pnpm）：

```sh
# GitHub spec——main 分支
dsh plugin --profile <name> add github:junjiangao/dsh-web-search-tavily

# 需要可复现性时可 pin commit（后续推送不会改变安装内容）
# dsh plugin --profile <name> add github:junjiangao/dsh-web-search-tavily#<sha>

# 或本地目录
dsh plugin --profile <name> add /path/to/dsh-web-search-tavily

# 或打包 tarball（无需构建授权）
pnpm pack
dsh plugin --profile <name> add ./dsh-web-search-tavily-0.3.0.tgz
```

构建产物 `lib/` 已提交进仓库，且包内不声明任何生命周期脚本，因此 git 安装**无需构建授权**——pnpm 不会要求 `allowBuilds`。开发时请用 `pnpm build` 重新构建，并把更新后的 `lib/` 与源码改动一起提交。（不含 `lib/` 的纯源码版本才需要 `allowBuilds` 步骤；建议直接用上面的 main 分支流程。）

## 指定 tavily 为 search provider

注册提供方 ≠ 启用提供方。`web` seam 按 id 选择：

- `web` 插件行的 `searchProvider`，或
- `DSH_WEB_SEARCH_PROVIDER`（仅当 `web` 行未设置 `searchProvider` 时生效——`dsh-base` 目前固定 `searchProvider: deepseek-official`，所以只设环境变量无效）。

多个搜索插件并存时，在 **profile 的** `cordis.patch.yml`（晚于所有 bundle 层）固定 tavily：

```yaml
- id: web
  config:
    searchProvider: tavily   # web 行若还有其他键，必须一并重述
```

本 bundle 只 insert 自己的插件行，刻意不覆盖 `web` 行：patch 行是整行替换 config（不做深合并），多个 provider bundle 不应争抢该行。

## 配置

Host 的 `Config` schema 仍承载 Tavily 的完整参数面（profile patch 可覆盖任意一项），但**设置页只渲染能实际提升检索质量、且取值需要按部署决定的字段**。其余参数一律使用 Tavily 自身默认值，不出现在表单里。

### 设置页渲染的字段

表单按 **凭据 / 检索 / 高级** 三段渲染，其中「高级」默认折叠。缺少伴随值的控件会**锁定**并说明原因（提供方发送前也会丢弃该参数，避免 Tavily 的 400），因此不可能配出必然失败的组合。

| 分组 | 配置键 | 默认值 | 含义 |
|---|---|---|---|
| 凭据 | `apiKey` | （无） | Tavily API 密钥字面量。优先用 `apiKeyEnv`/凭据服务，避免密钥进配置文件；存入设置的字面量在设置描述中会被脱敏。 |
| 凭据 | `apiKeyEnv` | `TAVILY_API_KEY` | 携带密钥的凭据引用／环境变量名。必须匹配凭据语法（`^[A-Za-z_][A-Za-z0-9_]*$`）；不合语法的名字会让搜索以 `TAVILY_INVALID_CREDENTIAL_REF` 失败，而不是被静默读作“未配置密钥”。 |
| 检索 | `searchDepth` | `basic` | `ultra-fast` | `fast` | `basic` | `advanced`。精度/延迟/成本的主开关。 |
| 检索 | `includeDomains` | `[]` | 限定域名列表，发送为 `include_domains`；空列表不发送。 |
| 检索 | `excludeDomains` | `[]` | 排除域名列表，发送为 `exclude_domains`；空列表不发送。 |
| 检索 | `language` | （无） | 结果语言，发送为 `language`。 |
| 检索 | `filterByLanguage` | `false` | 严格按 `language` 过滤，发送为 `filter_by_language`。未填 `language` 时控件锁定，且该值被丢弃（否则 Tavily 返回 400）。 |
| 高级 | `includeDomainsMode` | （无） | `restrict`（只在这些域名内检索）或 `prefer`（仅加权）；发送为 `include_domains_mode`。未填限定域名时控件锁定，且该值被丢弃（否则 Tavily 返回 400）。 |
| 高级 | `includePublishedDate` | `true` | 发送为 `include_published_date`，让结果携带发布日期（映射为 `publishedAt`）。Tavily 自身默认 `false`，本插件默认开启以便模型判断时效；设为 `false` 即回到官方默认。 |

### 保持默认、不进表单的参数

| 配置键 | 默认值 | 不渲染的原因 |
|---|---|---|
| `baseURL` | `https://api.tavily.com` | 属基础设施而非检索质量；用 `TAVILY_BASE_URL` 环境变量或 patch 覆盖。 |
| `topic` | （无 → `general`） | 查询级意图；全局固定会把每次检索锁死到 news/finance。 |
| `timeRange` / `startDate` / `endDate` / `days` | （无） | 同上，属查询级时效窗。`days` 已不在现行 OpenAPI 中，但实测服务端仍生效。 |
| `filterByPublishedDate` | `false` | 会连带丢弃没有日期的结果。 |
| `maxResults` | （无） | `dsh-tool-web` 每次请求都会带 `maxResults`（默认 8），因此该默认值在现行部署下不生效。 |
| `includeAnswer` | `false` | 自带模型的 harness 会自行综合答案；Tavily 官方也建议自备模型时不要开启。 |
| `includeRawContent` | `false` | snippet 已优先取 `content`，`raw_content` 仅在 `content` 为空时回退，开与不开差别很小。 |
| `autoParameters` | `false` | 会自动挑参数（可能静默升到 `advanced`），与本插件的显式 `searchDepth` 冲突。 |
| `exactMatch` | `false` | 仅在查询里带引号短语时才有意义，属查询级。 |
| `country` | （无） | 只在 `topic=general` 下生效，且取值是国家枚举，误填即 400。 |
| `chunksPerSource` | （无 → Tavily 默认 3） | Tavily 的默认值 3 已是上限，暴露它只能把 snippet 调短。 |
| `safeSearch` | `false` | 内容安全策略而非检索质量；且 `fast`/`ultra-fast` 深度下 Tavily 会返回 400。 |

### 已移除的参数

`includeImages` / `includeImageDescriptions` / `includeFavicon` / `includeUsage` 已从 schema 与提供方中删除：seam 没有图片、favicon、用量展示面，`mapTavilyResult` 也不会消费它们，因此这些开关此前只是白白改变请求体。它们都是 Tavily 默认关闭的字段，删除后行为与默认值完全一致。

密钥解析顺序：字面量 `apiKey` → `dsh-credentials`（`apiKeyEnv` 引用）→ 环境变量（`apiKeyEnv`，默认 `TAVILY_API_KEY`）→ **keyless**。

```yaml
# 有 key（环境变量）
- id: web-search-tavily
  name: '@junjiangao/dsh-web-search-tavily'
  config:
    apiKeyEnv: TAVILY_API_KEY

# 有 key（字面量——优先凭据服务/环境变量）
- id: web-search-tavily
  name: '@junjiangao/dsh-web-search-tavily'
  config:
    apiKey: !!js process.env.TAVILY_API_KEY

# Keyless——任何来源都无 key 时自动降级
- id: web-search-tavily
  name: '@junjiangao/dsh-web-search-tavily'
```

## Keyless 模式

所有 key 来源为空时，请求不带 `Authorization`、携带 `x-tavily-access-mode: keyless`、client-source 为 `dsh-web-search-tavily-keyless`——与官方 SDK 约定一致。keyless 是合法状态而非配置错误。Tavily 服务端会对 keyless 限流，并可能忽略或降级部分参数（结果数、深度、answer）。keyless 仅支持 `search`（和 `extract`）；本插件只调用 `/search`。

## 设置表单与凭据

host 半持有 Loader 条目、其 `Config` schema 与搜索提供方；浏览器半是一个 client bundle（`lib/client.js`），它只把该条目的配置卡片注册进 dsh 为 bundle 自身配置预留的那一个位置：`plugins.bundle.config`，渲染在 bundle 自己页面的说明文字与组件列表之间，因此从插件页一次点击即可到达。它**刻意不认领**别的位置——不注册 `plugins.row.config`（那会在该行的配置入口后再加一个同一张表单的重复入口），也不注册 `plugins.item`（该位置列出的是官方 host 面设置页与官方 bundle，bundle 注册到那里的卡片无论清单里声明什么图标都只显示默认图形，因为该 slot 的图形映射表按四个内置条目 id（`shell`、`agent-loop`、`subagent`、`web-search`）索引）。键取 **profile 声明的 bundle 名**：插件页派发的就是声明名，若 profile 以别名安装本包（例如改名前的旧依赖键），声明名就与包名不同。因此 client 会读取插件管理器的 bundle 列表，找到「行加载 `@junjiangao/dsh-web-search-tavily`」的那一条，用它报告的声明名作为键；没有管理器应答时退回包名。每个字段都是 `volatile()`，提交后即就地更新提供方每次搜索读取的 `Volatile` 引用——无需重注册、无需重启。卡片只在 Host 提供 `web-search-tavily` 命名空间时注册，因此未安装该提供方的部署不会出现任何痕迹。`apiKey` 带 `role('secret')`（在所有设置通道上脱敏），`apiKeyEnv` 带 `role('credential-ref')`，与官方 `web-search-deepseek` 提供方的声明完全一致。

推荐把 key 存入凭据服务（web Models/设置页写入），引用名为 `apiKeyEnv`。表单中存字面量 `apiKey` 虽被支持但会落盘——优先凭据服务或环境变量。

卡片还会向凭据域查询 `apiKeyEnv` 当前指向的引用，并把结果以状态标签 + 引用名的形式显示在凭据段里（「密钥已配置 TAVILY_API_KEY」／「密钥未配置，将使用无密钥模式 TAVILY_API_KEY」）——这样在发起搜索之前就能知道它是否会带凭据。这次查询是**软依赖**（`ctx.inject`）：`remote.credentials` 是异步挂载的命名空间，在 `apply` 阶段直接读取会与之竞争。只有拿到答案才发布状态——查询被拒绝或失败时不显示这一行，而不是声称“未配置密钥”；完全未挂载该命名空间的部署也照常渲染表单。

shell 通过冻结模块表共享**组件**，但不共享它的 CSS module，所以卡片自带一份样式（`<style id="dsh-web-search-tavily-styles">`，由 `installTavilyStyles()` 幂等注入一次），只用 `--dsw-alias-*` token，并复刻 shell 自身设置页的行距、0.5px 分隔线与枚举下拉样式；布尔字段用 shell 的 `Switch`，徽章用 `Tag`。除选择框的 chevron（data-URI SVG 无法解析 CSS 变量）外，样式表内没有硬编码颜色。

插件图标采用 harness 的 web-search 图形：`package.json` 声明 `"icon": "./icon.svg"`，与内置 `web-search` 图形的位置和形状一致。该 SVG 用线性渐变近似内置的 conic-gradient 圆环——内置实现用 `foreignObject` 绘制圆环，而清单图标以 `<img>` 渲染，`foreignObject` 在其中为空。

插件页读取本插件的显示文案来自 `locale/en.json`（Host 首先解析的锚点）以及同目录下的每种语言一个文件，各自携带 `meta.title` 与 `meta.description`。这些文件是**通过包说明符**解析的，因此 `exports` 里要有 `"./locale/*.json"`、`files` 里要有 `locale/*.json`；一个没有导出的 locale 文件对插件页等于不存在。缺失时回退到未翻译的 `package.json` `name` 与 `description`。插件自己卡片里的文案则来自 client 词典（`client-src/locales.ts`），新增文案时两处都要写。

## 映射

- `answer`（启用 `includeAnswer` 时）→ `content`。
- 每条结果 → `WebSearchSource`：`url`、`title`、`publishedAt` ← `published_date`、`snippet` 优先 `content`、空时回退 `raw_content`。空字段省略；无 URL 的结果丢弃。
- `published_date` 归一化为 **ISO-8601**：Tavily 返回的是 RFC-1123（`Thu, 20 Aug 2026 00:00:00 GMT`），而 seam 文档承诺 ISO-8601，直接透传会让按文档解析该字段的消费方失败。无法解析的值被丢弃而不是以错误格式透传。
- `max_results` 钳制到 20（Tavily 文档上限）；最终 `maxResults` 截断仍由 seam 执行（`truncated`）。

## 模型体验

经 `dsh-tool-web` 间接影响：模型看到经 `maxResults` 限制的 URL、标题、snippet、发布日期，以及启用 `includeAnswer` 时的生成答案。提供方失败以 `WebError` `WEB_PROVIDER_ERROR` 呈现（消息取 Tavily 错误体，含 keyless 限流信封）；取消以 `WEB_ABORTED` 呈现；`apiKeyEnv` 不合凭据语法时以 `TAVILY_INVALID_CREDENTIAL_REF` 呈现，消息里点名该设置及其取值。携带凭据的请求在接触 `Location` 目标前拒绝重定向。

#### KV Cache 影响

不会直接导致 KV Cache 失效；请求前缀变更由上述消费方负责。

## 开发

```sh
pnpm install
pnpm build        # tsc → lib/；lib/ 需随源码改动一起提交
pnpm test         # vitest 单元测试
pnpm test:coverage  # src 逐文件 100% 门禁
pnpm test:e2e     # 真实 API smoke；无 $TAVILY_API_KEY 时自跳过
```

与 harness 仓库内包（继承 `tsconfig.base.json`、产出 `lib/types` + 打包的 `lib/index.js`）不同，本独立仓库用单次 `tsc` 产出 `lib/`，公开 API 不变。若要放入 `deepseek-harness/packages/web/web-search-tavily`，把 peer/dev 依赖改为 `workspace:^` 并按 harness 布局调整 tsconfig。

client 半是按**真实**的已发布 client 包做类型检查的——`react`、`@types/react`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-primitives` 是仅开发期的依赖，版本对齐 shell 实际发布的那一版。它们不会进入 bundle（`lib/client.js` 把它们保持为 external，运行时由 shell 的冻结模块表提供），但 `pnpm typecheck` 现在会在属性名、可选性或导出发生漂移时失败，而不是由手写声明悄悄接受。单元测试仍然跑本地 stub（`tests/stubs/`，在 `vitest.config.ts` 里 alias），因为它们需要的是可断言元素树，而不是浏览器。

## 已知限制与暂缓事项

- **仅实现 `search`**——未实现 Tavily `extract`/crawl/map/research；keyless 本来也只允许 search/extract。
- **keyless 受服务端限流**，参数可能被降级；插件不做本地假设。
- **已移除 `includeImages` / `includeImageDescriptions` / `includeFavicon` / `includeUsage`**——seam 无对应展示面，此前只是改变请求体；升级后旧 patch 若仍设置这些键，会被 schema 忽略/拒绝，请一并删除。
- **必然 400 的组合已在提供方侧兜底**——`include_domains_mode` 无 `include_domains`、`filter_by_language` 无 `language` 时，对应参数被丢弃（实测 Tavily 分别返回 400）。
- **`safe_search` 与 `fast`/`ultra-fast` 互斥**——该组合由 Tavily 返回 400（`Safe search parameter is not supported for fast or ultra-fast search_depth.`），插件不拦截，错误消息原样呈现。
- **选择归用户所有**：安装本 bundle 只注册提供方；固定 `searchProvider: tavily` 是 profile 层的决定（见上文）。
- **中止按 signal 分类**：fetch 中止或已中止的 signal 映射为 `WEB_ABORTED`。
- **只有一个入口：bundle 自己的页面**——`plugins.bundle.config`，键取 **profile 声明的 bundle 名**，client 从插件管理器的 bundle 列表解析它，因此「依赖键是改名前旧名」的别名安装也能对上；只用包名做键会什么都不渲染。刻意不注册 `plugins.row.config`，该行因此没有自己的配置入口；也不注册 `plugins.item`，否则会给 Official 分组加一张默认图形的卡片。
- **本 bundle 里名为 `ref` 的 prop 是陷阱**：React 独占每个元素上的 `ref`，字符串值根本到不了函数组件，而是抛 error #290；shell 记为 `slot entry crashed` 并什么都不渲染。`jsx-runtime` 测试替身现在复现了这条规则，因此测试会先失败。

## 许可证

MIT
