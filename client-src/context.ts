/**
 * The slice of the browser plugin context this bundle consumes.
 *
 * Spelled locally rather than imported from `@deepseek-ai/cordis`: the bundle
 * resolves its services from the shell's module table at runtime, and only the
 * members below are touched. Where the shell's own packages describe a value
 * the bundle passes through — the settings primitives' form scope and path ops
 * — their types are imported rather than restated, from dev-only dependencies
 * pinned to the version the shell ships.
 */

import type { SettingsFormPathOp, SettingsFormScopeSnapshot } from '@deepseek-ai/dsh-client-ui-primitives'

/** The locale service's share used here. */
export interface LocaleService {
  /** Register one namespace's dictionaries. */
  register(namespace: string, dictionaries: Record<string, Record<string, string>>): void
  /** Bind a translate function to one namespace. */
  bind(namespace: string): (key: string) => string
}

/** One slot registration, as this bundle uses it. */
export interface SlotRegistrationOptions {
  /** Slot name. */
  name: string
  /** Cell key of a keyed slot. */
  key?: string
  /** Cell id of a list slot. */
  id?: string
  /** Position among the slot's entries. */
  order?: number
  /** Localized display text. */
  label?: () => string
  /** Dictionary namespace of the entry. */
  locale?: string
}

/** The slots service's share used here. */
export interface SlotsService {
  /**
   * Register one component into a slot; the shell ties it to this context.
   * @returns the disposer removing the registration.
   */
  register(options: SlotRegistrationOptions, component: unknown): () => void
  /**
   * Install a registration for each declaration lifetime of a slot: the factory
   * runs once the slot is declared, and runs again after a collapse.
   * @param name - slot name.
   * @param factory - creates the registration's disposer.
   * @returns the idempotent disposer stopping the wait; some shells return nothing.
   */
  inject(name: string, factory: () => () => void): (() => void) | void
}

/** The configuration form of one Host plugin entry. */
export interface ConfigForm<T> {
  /** Current accepted values and write state. */
  getSnapshot(): SettingsFormScopeSnapshot<T>
  /** Observe snapshot replacements. */
  subscribe(listener: () => void): () => void
  /** Apply ordered field edits in one revision-fenced write. */
  mutate(ops: readonly SettingsFormPathOp[], expectedRevision?: number): Promise<boolean>
}

/** The client configuration-form service. */
export interface ConfigForms {
  /** The shared form of one Host plugin entry id. */
  get<T>(entryId: string): ConfigForm<T>
  /**
   * Keep a registration alive while the Host serves any of some namespaces.
   * @param namespaces - entry ids to watch.
   * @param register - called with the served set; returns the disposer to run when none is served.
   * @returns the disposer removing the watch.
   */
  whileServed(namespaces: readonly string[], register: (served: ReadonlySet<string>) => () => void): () => void
}

/** What the credentials domain reports about one reference. */
export interface CredentialInfoView {
  /** Whether any layer supplies a value for the reference. */
  readonly configured: boolean
  /** Whether the credentials domain accepts a write for it. */
  readonly writable: boolean
}

/** One remote call's settled answer. */
export interface RemoteResult<T> {
  /** Whether the Host answered. */
  readonly ok: boolean
  /** The answer, meaningful only when {@link RemoteResult.ok}. */
  readonly value: T
}

/** The credentials remote, as the card reads it. */
export interface CredentialsRemote {
  /**
   * Describe references without revealing their values.
   * @param refs - the references to describe.
   * @returns each reference's configured/writable state.
   */
  describe(refs: readonly string[]): Promise<RemoteResult<Record<string, CredentialInfoView | undefined>>>
}

/** One row of a bundle, as the plugin manager lists it. */
export interface ManagedBundleRow {
  /** The row id the bundle's patch declares. */
  readonly rowId: string
  /** The module the row loads. */
  readonly moduleName: string
}

/** One bundle, as the plugin manager lists it. */
export interface ManagedBundle {
  /**
   * The name the profile installs the bundle under — its dependency key, which
   * is also the name the Plugins page dispatches this bundle's configuration
   * by. It is the package's own name unless the profile aliases the install.
   */
  readonly name: string
  /** The rows the bundle declares. */
  readonly rows?: readonly ManagedBundleRow[]
}

/** The plugin-manager remote, as far as this bundle reads it. */
export interface PluginManagerRemote {
  /**
   * List the bundles the profile declares, installed or optional.
   * @returns each bundle's declared name and rows.
   */
  listBundles(): Promise<RemoteResult<readonly ManagedBundle[]>>
}

/** The forwarded-event face of the remote service. */
export interface RemoteService {
  /**
   * Observe one Host-forwarded event.
   * @param event - the forwarded event name.
   * @param listener - invoked with the event's subject.
   * @returns the disposer removing this listener.
   */
  $on(event: string, listener: (payload: string) => void): () => void
}

/** The browser plugin context, as far as this bundle reads it. */
export interface Context {
  readonly locale: LocaleService
  readonly slots: SlotsService
  readonly configForms: ConfigForms
  /**
   * Read an optional service.
   * @param name - the service name.
   * @returns the service, or undefined when this context does not provide it.
   */
  get(name: string): unknown
  /**
   * Run a callback once every named service is available.
   *
   * Remote namespaces mount asynchronously (`remote.$mount`), so reading one
   * during `apply` can miss it. A soft dependency waits for the service
   * without holding this entry back: a deployment that never provides it still
   * activates, it just never gets the callback.
   * @param names - the service names to await.
   * @param callback - invoked with a context scoped to those services.
   * @returns the child fiber, disposed with this plugin's.
   */
  inject(names: readonly string[], callback: (scoped: Context) => void): { dispose(): void }
  /**
   * Run a side effect for as long as the plugin's fiber lives.
   * @param callback - the effect; an optional returned disposer runs on unload.
   * @param label - diagnostic label.
   * @returns the disposer removing the effect.
   */
  effect(callback: () => void | (() => void), label?: string): () => void
}
