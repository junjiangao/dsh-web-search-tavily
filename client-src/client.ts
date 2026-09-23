/**
 * Browser half of `@junjiangao/dsh-web-search-tavily`: the provider's
 * configuration card on the dsh Web Plugins page.
 *
 * The Host half owns the Loader entry, its schema, and the search provider.
 * This half owns one thing: while the Host serves the `web-search-tavily`
 * namespace, it registers the entry's form into the one surface dsh reserves
 * for a bundle's own configuration.
 *
 * `plugins.bundle.config` carries the form on this bundle's own page, so the
 * settings sit directly under the description — one click from the Plugins
 * list. It is deliberately the only surface: `plugins.row.config` would add a
 * second, redundant entry behind the row's configure control for the same form
 * over the same namespace.
 *
 * The key addresses the *declared* bundle name: the Plugins page dispatches the
 * name the profile installs the bundle under, which is an alias of the package
 * name whenever the profile predates a rename. The manager's bundle list is
 * therefore read for the entry whose row loads this package, and the surface is
 * keyed to the name it reports.
 *
 * It deliberately registers nothing into `plugins.item`: that slot lists the
 * official host-plane settings pages beside the official bundles, and any card
 * registered by a bundle shows the default glyph whatever its manifest
 * declares (the slot's artwork map is keyed to the four shipped item ids
 * `shell`, `agent-loop`, `subagent`, `web-search`).
 *
 * A deployment without the provider shows no trace of it, and the card
 * disappears with the entry rather than rendering a form nothing would accept.
 *
 * @module @junjiangao/dsh-web-search-tavily/client
 */

import { TavilyCard, type TavilyCardProps } from './card.tsx'
import { TavilyCardController, TAVILY_BUNDLE, TAVILY_ROW_ID, TAVILY_SETTINGS_NS } from './controller.ts'
import type { Context, CredentialsRemote, PluginManagerRemote, RemoteService } from './context.ts'
import { TAVILY_FIELDS } from './fields.ts'
import { dictionaries, NS } from './locales.ts'
import { installTavilyStyles } from './styles.ts'

export type { TavilyCardProps } from './card.tsx'
export type { TavilyCardFace, TavilyCardState, TavilyCredentialState } from './controller.ts'
export { DEFAULT_API_KEY_REF } from './controller.ts'

export { TAVILY_BUNDLE, TAVILY_ROW_ID, TAVILY_SETTINGS_NS } from './controller.ts'
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

  // The name the Plugins page dispatches this surface by: the name the profile
  // installs this bundle under. That is the package's own name unless the
  // profile aliases the install — a profile that predates a package rename
  // keeps the old key — and the page reports the declared name, so the
  // package's own name is the fallback until the Host answers.
  let bundleName = TAVILY_BUNDLE
  let surfaces: (() => void) | undefined

  /** Register the surface under the name in force, re-keying on a change. */
  const mount = (): void => {
    surfaces?.()
    surfaces = ctx.effect(() => ctx.configForms.whileServed([TAVILY_SETTINGS_NS], () => {
      // The bundle's own configuration, on the bundle's page between its
      // description and its rows: the one surface this card claims.
      const bundle = ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register(
        { name: 'plugins.bundle.config', key: bundleName },
        card,
      ))
      // The shell's inject returns the registration's disposer; a shell that
      // returns nothing still owns the registration through the context.
      return () => {
        if (typeof bundle === 'function') bundle()
      }
    }), 'web-search-tavily: bundle configuration surface')
  }

  mount()

  // A soft dependency, like the credentials namespace: a deployment with no
  // plugin manager keeps the package-name key. When the manager answers, a
  // bundle the profile installed under another name is re-keyed to the name the
  // page dispatches.
  ctx.inject(['remote', 'remote.pluginManager'], (scoped) => {
    const manager = scoped.get('remote.pluginManager') as PluginManagerRemote | undefined
    if (manager === undefined) return
    void manager.listBundles().then((answer) => {
      if (!answer.ok) return
      const declared = answer.value.find(bundle => bundle.rows?.some(
        row => row.rowId === TAVILY_ROW_ID && row.moduleName === TAVILY_BUNDLE,
      ))
      if (declared === undefined || declared.name === bundleName) return
      bundleName = declared.name
      mount()
    }).catch(() => {
      // The package-name key stands; the card is re-keyed on the next load.
    })
  })
}
