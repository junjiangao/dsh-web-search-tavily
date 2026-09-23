# @junjiangao/dsh-web-search-tavily

English | [中文](README.zh.md)

A [Tavily](https://tavily.com)-backed `WebSearchProvider` for the DeepSeek Harness [web capability seam](https://github.com/deepseek-ai/deepseek-harness) (`ctx.web`), modeled on the `packages/web/web-search-*` family. It registers a provider into `ctx.web` — it does not own `ctx.web` and does not register a model-facing tool (that is `@deepseek-ai/dsh-tool-web`).

Highlights:

- **Keyless mode** — with no API key anywhere (config, settings, credentials, environment), requests run in Tavily's keyless mode: no `Authorization`, `x-tavily-access-mode: keyless`, and the `dsh-web-search-tavily-keyless` client source.
- **Only the parameters that improve retrieval** — the settings page renders 9 fields: credentials (`apiKey`, `apiKeyEnv`), search depth, include/exclude domains with the domain mode, publication dates, and result language with strict language filtering. Every other Tavily parameter (topic, time windows, result count, answer, raw content, country, auto parameters, exact match, safe search, …) keeps Tavily's own default, stays out of the form, and remains overridable through a profile patch.
- **A grouped form that cannot be configured into a 400** — three sections (credentials / retrieval / advanced), only the advanced one folded, and dependency-driven controls (strict language filtering, domain mode) that lock with an explanation while their companion value is empty.
- **Native configuration form** — the plugin registers a configuration card on the Plugins page (`plugins.row.config`, keyed `@junjiangao/dsh-web-search-tavily#web-search-tavily`) that stages those curated fields through dsh 0.1.7's shared settings form; each field is `volatile()`, so an edit reaches the next search without a restart. The key resolves through `dsh-credentials`, a literal `apiKey`, or the environment.
- **Standard bundle** — declares `dsh.bundle`, installable with `dsh plugin add`.
- **dsh 0.1.7+** — the host half owns the Loader entry, its schema, and the search provider; the client half is one small bundle that registers the entry's configuration card. No `settingsScope` and no `settings.installSection` wiring. The plugin icon is the harness web-search glyph (`icon.svg`).

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
dsh plugin --profile <name> add ./dsh-web-search-tavily-0.3.0.tgz
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

The Host `Config` schema still carries Tavily's full parameter surface (a profile patch can override any of it), but **the settings page renders only the fields whose value a deployment can meaningfully choose and whose change improves retrieval quality**. Every other parameter keeps Tavily's own default and never appears in the form.

### Fields the settings page renders

The form draws three sections — **credentials / retrieval / advanced** — and only the advanced one starts folded. A control whose companion value is missing renders **locked** and says why (the provider drops that parameter before sending too, so Tavily's 400 is unreachable from here), which makes a combination that must fail impossible to configure.

| Section | Key | Default | Meaning |
|---|---|---|---|
| Credentials | `apiKey` | (none) | Literal Tavily API key. Prefer `apiKeyEnv`/credentials so no secret enters configuration files; a stored literal is redacted from settings descriptions. |
| Credentials | `apiKeyEnv` | `TAVILY_API_KEY` | Credential reference / environment variable carrying the key. Must match the credential grammar (`^[A-Za-z_][A-Za-z0-9_]*$`); a name outside it fails the search with `TAVILY_INVALID_CREDENTIAL_REF` instead of silently reading as "no key". |
| Retrieval | `searchDepth` | `basic` | `ultra-fast` | `fast` | `basic` | `advanced`. The main precision/latency/cost switch. |
| Retrieval | `includeDomains` | `[]` | Domain list sent as `include_domains`; an empty list is omitted. |
| Retrieval | `excludeDomains` | `[]` | Domain list sent as `exclude_domains`; an empty list is omitted. |
| Retrieval | `language` | (none) | Result language, sent as `language`. |
| Retrieval | `filterByLanguage` | `false` | Filter strictly to `language`, sent as `filter_by_language`. Locked, and dropped, while no `language` is set — which Tavily answers with a 400. |
| Advanced | `includeDomainsMode` | (none) | `restrict` (search only those domains) or `prefer` (weight them, still search the web); sent as `include_domains_mode`. Locked, and dropped, while no domains are set — which Tavily answers with a 400. |
| Advanced | `includePublishedDate` | `true` | Sent as `include_published_date` so each result carries its publication date (mapped to `publishedAt`). Tavily's own default is `false`; this plugin enables it so the model can weigh freshness. Set it to `false` for the official default. |

### Parameters left at their default, out of the form

| Key | Default | Why it is not rendered |
|---|---|---|
| `baseURL` | `https://api.tavily.com` | Infrastructure, not retrieval quality; override with `TAVILY_BASE_URL` or a patch. |
| `topic` | (none → `general`) | Query-level intent; pinning it globally locks every search to news/finance. |
| `timeRange` / `startDate` / `endDate` / `days` | (none) | Same: query-level recency windows. `days` is gone from the current OpenAPI but the endpoint still honors it. |
| `filterByPublishedDate` | `false` | Also drops every result with no detectable date. |
| `maxResults` | (none) | `dsh-tool-web` sends `maxResults` on every request (8 by default), so this default never applies in the shipped deployment. |
| `includeAnswer` | `false` | A harness with its own model synthesizes its own answer; Tavily recommends against it when you bring your own model. |
| `includeRawContent` | `false` | The snippet already prefers `content` and only falls back to `raw_content` when it is blank, so the switch changes little. |
| `autoParameters` | `false` | Auto-selects parameters (possibly `advanced` silently), which fights the explicit `searchDepth`. |
| `exactMatch` | `false` | Only meaningful when the query carries quoted phrases — query-level. |
| `country` | (none) | Honored only with `topic=general`, and it takes a country enum, so a typo is a 400. |
| `chunksPerSource` | (none → Tavily's 3) | Tavily's default of 3 is already the maximum, so exposing it could only shorten the snippet. |
| `safeSearch` | `false` | A content-safety policy rather than retrieval quality; Tavily also rejects it for the `fast`/`ultra-fast` depths. |

### Removed parameters

`includeImages` / `includeImageDescriptions` / `includeFavicon` / `includeUsage` are gone from both the schema and the provider: the seam has no surface for images, favicons, or usage, and `mapTavilyResult` never consumed them, so the switches only changed the request body. All four default to off in Tavily, so removing them is behavior-identical to their defaults.

Key resolution order: literal `apiKey` → `dsh-credentials` (`apiKeyEnv` ref) → environment (`apiKeyEnv`, default `TAVILY_API_KEY`) → **keyless**.

```yaml
# With key (env)
- id: web-search-tavily
  name: '@junjiangao/dsh-web-search-tavily'
  config:
    apiKeyEnv: TAVILY_API_KEY

# With key (literal — prefer credentials/env)
- id: web-search-tavily
  name: '@junjiangao/dsh-web-search-tavily'
  config:
    apiKey: !!js process.env.TAVILY_API_KEY

# Keyless — no key anywhere, the provider falls back to keyless mode
- id: web-search-tavily
  name: '@junjiangao/dsh-web-search-tavily'
```

## Keyless mode

When every key source is empty, requests carry no `Authorization`, send `x-tavily-access-mode: keyless`, and use the `dsh-web-search-tavily-keyless` client source — the same convention as the official Tavily SDK. Keyless mode is a legitimate provider state, not a configuration error. Tavily's server rate-limits keyless use and may ignore or downgrade some parameters (result count, depth, answer). Only `search` (and `extract`) exist in keyless mode; this provider only ever calls `/search`.

## Settings form and credentials

The host half owns the Loader entry, its `Config` schema, and the search provider; the browser half is a single client bundle (`lib/client.js`) that registers the entry's configuration card into the `plugins.row.config` surface of the Plugins page — the configure control on the row this bundle's patch inserts, keyed `<package>#<row id>` (`@junjiangao/dsh-web-search-tavily#web-search-tavily`), which is where dsh documents a bundle's own configuration. That one registration serves both views the row's detail page renders: `summary` is its one-liner, `page` is the form. It deliberately registers nothing into `plugins.item`: those cards take their artwork from a map keyed to the four shipped item ids (`shell`, `agent-loop`, `subagent`, `web-search`), so a card registered by any other plugin renders the default glyph no matter what its manifest declares, while the row and bundle surfaces render the manifest `icon`. One entry point showing this plugin's own icon beats two showing the same form under two different artworks. Every field is `volatile()`, so a committed edit updates the `Volatile` refs the provider reads per search — no re-registration and no restart. The card registers only while the Host serves the `web-search-tavily` namespace, so a deployment without the provider shows no trace of it. `apiKey` carries `role('secret')` (redacted on every settings wire) and `apiKeyEnv` carries `role('credential-ref')`, the same declarations the official `web-search-deepseek` provider uses.

The recommended key path is the credentials service (written from the web Models/settings page) under the `apiKeyEnv` reference. A literal `apiKey` stored in the form is supported but persists in the settings document — prefer credentials or the environment.

The card also asks the credentials domain about the reference `apiKeyEnv` currently names and states the answer in the credentials section as a status tag beside the reference — "Key configured TAVILY_API_KEY" or "No key configured, searches run keyless TAVILY_API_KEY" — so a search that would be unauthenticated says so before it is made. The read is a soft dependency (`ctx.inject`), because `remote.credentials` mounts asynchronously and a read attempted during `apply` would race that mount. Only an answer is ever published: a refused or failed read leaves the status line absent rather than claiming no key is configured, and a deployment that never mounts the namespace still renders the form.

The shell shares its **components** through the frozen module table but not its CSS modules, so the card carries its own stylesheet (`<style id="dsh-web-search-tavily-styles">`, installed once and idempotently by `installTavilyStyles()`). It reads `--dsw-alias-*` tokens only and mirrors the shell settings page's rhythm, 0.5px dividers, and enum picker; booleans use the shell's `Switch` and badges its `Tag`. No colour is hard-coded except the select chevron, because a data-URI SVG cannot resolve a CSS variable.

The plugin artwork is the harness web-search glyph: `package.json` declares `"icon": "./icon.svg"`, the same position and shape the built-in `web-search` artwork uses. The SVG approximates the built-in conic-gradient ring with a linear gradient, because the harness paints that ring with a `foreignObject` that stays empty inside the `<img>` a manifest icon renders as.

The Plugins page reads this plugin's display text from `locale/en.json` — the anchor the Host resolves first — plus one file per language beside it, each carrying `meta.title` and `meta.description`. Both files are read through the package specifier, so `exports` maps `"./locale/*.json"` and `files` carries `locale/*.json`; a locale file that is not exported is metadata the page never sees. Without them the page falls back to the untranslated `package.json` `name` and `description`. The plugin's own card text comes from the client dictionaries instead (`client-src/locales.ts`), so a new string belongs in both places.

## Mapping

- `answer` (when `includeAnswer` is enabled) → `content`.
- Each result → `WebSearchSource`: `url`, `title`, `publishedAt` ← `published_date`, and `snippet` preferring `content` with `raw_content` as fallback. Blank fields are omitted; URL-less results are dropped.
- `max_results` is clamped to 20 (Tavily's documented bound); the seam still enforces the final `maxResults` truncation (`truncated`).
- `published_date` is normalized to **ISO-8601**: Tavily sends RFC-1123 (`Thu, 20 Aug 2026 00:00:00 GMT`) while the seam documents an ISO-8601 string, so passing it through would break any consumer that parses the field as documented. An unparseable value is dropped rather than forwarded in the wrong format.

## Model Experience

Indirectly, through `dsh-tool-web`: the model sees the `maxResults`-bounded URLs, titles, snippets, and publication dates, plus the generated answer when `includeAnswer` is enabled. Provider failures surface as `WebError` `WEB_PROVIDER_ERROR` (message from the Tavily error body, including the keyless-limit envelope); cancellation surfaces as `WEB_ABORTED`; an `apiKeyEnv` outside the credential grammar surfaces as `TAVILY_INVALID_CREDENTIAL_REF`, whose message names the setting and its value. Credential-bearing requests reject redirects before the `Location` target is contacted.

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

The client half is typechecked against the **real** published client packages — `react`, `@types/react`, `@deepseek-ai/dsh-client-store`, and `@deepseek-ai/dsh-client-ui-primitives` are dev-only dependencies pinned to the version the shell ships. Nothing about them reaches the bundle (`lib/client.js` keeps them external and the shell resolves them from its frozen module table), but `pnpm typecheck` now fails when a prop name, an optionality, or an export drifts instead of a hand-written declaration quietly accepting it. The unit tests still run against local stubs (`tests/stubs/`, aliased in `vitest.config.ts`) because they need an inspectable element tree, not a browser.

## Known Limitations and Deferred Work

- **Only `search` is implemented** — no Tavily `extract`/crawl/map/research; keyless mode only permits search/extract anyway.
- **Keyless is server-rate-limited** and may downgrade parameters; the plugin makes no local assumptions.
- **`includeImages` / `includeImageDescriptions` / `includeFavicon` / `includeUsage` were removed** — the seam has no surface for them, so they only changed the request body. An older patch that still sets them should drop those keys.
- **Combinations Tavily rejects with a 400 are handled in the provider** — `include_domains_mode` without `include_domains`, and `filter_by_language` without `language`, are dropped rather than sent (both verified to return 400).
- **`safe_search` conflicts with the `fast`/`ultra-fast` depths** — Tavily answers that combination with a 400 (`Safe search parameter is not supported for fast or ultra-fast search_depth.`); the plugin does not intercept it and surfaces the message as-is.
- **Selection stays user-owned**: installing this bundle registers the provider; pinning `searchProvider: tavily` is a profile-layer decision (see above).
- **Abort classification is signal-based**: a fetch abort or an already-aborted signal maps to `WEB_ABORTED`.
- **The settings open from the row, not from an Official-group card** — two clicks (Plugins → the bundle row) instead of one. Registering `plugins.item` as well would restore the one-click path, at the cost of a second card that always shows the default artwork, because that slot's artwork map is keyed to the four shipped item ids.
- **A prop named `ref` is a trap in this bundle**: React owns `ref` on every element, so a string value there never reaches a function component and throws error #290 instead, which the shell reports as `slot entry crashed` and renders nothing. The `jsx-runtime` test stub now reproduces that rule, so the suite fails first.

## License

MIT
