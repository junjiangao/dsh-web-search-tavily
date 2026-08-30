# @deepseek-ai/dsh-web-search-tavily

English | [中文](README.zh.md)

A [Tavily](https://tavily.com)-backed `WebSearchProvider` for the DeepSeek Harness [web capability seam](https://github.com/deepseek-ai/deepseek-harness) (`ctx.web`), modeled on the `packages/web/web-search-*` family. It registers a provider into `ctx.web` — it does not own `ctx.web` and does not register a model-facing tool (that is `@deepseek-ai/dsh-tool-web`).

Highlights:

- **Keyless mode** — with no API key anywhere (config, settings, credentials, environment), requests run in Tavily's keyless mode: no `Authorization`, `x-tavily-access-mode: keyless`, and the `dsh-web-search-tavily-keyless` client source.
- **Full official search surface** — every Tavily search parameter is configurable: depth, topic, time range, dates, days, result count, include/exclude domains, answer, raw content, images, favicon, usage, auto parameters, exact match, language, country, and chunks per source.
- **Settings UI + credentials** — a `dsh-settings` section (editable from the web settings page) plus `dsh-credentials` resolution; the key can also come from a literal `apiKey` or the environment.
- **Standard bundle** — declares `dsh.bundle`, installable with `dsh plugin add`.

## Install

This package is distributed as a GitHub repository (not published to npm). Install it into a profile with `dsh plugin`, which forwards to pnpm:

```sh
# GitHub spec — main branch
dsh plugin --profile <name> add github:junjiangao/dsh-web-search-tavily

# pin a commit when you need reproducibility (a later push cannot change it)
# dsh plugin --profile <name> add github:junjiangao/dsh-web-search-tavily#<sha>

# or a local checkout
dsh plugin --profile <name> add /path/to/dsh-web-search-tavily

# or a packed tarball (no build permission needed)
pnpm pack
dsh plugin --profile <name> add ./dsh-web-search-tavily-0.1.0.tgz
```

Built `lib/` artifacts are committed to the repository, and the package declares no lifecycle scripts, so a git install needs **no build permission** — pnpm never asks for an `allowBuilds` entry. When you develop the plugin, rebuild with `pnpm build` and commit the updated `lib/` together with the source change. (A source-only revision without `lib/` would need the pnpm `allowBuilds` step; prefer the main-branch flow above.)

## Activate tavily as the search provider

Registering the provider is not the same as selecting it. The `web` seam picks a provider by id:

- `searchProvider` on the `web` plugin row, or
- `DSH_WEB_SEARCH_PROVIDER` (only read when the `web` row carries no `searchProvider` — `dsh-base` currently sets `searchProvider: deepseek-official`, so the environment variable alone has no effect).

With several search providers installed, pin tavily in the **profile's** `cordis.patch.yml` (a later layer than every bundle):

```yaml
- id: web
  config:
    searchProvider: tavily   # restate every other key the web row carries
```

This bundle deliberately only inserts its own plugin row and never overrides the `web` row: a patch row replaces the whole row config instead of deep-merging, and multiple provider bundles must not fight over it.

## Config

All fields optional except where the schema default is noted. The same schema powers the settings section.

| Key | Default | Meaning |
|---|---|---|
| `apiKey` | (none) | Literal Tavily API key. Prefer `apiKeyEnv`/credentials so no secret enters configuration files; a stored literal is redacted from settings descriptions. |
| `apiKeyEnv` | `TAVILY_API_KEY` | Credential reference / environment variable carrying the key. |
| `baseURL` | `https://api.tavily.com` | Endpoint base; `/search` is appended. `TAVILY_BASE_URL` environment fallback. |
| `searchDepth` | `basic` | `ultra-fast` | `fast` | `basic` | `advanced`. |
| `topic` | (none) | `general` | `news` | `finance`. |
| `timeRange` | (none) | `day` | `week` | `month` | `year`. |
| `startDate` / `endDate` | (none) | Absolute dates (`YYYY-MM-DD`) sent as `start_date` / `end_date`. |
| `days` | (none) | Day window sent as `days`. Positive integer. |
| `maxResults` | (none) | Default result count when a request carries no `maxResults`; clamped to Tavily's 20. |
| `includeDomains` / `excludeDomains` | `[]` | Domain lists sent as `include_domains` / `exclude_domains`; empty lists are omitted. |
| `includeAnswer` | `false` | `true` | `basic` | `advanced`; sent as `include_answer` (omitted when `false`). Maps to result `content`. |
| `includeRawContent` | `false` | `true` | `markdown` | `text`; sent as `include_raw_content` (omitted when `false`). Used as snippet fallback. |
| `includeImages` | `false` | Sent as `include_images`; image results are not surfaced by the seam (deferred). |
| `includeImageDescriptions` | `false` | Sent as `include_image_descriptions`. |
| `includeFavicon` | `false` | Sent as `include_favicon`; not surfaced (deferred). |
| `includeUsage` | `false` | Sent as `include_usage`; not surfaced (deferred). |
| `autoParameters` | `false` | Sent as `auto_parameters`. |
| `exactMatch` | `false` | Sent as `exact_match`. |
| `language` | (none) | Sent as `language`. |
| `filterByLanguage` | `false` | Sent as `filter_by_language`. |
| `country` | (none) | Sent as `country`. |
| `chunksPerSource` | (none) | Sent as `chunks_per_source`. Positive integer. |

Key resolution order: literal `apiKey` → `dsh-credentials` (`apiKeyEnv` ref) → environment (`apiKeyEnv`, default `TAVILY_API_KEY`) → **keyless**.

```yaml
# With key (env)
- id: web-search-tavily
  name: '@deepseek-ai/dsh-web-search-tavily'
  config:
    apiKeyEnv: TAVILY_API_KEY

# With key (literal — prefer credentials/env)
- id: web-search-tavily
  name: '@deepseek-ai/dsh-web-search-tavily'
  config:
    apiKey: !!js process.env.TAVILY_API_KEY

# Keyless — no key anywhere, the provider falls back to keyless mode
- id: web-search-tavily
  name: '@deepseek-ai/dsh-web-search-tavily'
```

## Keyless mode

When every key source is empty, requests carry no `Authorization`, send `x-tavily-access-mode: keyless`, and use the `dsh-web-search-tavily-keyless` client source — the same convention as the official Tavily SDK. Keyless mode is a legitimate provider state, not a configuration error. Tavily's server rate-limits keyless use and may ignore or downgrade some parameters (result count, depth, answer). Only `search` (and `extract`) exist in keyless mode; this provider only ever calls `/search`.

## Settings UI and credentials

`WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = settingsNamespace('web-search-tavily')` installs the configuration as a settings section, so the web settings page can edit every field above and changes apply to the next search without re-registration. The recommended key path is the credentials service (written from the web Models/settings page) under the `apiKeyEnv` reference. A literal `apiKey` stored in settings is supported but persists in the settings document — prefer credentials or the environment.

### Client settings card

The package also ships a client face (`dsh.client` declaration + `exports["./client"]`, built as `lib/client.js`): it registers a `web-search-tavily` card into the settings page's "Plugins → Plugin configuration" tab covering the common fields (API key, key env var, endpoint, result count, search depth, topic, and the answer/images/raw content/favicon/usage toggles). The card binds the same settings namespace; other fields save straight into the settings document, while **the API key goes through the credentials domain** (`remote.credentials`, the same face the official web-search card uses) and never lands in the settings file. The card honors the credentials remote's wire contract exactly — positional arguments (`credentials.describe([ref])`, `credentials.set(ref, value)`) answered with the `{ ok, value | error }` RemoteResult envelope; `@deepseek-ai/dsh-client-ui-primitives` is declared as a bundle external for the native chevron. Restart the web service after install so the client-modules graph picks the package up (it scans loader entries at startup).

Card features:

- **Native card chrome**: the disclosure header, body, and footer mirror the official `PluginCard` 1:1 — the native 14px primitives chevron, official spacing/typography/colors under a `tavily-` scoped stylesheet, the read-only notice when the document is not writable, and auto-collapse once the Host confirms a save. Closed by default; the whole header row (title + description + chevron) toggles it, with an unsaved badge while drafts exist.
- **Recommended configuration**: the "Apply recommended settings" button stages the **Tavily official defaults** (`apiKeyEnv: TAVILY_API_KEY`, `searchDepth: basic`, `maxResults: 5`, `includeAnswer/includeImages/includeRawContent/includeFavicon/includeUsage: false`) — deliberately not aggressive values, because **keyless mode (no key) rate-limits and may ignore or downgrade result count, depth, and answer parameters**; official defaults behave identically with and without a key. Staged only; review then save.
- **Auto-detected key state**: like the official `web-search-deepseek` card, the card asks the credentials domain via `credentials.describe` — an exported `TAVILY_API_KEY`, a credential-store record, or a stored literal all report as "configured" with **no manual setup**. Only when every source is empty does the keyless notice appear (rate limiting and parameter downgrade).
- **Field hints**: every field carries a hint that flags token impact (`includeRawContent` significantly raises tokens/cost, `includeAnswer` adds output tokens, `maxResults` scales with count, `searchDepth: advanced` is slower and costlier).

## Mapping

- `answer` (when `includeAnswer` is enabled) → `content`.
- Each result → `WebSearchSource`: `url`, `title`, `publishedAt` ← `published_date`, and `snippet` preferring `content` with `raw_content` as fallback. Blank fields are omitted; URL-less results are dropped.
- `max_results` is clamped to 20 (Tavily's documented bound); the seam still enforces the final `maxResults` truncation (`truncated`).

## Model Experience

Indirectly, through `dsh-tool-web`: the model sees the `maxResults`-bounded URLs, titles, snippets, and publication dates, plus the generated answer when `includeAnswer` is enabled. Provider failures surface as `WebError` `WEB_PROVIDER_ERROR` (message from the Tavily error body, including the keyless-limit envelope); cancellation surfaces as `WEB_ABORTED`. Credential-bearing requests reject redirects before the `Location` target is contacted.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Development

```sh
pnpm install
pnpm build        # tsc → lib/; commit lib/ together with source changes
pnpm test         # vitest unit suite
pnpm test:coverage  # per-file 100% gate on src/
pnpm test:e2e     # real-API smoke; self-skips without $TAVILY_API_KEY
```

Unlike harness in-repo packages (which extend `tsconfig.base.json` and build `lib/types` + bundled `lib/index.js`), this standalone package builds with a single `tsc` pass into `lib/`. The published API is unchanged. To vendor it into `deepseek-harness/packages/web/web-search-tavily`, switch the peer/dev dependencies to `workspace:^` and adjust the tsconfig to the harness layout.

## Known Limitations and Deferred Work

- **Only `search` is implemented** — no Tavily `extract`/crawl/map/research; keyless mode only permits search/extract anyway.
- **Keyless is server-rate-limited** and may downgrade parameters; the plugin makes no local assumptions.
- **`includeImages` / `includeImageDescriptions` / `includeFavicon` / `includeUsage`** pass through to the API but the seam has no surface for images/usage/favicons yet.
- **Selection stays user-owned**: installing this bundle registers the provider; pinning `searchProvider: tavily` is a profile-layer decision (see above).
- **Abort classification is signal-based**: a fetch abort or an already-aborted signal maps to `WEB_ABORTED`.

## License

MIT
