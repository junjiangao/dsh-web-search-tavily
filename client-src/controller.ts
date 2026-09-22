/**
 * The Plugins page's staged form over the `web-search-tavily` settings
 * namespace — the Loader entry id, which is also the id of the row this
 * bundle's patch inserts.
 *
 * The card registers into the `plugins.row.config` slot keyed by
 * `<bundle package>#<row id>`, which is what gives that row on the bundle's
 * page its configure control; the page then hands the entry's configuration
 * form to the card and the shared model stages every edit until one save.
 *
 * The section names a credential reference, never the secret: whether a key
 * exists behind that reference is a question for the credentials domain, and
 * the card asks it here so the form can say whether a search would be
 * authenticated or run keyless.
 */

import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel,
  type SettingsFieldState, type SettingsFormActions, type SettingsFormLabels,
  type SettingsFormScope, type SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { CredentialsRemote, RemoteService } from './context.ts'
import { specOf, TAVILY_FIELDS, type TavilyField } from './fields.ts'

/** Credential reference the provider resolves when the section names none. */
export const DEFAULT_API_KEY_REF = 'TAVILY_API_KEY'

/** Field naming the credential reference the provider resolves. */
const API_KEY_ENV_FIELD = 'apiKeyEnv'

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

/** What the credentials domain last reported about the reference in force. */
export interface TavilyCredentialState {
  /** Reference this answer describes. */
  readonly ref: string
  /** Whether any layer supplies a value for it. */
  readonly configured: boolean
  /** Whether the credentials domain accepts a write for it. */
  readonly writable: boolean
}

/** What the card renders: the shared form state plus every field's draft. */
export interface TavilyCardState extends SettingsFormShell {
  /** Draft text, override mark, and validity of each configured field. */
  readonly fields: Readonly<Record<string, SettingsFieldState>>
  /**
   * The credential the section names, or undefined when this deployment
   * exposes no credentials domain to ask.
   */
  readonly credential?: TavilyCredentialState | undefined
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
  private credential: TavilyCredentialState | undefined
  private credentials: CredentialsRemote | undefined
  private readonly disposers: Array<() => void> = []

  /**
   * @param scope - the bound configuration form for the `web-search-tavily` entry.
   */
  constructor(private readonly scope: SettingsFormScope<TavilySettings>) {
    this.form = new SettingsFormModel(scope, TAVILY_FIELDS.map(field => specOf(field)))
    this.store = this.form.bind(() => this.projection())
  }

  /**
   * Start reporting the credential, once the deployment exposes the domain.
   *
   * Called when the remote namespaces are mounted rather than from the
   * constructor: `remote.credentials` arrives asynchronously, and a read
   * attempted before it exists would be indistinguishable from a read that
   * answered "no key".
   * @param remote - the remote service carrying the forwarded events.
   * @param credentials - the mounted credentials namespace.
   */
  attachCredentials(remote: RemoteService, credentials: CredentialsRemote): void {
    if (this.credentials !== undefined) return
    this.credentials = credentials
    // The reference can change under the card (a saved edit or another
    // surface), and a key can be written without the section moving at all,
    // so both the scope and the forwarded credential event re-read it.
    this.disposers.push(this.scope.subscribe(() => { void this.readCredential() }))
    this.disposers.push(remote.$on('credentials/reference-updated', (ref) => {
      if (ref === this.credential?.ref) void this.readCredential()
    }))
    void this.readCredential()
  }

  /**
   * Build the face the card renders.
   * @returns the snapshot store and the model's actions.
   */
  inject(): Pick<TavilyCardFace, 'store' | 'actions'> {
    return { store: this.store, actions: this.form.actions() }
  }

  /** Release the form's and the credentials domain's subscriptions. */
  dispose(): void {
    for (const dispose of this.disposers.splice(0)) dispose()
    this.form.dispose()
  }

  /**
   * Ask the credentials domain about the reference the section currently
   * names. The answer is stored with the reference it describes: the reference
   * can change between the request and its response, so a response is
   * published only while it still answers for the reference in force.
   *
   * Only an answer is published. A refused or failed read leaves the card
   * without a credential line rather than claiming no key is configured, which
   * is the one claim a broken read must never make: it would tell the user to
   * set a key that is already there.
   */
  private async readCredential(): Promise<void> {
    const credentials = this.credentials
    if (credentials === undefined) return
    const ref = refOf(this.section())
    try {
      const response = await credentials.describe([ref])
      if (!response.ok || ref !== refOf(this.section())) return
      const view = response.value[ref]
      if (view === undefined) return
      const next: TavilyCredentialState = {
        ref,
        configured: view.configured,
        writable: view.writable,
      }
      if (next.configured === this.credential?.configured
        && next.writable === this.credential?.writable
        && next.ref === this.credential?.ref) return
      this.credential = next
      this.publish()
    } catch {
      // The last known answer stands; the form itself does not depend on it.
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }

  /** The accepted section the reference is read from. */
  private section(): Record<string, unknown> | undefined {
    return this.scope.getSnapshot().value as Record<string, unknown> | undefined
  }

  private projection(): TavilyCardState {
    const fields: Record<string, SettingsFieldState> = {}
    for (const field of TAVILY_FIELDS) fields[field.field] = this.form.field(field.field)
    return {
      ...this.form.shell(),
      fields,
      ...this.credential === undefined ? {} : { credential: this.credential },
    }
  }
}

/**
 * The credential reference the section names, or the provider's default.
 * @param section - the accepted section, when one has arrived.
 * @returns the reference to address.
 */
function refOf(section: Record<string, unknown> | undefined): string {
  const declared = section?.[API_KEY_ENV_FIELD]
  return typeof declared === 'string' && declared.length > 0 ? declared : DEFAULT_API_KEY_REF
}
