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

/** The browser plugin context, as far as this bundle reads it. */
export interface Context {
  readonly locale: LocaleService
  readonly slots: SlotsService
  readonly configForms: ConfigForms
  /**
   * Run a side effect for as long as the plugin's fiber lives.
   * @param callback - the effect; an optional returned disposer runs on unload.
   * @param label - diagnostic label.
   * @returns the disposer removing the effect.
   */
  effect(callback: () => void | (() => void), label?: string): () => void
}
