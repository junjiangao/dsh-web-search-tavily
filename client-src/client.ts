/**
 * Browser half of `@junjiangao/dsh-web-search-tavily`: the provider's
 * configuration card on the dsh Web Plugins page.
 *
 * The Host half owns the Loader entry, its schema, and the search provider.
 * This half owns exactly one thing: while the Host serves the
 * `web-search-tavily` namespace, it registers the entry's form into the
 * `plugins.row.config` slot under `<package>#<row id>` — the key the page
 * dispatches for the row this bundle's patch inserts. A deployment without the
 * provider therefore shows no trace of the card, and the card disappears with
 * the entry rather than rendering a form nothing would accept.
 *
 * @module @junjiangao/dsh-web-search-tavily/client
 */

import { TavilyCard, type TavilyCardProps } from './card.tsx'
import { TavilyCardController, TAVILY_ROW_CONFIG_KEY, TAVILY_SETTINGS_NS } from './controller.ts'
import type { Context, RemoteService } from './context.ts'
import { TAVILY_FIELDS } from './fields.ts'
import { dictionaries, NS } from './locales.ts'

export type { TavilyCardProps } from './card.tsx'
export type { TavilyCardFace, TavilyCardState, TavilyCredentialState } from './controller.ts'
export { DEFAULT_API_KEY_REF } from './controller.ts'

export { TAVILY_BUNDLE, TAVILY_ROW_CONFIG_KEY, TAVILY_ROW_ID, TAVILY_SETTINGS_NS } from './controller.ts'
export { TAVILY_FIELDS, type TavilyField, type TavilyFieldKind } from './fields.ts'

/** Dictionary namespace owned by this plugin. */
export { NS }

/** Required client services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'configForms']

/**
 * Mount the provider's configuration card while the Host serves its namespace.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'web-search-tavily: dictionaries')

  // Read rather than inject: a deployment without the credentials domain
  // still renders the form and reports the key as unknown, instead of leaving
  // this entry pending and the whole page short one plugin.
  const remote = ctx.get('remote') as RemoteService | undefined
  const controller = new TavilyCardController(ctx.configForms.get(TAVILY_SETTINGS_NS), remote)
  ctx.effect(() => () => { controller.dispose() }, 'web-search-tavily: form subscription')

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

  ctx.effect(() => ctx.configForms.whileServed([TAVILY_SETTINGS_NS], () => {
    const disposer = ctx.slots.inject('plugins.row.config', () => ctx.slots.register(
      { name: 'plugins.row.config', key: TAVILY_ROW_CONFIG_KEY },
      (props: TavilyCardProps) => TavilyCard(props, face),
    ))
    // The shell's inject returns the registration's disposer; a shell that
    // returns nothing still owns the registration through the context.
    return typeof disposer === 'function' ? disposer : () => {}
  }), 'web-search-tavily: row configuration page')
}
