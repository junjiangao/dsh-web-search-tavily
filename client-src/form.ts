/**
 * Staged form model for the Tavily settings card.
 *
 * Mirrors the official plugin-card form contract (card-form.ts in
 * dsh-client-ui-settings-plugins): the card stages what the user types and
 * writes it only on save; each write is a revision-fenced document mutation;
 * a field shows its effective value and whether the user layer carries it.
 *
 * Unlike the official model this one also drives select and checkbox
 * controls (the section's enums and booleans), so every spec is a small
 * discriminant union instead of the text-only conversion pair.
 */

import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'

/** A control whose value is edited as free text (string or number fields). */
export interface TextSpec {
  kind: 'text'
  field: string
  /** Render the section value for display. */
  format(value: unknown): string
  /**
   * Convert staged text into a write. Returns `{set}` for a value,
   * `{clear}` for an empty draft, `undefined` when the draft is invalid.
   */
  parse(text: string): { set: unknown } | { clear: true } | undefined
}

/** A select control over a fixed option set; an empty selection clears. */
export interface SelectSpec {
  kind: 'select'
  field: string
}

/** A checkbox control for a boolean field; toggling back to the default clears. */
export interface BooleanSpec {
  kind: 'boolean'
  field: string
}

/**
 * A write-only credential control backed by the credentials domain, exactly
 * as the official web-search cards stage their key: the section never carries
 * the literal, the control reports whether the referenced credential resolves
 * (environment variable, credential store, …), and a staged value is written
 * through the domain rather than into the settings document.
 */
export interface CredentialSpec {
  kind: 'credential'
  /** Pseudo-field staged in the form; never a section field. */
  field: string
}

export type FieldSpec = TextSpec | SelectSpec | BooleanSpec | CredentialSpec

/** External credentials-domain hooks powering the credential control. */
export interface CredentialHooks {
  /** Whether the referenced credential resolves (env var, store, literal). */
  configured(): boolean
  /** Whether the credentials domain accepts writes for the reference right now. */
  writable(): boolean
  /**
   * Write the staged value through the credentials domain. A refusal carries
   * the host's own message so the card can surface it verbatim.
   */
  write(value: string): Promise<{ ok: boolean; message?: string | undefined }>
}

/** Snapshot of one control as the card renders it. */
export interface FieldView {
  text: string
  overridden: boolean
  invalid: boolean
}

/** Staged edit: either a concrete value or an explicit clear. */
type Staged =
  | { kind: 'set'; value: unknown }
  | { kind: 'clear' }

const EMPTY_TEXT = ''

/** Render any section or staged value for display; undefined/null read as blank. */
function displayOf(value: unknown): string {
  return value === undefined || value === null ? EMPTY_TEXT : String(value)
}

/** Whole-number conversion: an empty draft clears; anything else must be finite. */
export function numberSpec(field: string): TextSpec {
  return {
    kind: 'text',
    field,
    format: displayOf,
    parse: (text) => {
      const trimmed = text.trim()
      if (trimmed === '') return { clear: true }
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? { set: parsed } : undefined
    },
  }
}

/** Free-text conversion: an empty draft clears the field. */
export function textSpec(field: string): TextSpec {
  return {
    kind: 'text',
    field,
    format: displayOf,
    parse: (text) => text.trim() === '' ? { clear: true } : { set: text },
  }
}

/** The card-level state shared by every plugin card shell. */
export interface ShellState {
  available: boolean
  writable: boolean
  dirty: boolean
  invalid: boolean
  saving: boolean
  failed: boolean
  /** The host's refusal message for the last failed write, when it carried one. */
  failureMessage: string | undefined
}

/** One planned write produced by a save. */
interface PlanItem {
  field: string
  write?: () => Promise<boolean>
}

export class FormModel {
  private readonly scope: SettingsScope
  private readonly specs: ReadonlyMap<string, FieldSpec>
  private readonly credential: CredentialHooks | undefined
  private readonly staged = new Map<string, Staged>()
  private readonly listeners = new Set<() => void>()
  private saving = false
  private failed = false
  private failureMessage: string | undefined

  constructor(scope: SettingsScope, specs: readonly FieldSpec[], credential?: CredentialHooks) {
    this.scope = scope
    this.specs = new Map(specs.map((spec) => [spec.field, spec]))
    this.credential = credential
    scope.subscribe(() => this.publish())
  }

  /** Build a store the card reads through a selector, republished on any change. */
  bind<T>(project: () => T): SnapshotStore<T> {
    const store = createSnapshotStore(project())
    this.listeners.add(() => { store.set(project()) })
    return store
  }

  /** Card-level state: what the host serves and what a save would do. */
  shell(): ShellState {
    const snapshot = this.scope.getSnapshot()
    const plan = this.plan()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: plan.length > 0,
      invalid: plan.some((item) => item.write === undefined),
      saving: this.saving,
      failed: this.failed,
      failureMessage: this.failureMessage,
    }
  }

  /** Text control state for ValueField rendering. */
  textField(field: string): FieldView {
    const staged = this.staged.get(field)
    const spec = this.specOf(field)
    if (spec.kind !== 'text') throw new Error(`web-search-tavily: ${field} is not a text field`)
    if (staged === undefined) {
      return {
        text: spec.format(this.sectionValue(field)),
        overridden: this.stored(field),
        invalid: false,
      }
    }
    if (staged.kind === 'clear') return { text: EMPTY_TEXT, overridden: true, invalid: false }
    // staged values may be raw (recommended batch) or text (typed edits);
    // formatting through the spec renders both identically
    const text = staged.value === undefined ? EMPTY_TEXT : spec.format(staged.value)
    const write = spec.parse(text)
    return {
      text,
      overridden: write !== undefined && !('clear' in write),
      invalid: write === undefined,
    }
  }

  /**
   * Credential control state for the secret field rendering. `writable` is
   * the credentials domain's own answer: a reference supplied by the launch
   * environment is read-only here, exactly as the official cards treat it.
   */
  secretField(field: string): { text: string; configured: boolean; writable: boolean } {
    const spec = this.specOf(field)
    if (spec.kind !== 'credential') throw new Error('web-search-tavily: ' + field + ' is not a credential field')
    const configured = this.credential?.configured() ?? false
    const writable = this.credential?.writable() ?? true
    const staged = this.staged.get(field)
    if (staged === undefined || staged.kind === 'clear') {
      return { text: EMPTY_TEXT, configured, writable }
    }
    const text = typeof staged.value === 'string' ? staged.value : EMPTY_TEXT
    return { text, configured: configured || text.length > 0, writable }
  }

  /** Select control state: the effective option, or undefined when unset. */
  selectField(field: string): { value: unknown; overridden: boolean } {
    const staged = this.staged.get(field)
    if (staged !== undefined && staged.kind === 'set') {
      return { value: staged.value, overridden: true }
    }
    return { value: this.sectionValue(field), overridden: this.stored(field) }
  }

  /** Checkbox control state. */
  booleanField(field: string): { checked: boolean; overridden: boolean } {
    const staged = this.staged.get(field)
    if (staged !== undefined && staged.kind === 'set') {
      return { checked: staged.value === true, overridden: true }
    }
    return { checked: this.sectionValue(field) === true, overridden: this.stored(field) }
  }

  /** The edit/reset/save/discard actions the card's slot entry injects. */
  actions() {
    return {
      edit: (field: string, text: string) => { this.stage(field, { kind: 'set', value: text }) },
      choose: (field: string, value: unknown, clear: boolean) => {
        this.stage(field, clear ? { kind: 'clear' } : { kind: 'set', value })
      },
      toggle: (field: string, checked: boolean, defaultValue: unknown) => {
        this.stage(field, checked === defaultValue ? { kind: 'clear' } : { kind: 'set', value: checked })
      },
      resetField: (field: string) => { this.stage(field, { kind: 'clear' }) },
      /**
       * Stage a batch of recommended values at once. Every value lands in the
       * staged map (the save plan skips ones identical to the section value),
       * so the user sees the full diff before committing.
       */
      applyRecommended: (values: Record<string, unknown>) => {
        for (const [field, value] of Object.entries(values)) {
          this.stage(field, { kind: 'set', value })
        }
      },
      save: () => { void this.save() },
      discard: () => {
        if (this.staged.size === 0 && !this.failed) return
        this.staged.clear()
        this.failed = false
        this.failureMessage = undefined
        this.publish()
      },
    }
  }

  private stage(field: string, edit: Staged) {
    this.staged.set(field, edit)
    this.failed = false
    this.failureMessage = undefined
    this.publish()
  }

  /** Write every staged edit, then re-read what the host accepted. */
  private async save(): Promise<void> {
    const plan = this.plan()
    const writes = plan.flatMap((item) => item.write === undefined ? [] : [item.write])
    if (plan.length === 0 || this.saving || writes.length !== plan.length) return
    this.saving = true
    this.failed = false
    this.failureMessage = undefined
    this.publish()
    let landed = true
    for (const write of writes) landed = await write() && landed
    if (landed) this.staged.clear()
    this.saving = false
    this.failed = !landed
    this.publish()
  }

  /** Every staged edit a save would write; an invalid draft carries no write. */
  private plan(): PlanItem[] {
    const plan: PlanItem[] = []
    for (const [field, staged] of this.staged) {
      const spec = this.specOf(field)
      if (spec.kind === 'credential') {
        // A write-only credential control: only a non-empty staged value
        // writes, through the credentials domain, never into the section.
        // A refusal keeps the host's own message for the card to surface.
        if (staged.kind === 'set' && typeof staged.value === 'string' && staged.value.trim() !== '') {
          const value = staged.value.trim()
          plan.push({ field, write: async () => {
            const result = await this.credential?.write(value) ?? { ok: false }
            if (!result.ok && result.message !== undefined) this.failureMessage = result.message
            return result.ok
          } })
        }
        continue
      }
      if (spec.kind === 'select' || spec.kind === 'boolean') {
        if (staged.kind === 'clear') {
          if (this.stored(field)) plan.push({ field, write: () => this.clear(field) })
          continue
        }
        if (staged.value === this.sectionValue(field)) continue
        plan.push({ field, write: () => this.store(field, staged.value) })
        continue
      }
      if (staged.kind === 'clear') {
        if (this.stored(field)) plan.push({ field, write: () => this.clear(field) })
        continue
      }
      const text = staged.value === undefined ? EMPTY_TEXT : spec.format(staged.value)
      if (text === spec.format(this.sectionValue(field))) continue
      const write = spec.parse(text)
      if (write === undefined) {
        plan.push({ field })
      } else if ('clear' in write) {
        plan.push({ field, write: () => this.clear(field) })
      } else {
        plan.push({ field, write: () => this.store(field, write.set) })
      }
    }
    return plan
  }

  private async store(field: string, value: unknown): Promise<boolean> {
    await this.scope.set(field, value)
    return this.userLayer()?.[field] === value
  }

  private async clear(field: string): Promise<boolean> {
    await this.scope.unset(field)
    return !this.stored(field)
  }

  private publish() {
    for (const listener of this.listeners) listener()
  }

  private specOf(field: string): FieldSpec {
    const spec = this.specs.get(field)
    if (spec === undefined) throw new Error(`web-search-tavily: no field ${field}`)
    return spec
  }

  private snapshot(): SettingsScopeSnapshot {
    return this.scope.getSnapshot()
  }

  private sectionValue(field: string): unknown {
    return this.snapshot().value?.[field]
  }

  private userLayer(): Record<string, unknown> | null | undefined {
    return this.snapshot().user
  }

  private stored(field: string): boolean {
    const user = this.userLayer()
    return user !== undefined && user !== null && field in user
  }
}
