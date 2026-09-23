/**
 * The controls the shared settings primitives do not ship for this card: a
 * boolean row built on the shell's own `Switch`, and an enum select.
 *
 * Both stage text exactly like the native fields — they never write — so one
 * save covers the whole card. Presentation comes from {@link TAVILY_CSS} and
 * from the primitives' own module CSS, never from inline styles, so a row here
 * keeps the shell's spacing, hairline dividers, and token palette.
 */

import { Switch, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ReactNode } from 'react'
import { TAVILY_CLASS } from './styles.ts'

/** Props shared by the card's own controls. */
export interface TavilyControlProps {
  /** Stable id associating the label with its control. */
  readonly id: string
  /** Visible label. */
  readonly label: string
  /** One-line explanation rendered under the control. */
  readonly hint: string
  /** True when saving would leave a user-layer entry for this field. */
  readonly overridden: boolean
  /** Copy for the overridden badge. */
  readonly overriddenLabel: string
  /** Copy for the reset control. */
  readonly resetLabel: string
  /** Disables the control (read-only document, a locked dependency, or an unavailable namespace). */
  readonly disabled: boolean
  /** Stage a clear so the field re-inherits the composition layer. */
  readonly onReset: () => void
}

/**
 * Wrap one field in the row that carries the shell's hairline divider. The
 * shell's own field chrome adds `border-top` only between two of its own
 * fields, so every row of this card — native field or custom control — is
 * wrapped here and the divider comes from the wrapper instead.
 * @param props.children - the field's control.
 * @returns the row.
 */
export function TavilyRow(props: { readonly children?: ReactNode }) {
  return <div className={TAVILY_CLASS.row}>{props.children}</div>
}

/** The overridden badge and its reset, as the shared field renders them. */
function Override(props: TavilyControlProps) {
  if (!props.overridden) return null
  return (
    <span className={TAVILY_CLASS.badges}>
      <Tag tone="neutral">{props.overriddenLabel}</Tag>
      <button type="button" className={TAVILY_CLASS.reset} disabled={props.disabled} onClick={props.onReset}>
        {props.resetLabel}
      </button>
    </span>
  )
}

/**
 * Render one boolean field as a labelled row with the shell's switch: the copy
 * sits on the left and the control on the right, so the state reads without
 * hunting for a checkbox glyph.
 * @param props - the field's copy, its draft, and the staged state.
 * @returns the toggle row.
 */
export function TavilyToggleField(props: TavilyControlProps & {
  /** Current draft: true or false. */
  readonly checked: boolean
  /** Stage the next draft. */
  readonly onToggle: (next: boolean) => void
}) {
  return (
    <div className={TAVILY_CLASS.field}>
      <div className={TAVILY_CLASS.toggle}>
        <div className={TAVILY_CLASS.toggleText}>
          {/* Not a `<label>`: the switch carries its own accessible name and
              has no id to point one at. */}
          <span className={TAVILY_CLASS.label}>{props.label}</span>
          {props.hint === '' ? null : <p className={TAVILY_CLASS.hint}>{props.hint}</p>}
        </div>
        <Switch
          checked={props.checked}
          disabled={props.disabled}
          label={props.label}
          title={props.disabled ? props.hint : undefined}
          onChange={props.onToggle}
        />
      </div>
      <Override {...props} />
    </div>
  )
}

/**
 * Render one enum field as a select. The empty option is named rather than a
 * bare dash — a screen reader announces an unnamed one as "a choice with no
 * identity" — and it appears only while the draft is empty, so the control
 * never claims a value the section does not carry. Clearing a set value is the
 * shared reset control's job, which is what the overridden badge offers.
 * @param props - the field's copy, its draft, and the staged state.
 * @returns the select row.
 */
export function TavilySelectField(props: TavilyControlProps & {
  /** Current draft, empty when the section carries no value. */
  readonly value: string
  /** Selectable members, in render order. */
  readonly options: readonly string[]
  /** Copy of the empty option. */
  readonly unsetLabel: string
  /** Stage the chosen member. */
  readonly onSelect: (next: string) => void
}) {
  return (
    <div className={TAVILY_CLASS.field}>
      <div className={TAVILY_CLASS.head}>
        <label className={TAVILY_CLASS.label} htmlFor={props.id}>{props.label}</label>
        <Override {...props} />
      </div>
      <select
        id={props.id}
        className={TAVILY_CLASS.select}
        value={props.value}
        disabled={props.disabled}
        onChange={(event: { target: { value: string } }) => { props.onSelect(event.target.value) }}
      >
        {props.value === '' ? <option value="">{props.unsetLabel}</option> : null}
        {props.options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {props.hint === '' ? null : <p className={TAVILY_CLASS.hint}>{props.hint}</p>}
    </div>
  )
}

/**
 * Render the resolved credential's state beside the reference it was resolved
 * from, so the key path is one row instead of a floating status line.
 * @param props - the configured flag, the reference, and this plugin's copy.
 * @returns the status row.
 */
export function TavilyCredentialStatus(props: {
  /** Whether the Host reports a configured credential for the reference. */
  readonly configured: boolean
  /** The reference the answer describes. */
  readonly ref: string
  /** Copy for the configured state. */
  readonly configuredLabel: string
  /** Copy for the unconfigured state. */
  readonly unsetLabel: string
}) {
  return (
    <div className={TAVILY_CLASS.status} data-plugin-credential-status>
      <Tag tone={props.configured ? 'success' : 'quiet'}>
        {props.configured ? props.configuredLabel : props.unsetLabel}
      </Tag>
      <code className={TAVILY_CLASS.statusRef}>{props.ref}</code>
    </div>
  )
}
