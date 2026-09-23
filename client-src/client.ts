/**
 * Browser half of `@junjiangao/dsh-web-search-tavily`: the provider's
 * configuration card on the dsh Web Plugins page.
 *
 * The Host half owns the Loader entry, its schema, and the search provider.
 * This half owns exactly one thing: while the Host serves the
 * `web-search-tavily` namespace, it registers the entry's form into the
 * `plugins.row.config` surface of the Plugins page — the configure control on
 * the row this bundle's patch inserts, keyed `<package>#<row id>`, which is
 * where dsh documents a bundle's own configuration.
 *
 * It deliberately registers nothing into `plugins.item`. That slot's cards take
 * their artwork from a map keyed to the four shipped item ids (`shell`,
 * `agent-loop`, `subagent`, `web-search`), so a card registered by any other
 * plugin renders the default glyph no matter what its manifest declares; the
 * row and bundle surfaces render the manifest `icon` instead. One entry point
 * that shows this plugin's own icon beats two that show the same form under two
 * different artworks.
 *
 * A deployment without the provider shows no trace of it, and the card
 * disappears with the entry rather than rendering a form nothing would accept.
 *
 * @module @junjiangao/dsh-web-search-tavily/client
 */

import { TavilyCard, type TavilyCardProps } from './card.tsx'
import { TavilyCardController, TAVILY_ROW_CONFIG_KEY, TAVILY_SETTINGS_NS } from './controller.ts'
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
    // The configure control on the bundle row itself: the only surface this
    // card registers, and the one that renders the manifest icon.
    const row = ctx.slots.inject('plugins.row.config', () => ctx.slots.register(
      { name: 'plugins.row.config', key: TAVILY_ROW_CONFIG_KEY },
      card,
    ))
    // The shell's inject returns the registration's disposer; a shell that
    // returns nothing still owns the registration through the context.
    return () => {
      if (typeof row === 'function') row()
    }
  }), 'web-search-tavily: configuration surface')
}
