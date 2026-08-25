# @deepseek-ai/dsh-web-search-tavily

[English](README.md) | 中文

由 [Tavily](https://tavily.com) 支持的 `WebSearchProvider`，用于 DeepSeek Harness 的 [web 能力 seam](https://github.com/deepseek-ai/deepseek-harness)（`ctx.web`），实现参考 `packages/web/web-search-*` 家族。它向 `ctx.web` 注册提供方——不拥有 `ctx.web`，也不注册面向模型的工具（后者属于 `@deepseek-ai/dsh-tool-web`）。

亮点：

- **Keyless 模式**——config、设置、凭据、环境变量均无 key 时，请求进入 Tavily keyless 模式：不带 `Authorization`、携带 `x-tavily-access-mode: keyless`、client-source 为 `dsh-web-search-tavily-keyless`。
- **官方搜索参数全量**——深度、主题、时间范围、日期、天数、结果数、include/exclude 域名、answer、raw content、图片、favicon、用量、自动参数、精确匹配、语言、国家、每源 chunk 数均可配置。
- **设置界面 + 凭据**——`dsh-settings` 设置段（web 设置页可编辑）+ `dsh-credentials` 密钥解析；key 也可来自字面量 `apiKey` 或环境变量。
- **标准 bundle**——声明 `dsh.bundle`，支持 `dsh plugin add` 安装。

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
dsh plugin --profile <name> add ./dsh-web-search-tavily-0.1.0.tgz
```

git 安装拿到的是源码，因此包内提供 `prepare` 脚本在安装时构建 `lib/`。pnpm ≥ 10 默认禁止执行 git 依赖的 `prepare`：把 pnpm 打印的包键加入 profile 的 `pnpm-workspace.yaml` 的 `allowBuilds` 后重试。只放行你信任的源码——这意味着允许该包代码在安装时于本机执行。

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

除标注 schema 默认值的字段外均可选。同一 schema 即设置界面字段。

| 配置键 | 默认值 | 含义 |
|---|---|---|
| `apiKey` | （无） | Tavily API 密钥字面量。优先用 `apiKeyEnv`/凭据服务，避免密钥进配置文件；存入设置的字面量在设置描述中会被脱敏。 |
| `apiKeyEnv` | `TAVILY_API_KEY` | 携带密钥的凭据引用／环境变量名。 |
| `baseURL` | `https://api.tavily.com` | 端点基址；追加 `/search`。支持 `TAVILY_BASE_URL` 环境变量回退。 |
| `searchDepth` | `basic` | `ultra-fast` | `fast` | `basic` | `advanced`。 |
| `topic` | （无） | `general` | `news` | `finance`。 |
| `timeRange` | （无） | `day` | `week` | `month` | `year`。 |
| `startDate` / `endDate` | （无） | 绝对日期（`YYYY-MM-DD`），发送为 `start_date` / `end_date`。 |
| `days` | （无） | 天数窗口，发送为 `days`。正整数。 |
| `maxResults` | （无） | 请求未带 `maxResults` 时的默认结果数；钳制到 Tavily 上限 20。 |
| `includeDomains` / `excludeDomains` | `[]` | 域名列表，发送为 `include_domains` / `exclude_domains`；空列表不发送。 |
| `includeAnswer` | `false` | `true` | `basic` | `advanced`；发送为 `include_answer`（为 `false` 时省略）。映射为结果 `content`。 |
| `includeRawContent` | `false` | `true` | `markdown` | `text`；发送为 `include_raw_content`（为 `false` 时省略）。作为 snippet 回退。 |
| `includeImages` | `false` | 发送为 `include_images`；seam 暂不展示图片结果（暂缓）。 |
| `includeImageDescriptions` | `false` | 发送为 `include_image_descriptions`。 |
| `includeFavicon` | `false` | 发送为 `include_favicon`；暂不展示（暂缓）。 |
| `includeUsage` | `false` | 发送为 `include_usage`；暂不展示（暂缓）。 |
| `autoParameters` | `false` | 发送为 `auto_parameters`。 |
| `exactMatch` | `false` | 发送为 `exact_match`。 |
| `language` | （无） | 发送为 `language`。 |
| `filterByLanguage` | `false` | 发送为 `filter_by_language`。 |
| `country` | （无） | 发送为 `country`。 |
| `chunksPerSource` | （无） | 发送为 `chunks_per_source`。正整数。 |

密钥解析顺序：字面量 `apiKey` → `dsh-credentials`（`apiKeyEnv` 引用）→ 环境变量（`apiKeyEnv`，默认 `TAVILY_API_KEY`）→ **keyless**。

```yaml
# 有 key（环境变量）
- id: web-search-tavily
  name: '@deepseek-ai/dsh-web-search-tavily'
  config:
    apiKeyEnv: TAVILY_API_KEY

# 有 key（字面量——优先凭据服务/环境变量）
- id: web-search-tavily
  name: '@deepseek-ai/dsh-web-search-tavily'
  config:
    apiKey: !!js process.env.TAVILY_API_KEY

# Keyless——任何来源都无 key 时自动降级
- id: web-search-tavily
  name: '@deepseek-ai/dsh-web-search-tavily'
```

## Keyless 模式

所有 key 来源为空时，请求不带 `Authorization`、携带 `x-tavily-access-mode: keyless`、client-source 为 `dsh-web-search-tavily-keyless`——与官方 SDK 约定一致。keyless 是合法状态而非配置错误。Tavily 服务端会对 keyless 限流，并可能忽略或降级部分参数（结果数、深度、answer）。keyless 仅支持 `search`（和 `extract`）；本插件只调用 `/search`。

## 设置界面与凭据

`WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = settingsNamespace('web-search-tavily')` 把配置注册为设置段：web 设置页可编辑上表全部字段，修改后下一次搜索即生效，无需重注册。推荐把 key 存入凭据服务（web Models/设置页写入），引用名为 `apiKeyEnv`。设置文档中存字面量 `apiKey` 虽被支持但会落盘——优先凭据服务或环境变量。

## 映射

- `answer`（启用 `includeAnswer` 时）→ `content`。
- 每条结果 → `WebSearchSource`：`url`、`title`、`publishedAt` ← `published_date`、`snippet` 优先 `content`、空时回退 `raw_content`。空字段省略；无 URL 的结果丢弃。
- `max_results` 钳制到 20（Tavily 文档上限）；最终 `maxResults` 截断仍由 seam 执行（`truncated`）。

## 模型体验

经 `dsh-tool-web` 间接影响：模型看到经 `maxResults` 限制的 URL、标题、snippet、发布日期，以及启用 `includeAnswer` 时的生成答案。提供方失败以 `WebError` `WEB_PROVIDER_ERROR` 呈现（消息取 Tavily 错误体，含 keyless 限流信封）；取消以 `WEB_ABORTED` 呈现。携带凭据的请求在接触 `Location` 目标前拒绝重定向。

#### KV Cache 影响

不会直接导致 KV Cache 失效；请求前缀变更由上述消费方负责。

## 开发

```sh
pnpm install
pnpm build        # tsc → lib/（git 安装时由 prepare 执行）
pnpm test         # vitest 单元测试
pnpm test:coverage  # src 逐文件 100% 门禁
pnpm test:e2e     # 真实 API smoke；无 $TAVILY_API_KEY 时自跳过
```

与 harness 仓库内包（继承 `tsconfig.base.json`、产出 `lib/types` + 打包的 `lib/index.js`）不同，本独立仓库用单次 `tsc` 产出 `lib/`，公开 API 不变。若要放入 `deepseek-harness/packages/web/web-search-tavily`，把 peer/dev 依赖改为 `workspace:^` 并按 harness 布局调整 tsconfig。

## 已知限制与暂缓事项

- **仅实现 `search`**——未实现 Tavily `extract`/crawl/map/research；keyless 本来也只允许 search/extract。
- **keyless 受服务端限流**，参数可能被降级；插件不做本地假设。
- **`includeImages` / `includeImageDescriptions` / `includeFavicon` / `includeUsage`** 会透传请求，但 seam 暂无图片/用量/favicon 展示面。
- **选择归用户所有**：安装本 bundle 只注册提供方；固定 `searchProvider: tavily` 是 profile 层的决定（见上文）。
- **中止按 signal 分类**：fetch 中止或已中止的 signal 映射为 `WEB_ABORTED`。

## 许可证

MIT
