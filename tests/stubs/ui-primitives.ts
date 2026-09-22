/**
 * Test stub for `@deepseek-ai/dsh-client-ui-primitives` — the shell's module
 * table resolves the real one. The spec helpers mirror the shipped
 * implementations, and the form model mirrors the shipped staging rules, so
 * the plugin's field table and controller are exercised against the same
 * contract the shell runs.
 */

export type SettingsFormPathOp =
  | { op: 'set'; path: readonly string[]; value: unknown }
  | { op: 'unset'; path: readonly string[] }

export interface SettingsFormScopeSnapshot<T> {
  status: 'loading' | 'ready' | 'unavailable'
  value: T | undefined
  base: unknown
  user: unknown
  writable: boolean
  revision: number | undefined
}

export interface SettingsFormScope<T> {
  getSnapshot(): SettingsFormScopeSnapshot<T>
  subscribe(listener: () => void): () => void
  mutate(ops: readonly SettingsFormPathOp[], expectedRevision?: number): Promise<boolean>
}

export type SettingsFieldWrite = { kind: 'set'; value: unknown } | { kind: 'clear' }

export interface SettingsFieldSpec {
  field: string
  format: (value: unknown) => string
  parse: (text: string) => SettingsFieldWrite | undefined
}

export interface SettingsFieldState {
  text: string
  overridden: boolean
  invalid: boolean
}

export interface SettingsFormShell {
  available: boolean
  writable: boolean
  dirty: boolean
  invalid: boolean
  saving: boolean
  failed: boolean
}

export interface SettingsFormActions {
  edit: (field: string, text: string) => void
  resetField: (field: string) => void
  save: () => void
  discard: () => void
}

interface StagedEdit { text: string; clear: boolean }

export function settingsTextField(field: string): SettingsFieldSpec {
  return {
    field,
    format: value => typeof value === 'string' ? value : '',
    parse: (text) => {
      const trimmed = text.trim()
      return trimmed === '' ? { kind: 'clear' } : { kind: 'set', value: trimmed }
    },
  }
}

export function settingsNumberField(field: string): SettingsFieldSpec {
  return {
    field,
    format: value => typeof value === 'number' ? String(value) : '',
    parse: (text) => {
      const trimmed = text.trim()
      if (trimmed === '') return { kind: 'clear' }
      const value = Number(trimmed)
      return Number.isFinite(value) ? { kind: 'set', value } : undefined
    },
  }
}

/** Staging model mirroring the shipped one for the surface the card uses. */
export class SettingsFormModel<T> {
  private readonly specs: Map<string, SettingsFieldSpec>
  private readonly staged = new Map<string, StagedEdit>()
  private readonly listeners = new Set<() => void>()
  private readonly unsubscribe: () => void

  constructor(private readonly scope: SettingsFormScope<T>, specs: SettingsFieldSpec[]) {
    this.specs = new Map(specs.map(spec => [spec.field, spec]))
    this.unsubscribe = scope.subscribe(() => { this.publish() })
  }

  bind<S>(project: () => S) {
    let snapshot = project()
    const listeners = new Set<() => void>()
    this.listeners.add(() => {
      snapshot = project()
      for (const listener of listeners) listener()
    })
    return {
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
      set: () => {},
    }
  }

  shell(): SettingsFormShell {
    const snapshot = this.scope.getSnapshot()
    const plan = this.plan()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: plan.length > 0,
      invalid: plan.some(item => item.write === undefined && !item.clear),
      saving: false,
      failed: false,
    }
  }

  field(field: string): SettingsFieldState {
    const spec = this.spec(field)
    const staged = this.staged.get(field)
    if (staged === undefined) {
      return { text: spec.format(this.sectionValue(field)), overridden: this.stored(field), invalid: false }
    }
    const write = staged.clear ? { kind: 'clear' as const } : spec.parse(staged.text)
    return { text: staged.text, overridden: write?.kind === 'set', invalid: write === undefined }
  }

  actions(): SettingsFormActions {
    return {
      edit: (field, text) => { this.staged.set(field, { text, clear: false }); this.publish() },
      resetField: (field) => {
        this.staged.set(field, { text: this.spec(field).format(this.baseValue(field)), clear: true })
        this.publish()
      },
      save: () => { void this.save() },
      discard: () => { this.staged.clear(); this.publish() },
    }
  }

  async save(): Promise<void> {
    const plan = this.plan()
    if (!plan.length || !this.scope.getSnapshot().writable) return
    const ops = plan.flatMap(item => item.op === undefined ? [] : [item.op])
    if (ops.length > 0 && !await this.scope.mutate(ops)) return
    this.staged.clear()
    this.publish()
  }

  dispose(): void { this.unsubscribe(); this.listeners.clear() }

  private plan(): Array<{ write?: SettingsFieldWrite; clear: boolean; op?: SettingsFormPathOp }> {
    const plan: Array<{ write?: SettingsFieldWrite; clear: boolean; op?: SettingsFormPathOp }> = []
    for (const [field, staged] of this.staged) {
      const spec = this.spec(field)
      if (staged.clear) {
        if (this.stored(field)) plan.push({ clear: true, op: { op: 'unset', path: [field] } })
        else plan.push({ clear: true })
        continue
      }
      if (staged.text === spec.format(this.sectionValue(field))) continue
      const write = spec.parse(staged.text)
      if (write === undefined) plan.push({ clear: false })
      else if (write.kind === 'clear') plan.push({ clear: true, write, op: { op: 'unset', path: [field] } })
      else plan.push({ clear: false, write, op: { op: 'set', path: [field], value: write.value } })
    }
    return plan
  }

  private spec(field: string): SettingsFieldSpec {
    const spec = this.specs.get(field)
    if (spec === undefined) throw new Error(`plugin card has no field ${field}`)
    return spec
  }

  private sectionValue(field: string): unknown {
    return (this.scope.getSnapshot().value as Record<string, unknown> | undefined)?.[field]
  }

  private baseValue(field: string): unknown {
    return (this.scope.getSnapshot().base as Record<string, unknown> | undefined)?.[field]
  }

  private stored(field: string): boolean {
    const user = this.scope.getSnapshot().user as Record<string, unknown> | undefined
    return user !== undefined && Object.hasOwn(user, field)
  }

  private publish(): void {
    for (const listener of this.listeners) listener()
  }
}

export function SettingsForm(_props: unknown): unknown { return null }
export function SettingsValueField(_props: unknown): unknown { return null }
export function SettingsSecretField(_props: unknown): unknown { return null }
