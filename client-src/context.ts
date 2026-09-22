/**
 * The slice of the browser plugin context this bundle consumes.
 *
 * Spelled locally rather than imported from `@deepseek-ai/cordis`: a client
 * bundle resolves its services from the shell's module table at runtime and
 * the plugin repo installs no client package, so the ambient declarations in
 * `env.d.ts` are the whole compile-time surface. Cordis calls `apply(ctx)`
 * with the real context; only the members below are touched.
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
  /** Register one component into a slot. */
  register(options: SlotRegistrationOptions, component: unknown): { dispose(): void }
  /**
   * Keep a registration alive for as long as this context lives.
   * @returns the disposer removing it; some shells return nothing.
   */
  inject(name: string, factory: () => { dispose(): void }): (() => void) | void
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

/** The forwarded-event and namespace face of the remote service. */
export interface RemoteService {
  readonly credentials: CredentialsRemote
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
   *
   * The credentials domain is read this way on purpose: a deployment without
   * it still renders the form and reports the key as unknown, rather than
   * keeping the whole entry from activating.
   * @param name - the service name.
   * @returns the service, or undefined when this context does not provide it.
   */
  get(name: string): unknown
  /**
   * Run a side effect for as long as the plugin's fiber lives.
   * @param callback - the effect; an optional returned disposer runs on unload.
   * @param label - diagnostic label.
   * @returns the disposer removing the effect.
   */
  effect(callback: () => void | (() => void), label?: string): () => void
}
