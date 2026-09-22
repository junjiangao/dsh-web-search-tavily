/**
 * Browser half of `@junjiangao/dsh-web-search-tavily`: the provider's
 * configuration card on the dsh Web Plugins page.
 *
 * The Host half owns the Loader entry, its schema, and the search provider.
 * This half owns exactly one thing: while the Host serves the
 * `web-search-tavily` namespace, it registers the entry's form into two
 * surfaces of the Plugins page.
 *
 * `plugins.item` carries the card the Official group shows, so the page opens
 * the form in one click — the same path the shipped provider pages take, and
 * the one that needs no knowledge of which bundle a row arrived in.
 * `plugins.row.config` carries the configure control on the row this bundle's
 * patch inserts, keyed `<package>#<row id>`, which is where dsh documents a
 * bundle's own configuration. Both render the same form over the same
 * namespace, so a save from either lands in the same place.
 *
 * A deployment without the provider shows no trace of either, and the cards
 * disappear with the entry rather than rendering a form nothing would accept.
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

/** Position of this card among the Official group's items, after the shipped pages. */
export const TAVILY_ITEM_ORDER = 45

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

  const card = (props: TavilyCardProps) => TavilyCard(props, face)

  ctx.effect(() => ctx.configForms.whileServed([TAVILY_SETTINGS_NS], () => {
    // The card the Plugins page lists in its Official group. Its id is the
    // namespace the Host serves, which is what lets the page hand this entry's
    // configuration form to the card when the card is opened.
    const item = ctx.slots.inject('plugins.item', () => ctx.slots.register(
      {
        name: 'plugins.item',
        id: TAVILY_SETTINGS_NS,
        order: TAVILY_ITEM_ORDER,
        label: () => t('title'),
        locale: NS,
      },
      card,
    ))
    // The configure control on the bundle row itself.
    const row = ctx.slots.inject('plugins.row.config', () => ctx.slots.register(
      { name: 'plugins.row.config', key: TAVILY_ROW_CONFIG_KEY },
      card,
    ))
    // The shell's inject returns the registration's disposer; a shell that
    // returns nothing still owns the registration through the context.
    return () => {
      if (typeof item === 'function') item()
      if (typeof row === 'function') row()
    }
  }), 'web-search-tavily: configuration surfaces')
}
