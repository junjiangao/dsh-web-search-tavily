/**
 * Ambient type declarations for the client bundle's external modules.
 *
 * The bundle runs inside the DSH Web shell, which resolves these specifiers
 * from its static module table or the boot graph at runtime; the plugin repo
 * therefore never installs them as real dependencies. These declarations
 * cover exactly the surface the client code uses — kept minimal on purpose so
 * a drift between the shell's actual exports and these shapes fails loudly at
 * the bundle boundary rather than silently inside the plugin.
 */

declare module 'react' {
  export type ReactNode = unknown
  export type ReactElement<P = any> = { type: any; props: P; key: any }
  export interface RefObject<T> { current: T }
  export function createElement(type: any, props?: any, ...children: any[]): ReactElement
  export function Fragment(props: { children?: ReactNode }): ReactElement
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void]
  export function useRef<T>(initial: T): RefObject<T>
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: readonly unknown[]): T
  export function useMemo<T>(fn: () => T, deps: readonly unknown[]): T
  export function useId(): string
  const _default: {
    createElement: typeof createElement
    Fragment: typeof Fragment
    useState: typeof useState
    useRef: typeof useRef
    useEffect: typeof useEffect
    useCallback: typeof useCallback
    useMemo: typeof useMemo
    useId: typeof useId
  }
  export default _default
}

declare module 'react/jsx-runtime' {
  export const Fragment: any
  export function jsx(type: any, props: any, key?: any): any
  export function jsxs(type: any, props: any, key?: any): any
}

declare module '@deepseek-ai/dsh-client-store' {
  /** Minimal snapshot-store face (the store's `createSnapshotStore`). */
  export interface SnapshotStore<T> {
    getSnapshot(): T
    subscribe(listener: () => void): () => void
    set(value: T): void
    update(recipe: (draft: T) => void): void
  }
  export function createSnapshotStore<T>(initial: T): SnapshotStore<T>
}

declare module '@deepseek-ai/dsh-client-ui-primitives' {
  /**
   * The native 14px chevron every official plugin card's disclosure header
   * uses (`ic_ds_chevron_down_outline_14`); resolved from the shell's static
   * module table.
   */
  export function IconChevronDownOutline14(props: { size?: number; className?: string }): unknown
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  /** Slot registration options (the subset client plugins use). */
  export interface SlotRegistrationOptions {
    name: string
    /** `id` for list slots; `key` for keyed slots. */
    id?: string
    key?: string
    order?: number
    label?: () => string
    locale?: string
    inject?: () => Record<string, unknown>
    children?: Record<string, { kind: 'list' | 'keyed'; scope: string }>
  }
  /** The `slots` cordis service injected into client plugin contexts. */
  export interface SlotsService {
    register(options: SlotRegistrationOptions, component?: any): { dispose(): void }
    inject(name: string, factory: () => Iterable<{ dispose(): void }> | { dispose(): void }): void
    entries(name: string): Array<{ options: SlotRegistrationOptions; entry: any }>
    subscribe(name: string, listener: () => void): () => void
    getVersion(name: string): number
  }
}

declare module '@deepseek-ai/dsh-client-ui-settings/client' {
  /** Snapshot shape of a bound settings scope (dsh 0.1.2 client contract). */
  export interface SettingsScopeSnapshot {
    status: 'loading' | 'ready' | 'unavailable'
    value?: Record<string, unknown>
    base?: Record<string, unknown>
    user?: Record<string, unknown> | null
    revision?: number
    writable: boolean
    mode: 'host' | 'memory'
  }
  /** A namespace bound through `settingsScope.bind`. */
  export interface SettingsScope {
    getSnapshot(): SettingsScopeSnapshot
    subscribe(listener: () => void): () => void
    set(field: string, value: unknown): Promise<void>
    unset(field: string): Promise<void>
  }
  /** The `settingsScope` cordis service injected into client plugin contexts. */
  export interface SettingsScopeService {
    bind(spec: { namespace: string }): SettingsScope
  }
}

declare module '@deepseek-ai/dsh-client-locale' {
  /** The `locale` cordis service injected into client plugin contexts. */
  export interface LocaleService {
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): void
    bind(namespace: string): (key: string) => string
    getSnapshot(): { revision: number }
    subscribe(listener: () => void): () => void
  }
}
