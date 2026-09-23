/**
 * Browser half of `@junjiangao/dsh-web-search-tavily`: the provider's
 * configuration card on the dsh Web Plugins page.
 *
 * The Host half owns the Loader entry, its schema, and the search provider.
 * This half owns one thing: while the Host serves the `web-search-tavily`
 * namespace, it registers the entry's form into the surfaces dsh reserves for a
 * bundle's own configuration.
 *
 * `plugins.bundle.config` carries the form on this bundle's own page, keyed by
 * the package name the profile selects, so the settings sit directly under the
 * description — one click from the Plugins list. `plugins.row.config` carries
 * the configure control on the row this bundle's patch inserts, keyed
 * `<package>#<row id>`, which opens the same form under its own page. Both
 * render the same form over the same namespace, so a save from either lands in
 * the same place.
 *
 * It deliberately registers nothing into `plugins.item`: that slot lists the
 * official host-plane settings pages beside the official bundles, and any card
 * registered by a bundle shows the default glyph whatever its manifest
 * declares (the slot's artwork map is keyed to the four shipped item ids
 * `shell`, `agent-loop`, `subagent`, `web-search`). A bundle's configuration
 * belongs in `plugins.bundle.config` or `plugins.row.config` — this one, not
 * that one.
 *
 * A deployment without the provider shows no trace of either, and the cards
 * disappear with the entry rather than rendering a form nothing would accept.
 *
 * @module @junjiangao/dsh-web-search-tavily/client
 */

import { TavilyCard, type TavilyCardProps } from './card.tsx'
import { TavilyCardController, TAVILY_BUNDLE, TAVILY_ROW_CONFIG_KEY, TAVILY_SETTINGS_NS } from './controller.ts'
import type { Context, CredentialsRemote, RemoteService } from './context.ts'
import { TAVILY_FIELDS } from './fields.ts'
import { dictionaries, NS } from './locales.ts'
import { installTavilyStyles } from './styles.ts'

export type { TavilyCardProps } from './card.tsx'
export type { TavilyCardFace, TavilyCardState, TavilyCredentialState } from './controller.ts'
export { DEFAULT_API_KEY_REF } from './controller.ts'

export { TAVILY_BUNDLE, TAVILY_ROW_CONFIG_KEY, TAVILY_ROW_ID, TAVILY_SETTINGS_NS } from './controller.ts'
export { TAVILY_FIELDS, type TavilyField, type TavilyFieldKind } from './fields.ts'
export { installTavilyStyles, TAVILY_CSS, TAVILY_STYLE_ELEMENT_ID } from './styles.ts'

/** Dictionary namespace owned by this plugin. */
export { NS }

/** Required client services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'configForms']

/**
 * Mount the provider's configuration card while the Host serves its namespace.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: Context): void {
  // The shell shares its components through the module table but not their
  // stylesheets, so the card's own rules are installed once here, before any
  // card renders. A host without a document (the test runner) skips it.
  installTavilyStyles()
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'web-search-tavily: dictionaries')

  const controller = new TavilyCardController(ctx.configForms.get(TAVILY_SETTINGS_NS))
  ctx.effect(() => () => { controller.dispose() }, 'web-search-tavily: form subscription')

  // A soft dependency, not an injected one: the credentials namespace mounts
  // asynchronously, so reading it during apply would race the mount, and a
  // deployment that never mounts it still renders the form — it just has no
  // key status to report.
  ctx.inject(['remote', 'remote.credentials'], (scoped) => {
    const remote = scoped.get('remote') as RemoteService | undefined
    const credentials = scoped.get('remote.credentials') as CredentialsRemote | undefined
    if (remote === undefined || credentials === undefined) return
    controller.attachCredentials(remote, credentials)
  })

  const face = {
    fields: TAVILY_FIELDS,
    t,
    labels: {
      unavailable: t('unavailable'),
      readOnly: t('readOnly'),
      saveFailed: t('saveFailed'),
      save: t('save'),
      saving: t('saving'),
    },
    ...controller.inject(),
  }

  const card = (props: TavilyCardProps) => TavilyCard(props, face)

  ctx.effect(() => ctx.configForms.whileServed([TAVILY_SETTINGS_NS], () => {
    // The bundle's own configuration, on the bundle's page between its
    // description and its rows. The page dispatches this exact key — the
    // package name the profile selects — so the form needs no extra click.
    const bundle = ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register(
      { name: 'plugins.bundle.config', key: TAVILY_BUNDLE },
      card,
    ))
    // The configure control on the row this bundle's patch inserts.
    const row = ctx.slots.inject('plugins.row.config', () => ctx.slots.register(
      { name: 'plugins.row.config', key: TAVILY_ROW_CONFIG_KEY },
      card,
    ))
    // The shell's inject returns the registration's disposer; a shell that
    // returns nothing still owns the registration through the context.
    return () => {
      if (typeof bundle === 'function') bundle()
      if (typeof row === 'function') row()
    }
  }), 'web-search-tavily: bundle configuration surfaces')
}
