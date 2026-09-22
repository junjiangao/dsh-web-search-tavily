/**
 * The two controls the shared settings primitives do not ship: a boolean
 * switch and an enum select. Both stage text exactly like the native fields —
 * they never write — so one save covers the whole card.
 *
 * Styling is inline: the bundle carries no stylesheet, and every native
 * field's own styles come from the shell's primitives module.
 */

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
  /** Disables the control (read-only document, or an unavailable namespace). */
  readonly disabled: boolean
  /** Stage a clear so the field re-inherits the composition layer. */
  readonly onReset: () => void
}

const rowStyle = { display: 'flex', flexDirection: 'column' as const, gap: '4px', margin: '0 0 14px' }
const headStyle = { display: 'flex', alignItems: 'center', gap: '8px' }
const labelStyle = { fontSize: '13px', fontWeight: 500 }
const hintStyle = { fontSize: '12px', opacity: 0.7, margin: 0 }
const badgeStyle = { fontSize: '11px', opacity: 0.7, border: '1px solid currentColor', borderRadius: '999px', padding: '0 6px' }
const linkStyle = { fontSize: '12px', background: 'none', border: 'none', padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }

/** Render one boolean field as a switch. */
export function TavilyToggleField(props: TavilyControlProps & {
  /** Current draft: true, false, or unset. */
  readonly checked: boolean
  /** Stage the next draft. */
  readonly onToggle: (next: boolean) => void
}) {
  return (
    <div style={rowStyle}>
      <div style={headStyle}>
        <label style={labelStyle} htmlFor={props.id}>{props.label}</label>
        {props.overridden ? <span style={badgeStyle}>{props.overriddenLabel}</span> : null}
        {props.overridden
          ? <button type="button" style={linkStyle} disabled={props.disabled} onClick={props.onReset}>{props.resetLabel}</button>
          : null}
      </div>
      <input
        id={props.id}
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event: { target: { checked: boolean } }) => { props.onToggle(event.target.checked) }}
      />
      {props.hint === '' ? null : <p style={hintStyle}>{props.hint}</p>}
    </div>
  )
}

/** Render one enum field as a select. */
export function TavilySelectField(props: TavilyControlProps & {
  /** Current draft, empty when the section carries no value. */
  readonly value: string
  /** Selectable members, in render order. */
  readonly options: readonly string[]
  /** Stage the chosen member. */
  readonly onSelect: (next: string) => void
}) {
  return (
    <div style={rowStyle}>
      <div style={headStyle}>
        <label style={labelStyle} htmlFor={props.id}>{props.label}</label>
        {props.overridden ? <span style={badgeStyle}>{props.overriddenLabel}</span> : null}
        {props.overridden
          ? <button type="button" style={linkStyle} disabled={props.disabled} onClick={props.onReset}>{props.resetLabel}</button>
          : null}
      </div>
      <select
        id={props.id}
        value={props.value}
        disabled={props.disabled}
        onChange={(event: { target: { value: string } }) => { props.onSelect(event.target.value) }}
      >
        <option value="">—</option>
        {props.options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {props.hint === '' ? null : <p style={hintStyle}>{props.hint}</p>}
    </div>
  )
}
