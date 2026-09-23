/**
 * Ambient type declarations for the client bundle's external modules.
 *
 * The bundle runs inside the DSH Web shell, which resolves these specifiers
 * from its frozen module table (`react`, `react/jsx-runtime`,
 * `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-primitives`)
 * at runtime; the plugin repo therefore never installs them. These
 * declarations cover exactly the surface the client code uses — kept minimal
 * on purpose so a drift between the shell's real exports and these shapes
 * fails loudly at the bundle boundary rather than silently inside the plugin.
 */

declare module 'react' {
  export type ReactNode = unknown
  export interface ReactElement { readonly type: unknown; readonly props: unknown }
  export function createElement(type: unknown, props?: unknown, ...children: unknown[]): ReactElement
  export function useState<T>(initial: T): [T, (next: T) => void]
  export function useSyncExternalStore<T>(
    subscribe: (listener: () => void) => () => void,
    getSnapshot: () => T,
  ): T
  const _default: { createElement: typeof createElement }
  export default _default
}

declare module 'react/jsx-runtime' {
  export const Fragment: unknown
  export function jsx(type: unknown, props: unknown, key?: unknown): unknown
  export function jsxs(type: unknown, props: unknown, key?: unknown): unknown
  /**
   * The JSX surface the `react-jsx` transform resolves through its import
   * source. Elements are permissive: the shell owns the real components, and
   * this bundle only composes them.
   */
  export namespace JSX {
    interface IntrinsicAttributes { key?: string | number }
    interface Element { readonly type: unknown; readonly props: unknown }
    interface ElementAttributesProperty { props: unknown }
    interface ElementChildrenAttribute { children: unknown }
    interface IntrinsicElements { [element: string]: Record<string, unknown> }
  }
}

declare module '@deepseek-ai/dsh-client-store' {
  /** Snapshot store shared with React through `useSyncExternalStore`. */
  export interface SnapshotStore<T> {
    getSnapshot(): T
    subscribe(listener: () => void): () => void
    set(value: T): void
  }
}

declare module '@deepseek-ai/dsh-client-ui-primitives' {
  /** One path edit a save sends. */
  export type SettingsFormPathOp =
    | { op: 'set'; path: readonly string[]; value: unknown }
    | { op: 'unset'; path: readonly string[] }
  /** What the model reads of one Host entry's form. */
  export interface SettingsFormScopeSnapshot<T> {
    status: 'loading' | 'ready' | 'unavailable'
    value: T | undefined
    base: unknown
    user: unknown
    writable: boolean
    revision: number | undefined
  }
  /** The entry form the model stages over. */
  export interface SettingsFormScope<T> {
    getSnapshot(): SettingsFormScopeSnapshot<T>
    subscribe(listener: () => void): () => void
    mutate(ops: readonly SettingsFormPathOp[], expectedRevision?: number): Promise<boolean>
  }
  /** The write one field's staged text performs when the card is saved. */
  export type SettingsFieldWrite = { kind: 'set'; value: unknown } | { kind: 'clear' }
  /** How one section field converts between its stored value and its draft text. */
  export interface SettingsFieldSpec {
    field: string
    format: (value: unknown) => string
    parse: (text: string) => SettingsFieldWrite | undefined
  }
  /** One control's staged state. */
  export interface SettingsFieldState {
    text: string
    overridden: boolean
    invalid: boolean
  }
  /** The card-level state every settings card shares. */
  export interface SettingsFormShell {
    available: boolean
    writable: boolean
    dirty: boolean
    invalid: boolean
    saving: boolean
    failed: boolean
  }
  /** The edit, reset, save, and discard actions bound to one form. */
  export interface SettingsFormActions {
    edit: (field: string, text: string) => void
    resetField: (field: string) => void
    save: () => void
    discard: () => void
  }
  /** Copy the form frame renders. */
  export interface SettingsFormLabels {
    unavailable: string
    readOnly: string
    saveFailed: string
    save: string
    saving: string
  }
  /** Props of the form frame. */
  export interface SettingsFormProps {
    labels: SettingsFormLabels
    state: SettingsFormShell
    onSave: () => void
    onDiscard: () => void
    children?: unknown
  }
  /** What every settings field control needs regardless of its value type. */
  export interface SettingsFieldProps {
    id: string
    label: string
    hint: string
    text: string
    overridden: boolean
    invalid: boolean
    overriddenLabel: string
    resetLabel: string
    invalidLabel: string
    disabled: boolean
    onEdit: (text: string) => void
    onReset: () => void
  }
  /** Staged value field props. */
  export interface SettingsValueFieldProps extends Omit<SettingsFieldProps, 'hint'> {
    hint?: string
    numeric?: boolean
    placeholder?: string
  }
  /** Staged secret field props. */
  export interface SettingsSecretFieldProps extends Omit<SettingsFieldProps, 'text' | 'invalid'> {
    text: string
    configured: boolean
    stateLabel: string
  }
  export function SettingsForm(props: SettingsFormProps): import('react/jsx-runtime').JSX.Element
  export function SettingsValueField(props: SettingsValueFieldProps): import('react/jsx-runtime').JSX.Element
  export function SettingsSecretField(props: SettingsSecretFieldProps): import('react/jsx-runtime').JSX.Element
  /** Palette selector of the read-only capsule badge. */
  export type TagTone =
    | 'outline' | 'solid' | 'neutral' | 'quiet' | 'success' | 'info' | 'warning' | 'danger'
  /** Props of the read-only capsule badge. */
  export interface TagProps {
    tone?: TagTone
    className?: string | undefined
    children?: unknown
  }
  export function Tag(props: TagProps): import('react/jsx-runtime').JSX.Element
  /** Props of the two-state toggle. `label` is required: no control ships unnamed. */
  export interface SwitchProps {
    checked: boolean
    onChange: (next: boolean) => void
    label: string
    disabled?: boolean
    title?: string | undefined
    className?: string | undefined
  }
  export function Switch(props: SwitchProps): import('react/jsx-runtime').JSX.Element
  /** Props of every stroke icon in the shared set. */
  export interface IconProps {
    size?: number
    className?: string
  }
  export function IconChevronDownOutlineRegular(props: IconProps): import('react/jsx-runtime').JSX.Element
  export function IconChevronRightOutlineRegular(props: IconProps): import('react/jsx-runtime').JSX.Element
  export function settingsTextField(field: string): SettingsFieldSpec
  export function settingsNumberField(field: string): SettingsFieldSpec
  /** The staged form model behind one plugin's settings page. */
  export class SettingsFormModel<T> {
    constructor(scope: SettingsFormScope<T>, specs: SettingsFieldSpec[])
    bind<S>(project: () => S): SnapshotStore<S>
    shell(): SettingsFormShell
    field(field: string): SettingsFieldState
    actions(): SettingsFormActions
    dispose(): void
  }
}
