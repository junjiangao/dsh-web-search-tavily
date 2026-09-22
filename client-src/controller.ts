/**
 * The Plugins page's staged form over the `web-search-tavily` settings
 * namespace — the Loader entry id, which is also the id of the row this
 * bundle's patch inserts.
 *
 * The card registers into the `plugins.row.config` slot keyed by
 * `<bundle package>#<row id>`, which is what gives that row on the bundle's
 * page its configure control; the page then hands the entry's configuration
 * form to the card and the shared model stages every edit until one save.
 */

import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel,
  type SettingsFieldState, type SettingsFormActions, type SettingsFormLabels,
  type SettingsFormScope, type SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { specOf, TAVILY_FIELDS, type TavilyField } from './fields.ts'

/** Settings namespace of this provider: the Loader entry id. */
export const TAVILY_SETTINGS_NS = 'web-search-tavily'

/** The bundle's package name, as the profile selects it. */
export const TAVILY_BUNDLE = '@junjiangao/dsh-web-search-tavily'

/** The bundle row this patch inserts. */
export const TAVILY_ROW_ID = 'web-search-tavily'

/**
 * The `plugins.row.config` key of this plugin's row: the page dispatches
 * `<package name>#<row id>` exactly as the bundle patch declares both.
 */
export const TAVILY_ROW_CONFIG_KEY = `${TAVILY_BUNDLE}#${TAVILY_ROW_ID}`

/** The section shape the form stages over; values are read field by field. */
export type TavilySettings = Record<string, unknown>

/** What the card renders: the shared form state plus every field's draft. */
export interface TavilyCardState extends SettingsFormShell {
  /** Draft text, override mark, and validity of each configured field. */
  readonly fields: Readonly<Record<string, SettingsFieldState>>
}

/** The face the card component reads and writes through. */
export interface TavilyCardFace {
  /** The fields to render, in order. */
  readonly fields: readonly TavilyField[]
  /** Snapshot the card binds as its state. */
  readonly store: SnapshotStore<TavilyCardState>
  /** Edit, reset, save, and discard actions of the shared model. */
  readonly actions: SettingsFormActions
  /** Form-frame copy. */
  readonly labels: SettingsFormLabels
  /** Translate one dictionary key of this plugin's namespace. */
  readonly t: (key: string) => string
}

/** Bridges the Host's configuration form for this entry onto the card. */
export class TavilyCardController {
  private readonly form: SettingsFormModel<TavilySettings>
  private readonly store: SnapshotStore<TavilyCardState>

  /**
   * @param scope - the bound configuration form for the `web-search-tavily` entry.
   */
  constructor(scope: SettingsFormScope<TavilySettings>) {
    this.form = new SettingsFormModel(scope, TAVILY_FIELDS.map(field => specOf(field)))
    this.store = this.form.bind(() => this.projection())
  }

  /**
   * Build the face the card renders.
   * @returns the snapshot store and the model's actions.
   */
  inject(): Pick<TavilyCardFace, 'store' | 'actions'> {
    return { store: this.store, actions: this.form.actions() }
  }

  /** Release the form's accepted-value subscription. */
  dispose(): void {
    this.form.dispose()
  }

  private projection(): TavilyCardState {
    const fields: Record<string, SettingsFieldState> = {}
    for (const field of TAVILY_FIELDS) fields[field.field] = this.form.field(field.field)
    return { ...this.form.shell(), fields }
  }
}
