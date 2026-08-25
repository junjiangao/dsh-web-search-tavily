/**
 * Client face of `@deepseek-ai/dsh-web-search-tavily`.
 *
 * Registers the Tavily card into the settings "plugins" section's
 * configurable tab (`settings.plugin.item`, keyed by the settings namespace),
 * exactly as the official `web-search-deepseek` card is registered by
 * dsh-client-ui-settings-plugins. The card binds the `web-search-tavily`
 * settings namespace through the `settingsScope` service, stages edits in a
 * local form model, and writes them as revision-fenced section mutations on
 * save.
 *
 * This bundle runs inside the DSH Web shell: every import resolves through
 * the shell's static module table or the boot graph (`dsh.client.external`),
 * and the bundle itself is a factory-form module the module loader invokes.
 *
 * All card chrome is drawn with plain elements and CSS variables: the
 * official PluginCard/SecretField/ValueField components are private to
 * dsh-client-ui-settings-plugins and are NOT exported by
 * dsh-client-ui-primitives (only low-level pieces like Button live there).
 */

import { createElement, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { SlotsService } from '@deepseek-ai/dsh-client-ui-slots'
import type { LocaleService } from '@deepseek-ai/dsh-client-locale'
import type { SettingsScope, SettingsScopeService } from '@deepseek-ai/dsh-client-ui-settings'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { FormModel, numberSpec, textSpec } from './form.ts'
import type { FieldSpec, ShellState } from './form.ts'
import { en, LOCALE_NS, zh } from './locales.ts'

/** Cordis plugin name used by loader diagnostics (mirrors the host half). */
export const name = 'web-search-tavily'

/** The settings namespace this card binds. */
export const SETTINGS_NAMESPACE = 'web-search-tavily'

/** Services the client face needs from the shell. */
export const inject = ['slots', 'locale', 'settingsScope', 'connection', 'remote']

/** The settings namespace this card binds. */
interface ClientContext extends Context {
  slots: SlotsService
  locale: LocaleService
  settingsScope: SettingsScopeService
  connection: ConnectionService
  remote: RemoteService
}

/**
 * Minimal wire face of the host credentials domain, mirroring what the
 * official settings cards consume (`connection.api.credentials`): `describe`
 * reports whether a reference resolves (environment variable, credential
 * store, ...) without ever returning its value, and `set` writes a new value.
 */
export interface CredentialView {
  configured: boolean
  writable: boolean
  source?: string
}
export interface CredentialsApi {
  describe(request: { refs: string[] }): Promise<{
    result: { ok: boolean; value: { credentials: Record<string, CredentialView> } }
  }>
  set(request: { ref: string; value: string }): Promise<{
    result: { ok: boolean; value: Record<string, never> }
  }>
}
export interface ConnectionService { api: { credentials: CredentialsApi } }
export interface RemoteService {
  $on(event: string, listener: (payload: string) => void): () => void
}

/** Credential reference the provider resolves when the section names none. */
export const DEFAULT_API_KEY_REF = 'TAVILY_API_KEY'

const SEARCH_DEPTHS = ['ultra-fast', 'fast', 'basic', 'advanced'] as const
const TOPICS = ['general', 'news', 'finance'] as const

/**
 * Staged form fields, in card display order. The key is a credential
 * control: its literal never rides the settings section, the card reports
 * whether the referenced credential resolves (env var, credential store),
 * and a staged value writes through the credentials domain.
 */
const FORM_FIELDS: readonly FieldSpec[] = [
  { kind: 'credential', field: 'apiKey' },
  textSpec('apiKeyEnv'),
  textSpec('baseURL'),
  numberSpec('maxResults'),
  { kind: 'select', field: 'searchDepth' },
  { kind: 'select', field: 'topic' },
  { kind: 'boolean', field: 'includeAnswer' },
  { kind: 'boolean', field: 'includeImages' },
  { kind: 'boolean', field: 'includeRawContent' },
  { kind: 'boolean', field: 'includeFavicon' },
  { kind: 'boolean', field: 'includeUsage' },
]

/** Card snapshot projected from the form model. */
interface TavilyCardState {
  shell: ShellState
  apiKey: ReturnType<FormModel['secretField']>
  apiKeyEnv: ReturnType<FormModel['textField']>
  baseURL: ReturnType<FormModel['textField']>
  maxResults: ReturnType<FormModel['textField']>
  searchDepth: ReturnType<FormModel['selectField']> & { options: readonly string[] }
  topic: ReturnType<FormModel['selectField']> & { options: readonly string[] }
  includeAnswer: ReturnType<FormModel['booleanField']>
  includeImages: ReturnType<FormModel['booleanField']>
  includeRawContent: ReturnType<FormModel['booleanField']>
  includeFavicon: ReturnType<FormModel['booleanField']>
  includeUsage: ReturnType<FormModel['booleanField']>
}

/** Props the slot system injects into the card component. */
interface TavilyCardProps {
  t: (key: string) => string
  useTavilyCard: (selector: (state: TavilyCardState) => unknown) => unknown
  edit: (field: string, text: string) => void
  choose: (field: string, value: unknown, clear: boolean) => void
  toggle: (field: string, checked: boolean, defaultValue: unknown) => void
  resetField: (field: string) => void
  applyRecommended: (values: Record<string, unknown>) => void
  save: () => void
  discard: () => void
}

/**
 * Recommended configuration: the Tavily official defaults, restated
 * explicitly. Chosen deliberately over "aggressive" values because keyless
 * mode (no API key) rate-limits requests and may ignore or downgrade result
 * count, depth, and answer parameters — official defaults behave under both
 * keyed and keyless operation. Applied as staged edits; the user reviews the
 * diff and commits with Save.
 */
const RECOMMENDED_CONFIG: Record<string, unknown> = {
  apiKeyEnv: 'TAVILY_API_KEY',
  searchDepth: 'basic',
  maxResults: 5,
  includeAnswer: false,
  includeImages: false,
  includeRawContent: false,
  includeFavicon: false,
  includeUsage: false,
}

/**
 * Controller: binds the namespace scope, owns the form, and watches the
 * credential the section references — exactly as the official web-search
 * card does. The key state comes from `credentials.describe`, so an exported
 * `TAVILY_API_KEY` (or a credential-store record) reports as configured with
 * no manual setup; a staged key is written through the credentials domain.
 */
class TavilyCardController {
  private readonly scope: SettingsScope
  private readonly api: { credentials: CredentialsApi }
  private readonly form: FormModel
  private readonly store: SnapshotStore<TavilyCardState>
  private credential = { ref: '', configured: false, writable: true }

  constructor(scope: SettingsScope, api: { credentials: CredentialsApi }) {
    this.scope = scope
    this.api = api
    this.form = new FormModel(scope, FORM_FIELDS, {
      configured: () => this.credentialConfigured(),
      write: (value) => this.writeKey(value),
    })
    this.store = this.form.bind(() => this.projection())
    scope.subscribe(() => { void this.readCredential() })
    void this.readCredential()
  }

  private projection(): TavilyCardState {
    return {
      shell: this.form.shell(),
      apiKey: this.form.secretField('apiKey'),
      apiKeyEnv: this.form.textField('apiKeyEnv'),
      baseURL: this.form.textField('baseURL'),
      maxResults: this.form.textField('maxResults'),
      searchDepth: { ...this.form.selectField('searchDepth'), options: [...SEARCH_DEPTHS] },
      topic: { ...this.form.selectField('topic'), options: [...TOPICS] },
      includeAnswer: this.form.booleanField('includeAnswer'),
      includeImages: this.form.booleanField('includeImages'),
      includeRawContent: this.form.booleanField('includeRawContent'),
      includeFavicon: this.form.booleanField('includeFavicon'),
      includeUsage: this.form.booleanField('includeUsage'),
    }
  }

  /** The credential reference the section currently names, or the provider default. */
  private credentialRef(): string {
    const declared = this.scope.getSnapshot().value?.apiKeyEnv
    return typeof declared === 'string' && declared.length > 0 ? declared : DEFAULT_API_KEY_REF
  }

  /**
   * The section's own literal key still counts as configured (the provider
   * honors a literal first), as does a resolved credential behind the
   * reference the section names.
   */
  private credentialConfigured(): boolean {
    const literal = this.scope.getSnapshot().value?.apiKey
    return this.credential.configured || (typeof literal === 'string' && literal.length > 0)
  }

  /**
   * Ask the credentials domain about the reference the section currently
   * names. The answer is stored with the reference it describes: `apiKeyEnv`
   * can change between the request and its response, so a response is
   * published only while it still answers for the reference in force.
   */
  private async readCredential(): Promise<void> {
    const ref = this.credentialRef()
    if (ref !== this.credential.ref) {
      this.credential = { ref, configured: false, writable: true }
      this.store.set(this.projection())
    }
    let response
    try {
      response = await this.api.credentials.describe({ refs: [ref] })
    } catch {
      return
    }
    if (!response.result.ok || ref !== this.credentialRef()) return
    const view = response.result.value.credentials[ref]
    const next = {
      ref,
      configured: view?.configured ?? false,
      writable: view?.writable ?? true,
    }
    if (next.configured === this.credential.configured && next.writable === this.credential.writable) return
    this.credential = next
    this.store.set(this.projection())
  }

  /**
   * Re-read after the host reports a change to the reference this card
   * watches — a key written elsewhere (the Models page addresses the same
   * reference) does not move the settings section, so without this the badge
   * would keep reporting a state the host already replaced.
   */
  refreshCredential(ref: string): void {
    if (ref !== this.credential.ref) return
    void this.readCredential()
  }

  /**
   * Write the staged key through the credentials domain, then re-read
   * whether the host now holds one. The literal never enters the settings
   * document.
   */
  private async writeKey(value: string): Promise<boolean> {
    try {
      const response = await this.api.credentials.set({ ref: this.credentialRef(), value })
      if (!response.result.ok) return false
    } catch {
      return false
    }
    await this.readCredential()
    return this.credentialConfigured()
  }

  /** The face the card's slot registration injects. */
  inject() {
    return {
      hooks: { tavilyCard: this.store },
      ...this.form.actions(),
    }
  }
}

// ---------------------------------------------------------------------------
// Card chrome — plain elements styled with the shell's CSS variables.
// The header follows the official plugin-card pattern: the whole head row is
// one toggle button (title + description + unsaved badge + rotating chevron)
// and the body renders only while expanded.
// ---------------------------------------------------------------------------

const cardStyle: Record<string, string> = {
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  padding: '16px',
  borderRadius: '16px',
  border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.25))',
  background: 'var(--dsw-alias-surface-l2, transparent)',
}
const headerButtonStyle: Record<string, string> = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '2px 4px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  borderRadius: '8px',
  textAlign: 'left',
  fontFamily: 'inherit',
}
const headerHoverStyle: Record<string, string> = {
  background: 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08))',
}
const headTextStyle: Record<string, string> = {
  flex: '1 1 auto',
  minWidth: '0',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}
const cardTitleStyle: Record<string, string> = {
  fontSize: '15px',
  fontWeight: '600',
  color: 'var(--dsw-alias-label-primary, inherit)',
}
const cardDescriptionStyle: Record<string, string> = {
  fontSize: '13px',
  color: 'var(--dsw-alias-label-tertiary, rgba(128,128,128,.8))',
}
const pendingBadgeStyle: Record<string, string> = {
  fontSize: '11px',
  padding: '2px 8px',
  borderRadius: '999px',
  background: 'var(--dsw-alias-accent, #3b82f6)',
  color: 'var(--dsw-alias-label-on-accent, #fff)',
  flex: 'none',
}
const chevronStyle: Record<string, string> = {
  display: 'flex',
  flex: 'none',
  color: 'var(--dsw-alias-label-tertiary, rgba(128,128,128,.8))',
  transition: 'transform .15s ease',
}
const chevronOpenStyle: Record<string, string> = {
  transform: 'rotate(180deg)',
}
const rowStyle: Record<string, string> = {
  padding: '4px 0',
}
const labelStyle: Record<string, string> = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  fontWeight: '500',
  marginBottom: '4px',
  color: 'var(--dsw-alias-label-primary, inherit)',
}
const checkboxLabelStyle: Record<string, string> = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
  color: 'var(--dsw-alias-label-primary, inherit)',
}
const badgeStyle: Record<string, string> = {
  fontSize: '11px',
  padding: '1px 6px',
  borderRadius: '6px',
  background: 'var(--dsw-alias-fill-l2, rgba(128,128,128,.15))',
  color: 'var(--dsw-alias-label-secondary, inherit)',
}
const hintStyle: Record<string, string> = {
  fontSize: '12px',
  color: 'var(--dsw-alias-label-tertiary, rgba(128,128,128,.8))',
  margin: '4px 0 0',
}
const inputStyle: Record<string, string> = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.3))',
  background: 'var(--dsw-alias-input-fill, transparent)',
  color: 'var(--dsw-alias-label-primary, inherit)',
  fontSize: '13px',
  fontFamily: 'inherit',
}
const inputInvalidStyle: Record<string, string> = {
  ...inputStyle,
  borderColor: 'var(--dsw-alias-danger, #e5484d)',
}
const selectStyle: Record<string, string> = {
  ...inputStyle,
  width: '100%',
}
const inputErrorStyle: Record<string, string> = {
  fontSize: '12px',
  color: 'var(--dsw-alias-danger, #e5484d)',
  margin: '4px 0 0',
}
const resetButtonStyle: Record<string, string> = {
  border: 'none',
  background: 'transparent',
  color: 'var(--dsw-alias-label-secondary, rgba(128,128,128,.8))',
  fontSize: '12px',
  cursor: 'pointer',
  padding: '0 4px',
  textDecoration: 'underline',
}
const footerStyle: Record<string, string> = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  paddingTop: '4px',
  borderTop: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.15))',
}
const statusStyle: Record<string, string> = {
  fontSize: '12px',
  color: 'var(--dsw-alias-label-tertiary, rgba(128,128,128,.8))',
  marginRight: 'auto',
}
const noticeStyle: Record<string, string> = {
  fontSize: '12px',
  lineHeight: '1.5',
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid var(--dsw-alias-warning-border, rgba(217,119,6,.4))',
  background: 'var(--dsw-alias-warning-fill, rgba(217,119,6,.1))',
  color: 'var(--dsw-alias-label-secondary, inherit)',
}
const buttonStyle: Record<string, string> = {
  padding: '6px 14px',
  borderRadius: '8px',
  border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.3))',
  background: 'var(--dsw-alias-button-elevated-fill, transparent)',
  color: 'var(--dsw-alias-label-primary, inherit)',
  fontSize: '13px',
  cursor: 'pointer',
}
const buttonPrimaryStyle: Record<string, string> = {
  ...buttonStyle,
  borderColor: 'transparent',
  background: 'var(--dsw-alias-accent, #3b82f6)',
  color: 'var(--dsw-alias-label-on-accent, #fff)',
}
const buttonDisabledStyle: Record<string, string | number> = {
  opacity: 0.5,
  cursor: 'default',
}

/** The card shell: title, description, fields, and the save/discard footer. */
/** Down chevron, drawn inline (primitives icons are not public exports). */
function ChevronIcon() {
  return createElement('svg', {
    width: 14,
    height: 14,
    viewBox: '0 0 16 16',
    fill: 'none',
    'aria-hidden': true,
  },
    createElement('path', {
      d: 'M4 6l4 4 4-4',
      stroke: 'currentColor',
      strokeWidth: 1.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

/** The card shell: a whole-row toggle header (official pattern) + collapsible body. */
function CardShell(props: {
  t: (key: string) => string
  title: string
  description: string
  state: ShellState
  onApplyRecommended: () => void
  onSave: () => void
  onDiscard: () => void
  children: unknown[]
}) {
  const { t, title, description, state, onApplyRecommended, onSave, onDiscard, children } = props
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const saveDisabled = !state.dirty || state.invalid || state.saving || !state.writable
  const discardDisabled = (!state.dirty && !state.failed) || state.saving
  return createElement('li', { style: cardStyle },
    createElement('button', {
      type: 'button',
      style: { ...headerButtonStyle, ...(hovered ? headerHoverStyle : {}) },
      'aria-expanded': open,
      'aria-label': `${t(open ? 'collapse' : 'expand')}: ${title}`,
      onMouseEnter: () => { setHovered(true) },
      onMouseLeave: () => { setHovered(false) },
      onClick: () => { setOpen(!open) },
    },
      createElement('span', { style: headTextStyle },
        createElement('span', { style: cardTitleStyle }, title),
        createElement('span', { style: cardDescriptionStyle }, description),
      ),
      state.dirty
        ? createElement('span', { style: pendingBadgeStyle }, t('unsaved'))
        : null,
      createElement('span', { style: { ...chevronStyle, ...(open ? chevronOpenStyle : {}) } },
        createElement(ChevronIcon, null),
      ),
    ),
    open ? [
      ...children,
      createElement('div', { style: footerStyle },
        state.failed
          ? createElement('span', { style: statusStyle }, t('saveFailed'))
          : createElement('span', { style: statusStyle }, ''),
        createElement('button', {
          type: 'button',
          style: buttonStyle,
          onClick: onApplyRecommended,
        }, t('recommend')),
        createElement('button', {
          type: 'button',
          style: { ...buttonStyle, ...(discardDisabled ? buttonDisabledStyle : {}) },
          disabled: discardDisabled,
          onClick: onDiscard,
        }, t('discard')),
        createElement('button', {
          type: 'button',
          style: { ...buttonPrimaryStyle, ...(saveDisabled ? buttonDisabledStyle : {}) },
          disabled: saveDisabled,
          onClick: onSave,
        }, state.saving ? t('saving') : t('save')),
      ),
    ] : null,
  )
}

/** Text input row (replaces the official ValueField). */
function TextRow(props: {
  id: string
  label: string
  hint: string
  numeric: boolean
  disabled: boolean
  text: string
  overridden: boolean
  invalid: boolean
  t: (key: string) => string
  onEdit: (text: string) => void
  onReset: () => void
}) {
  const { id, label, hint, numeric, disabled, text, overridden, invalid, t, onEdit, onReset } = props
  return createElement('div', { style: rowStyle },
    createElement('label', { htmlFor: id, style: labelStyle },
      label,
      overridden ? createElement('span', { style: badgeStyle }, t('overridden')) : null,
    ),
    createElement('input', {
      id,
      type: numeric ? 'number' : 'text',
      disabled,
      value: text,
      onChange: (event: { target: { value: string } }) => onEdit(event.target.value),
      style: invalid ? inputInvalidStyle : inputStyle,
      'aria-invalid': invalid,
    }),
    invalid ? createElement('p', { style: inputErrorStyle }, t('invalidNumber')) : null,
    hint === '' ? null : createElement('p', { style: hintStyle }, hint),
    overridden
      ? createElement('button', { type: 'button', style: resetButtonStyle, onClick: onReset }, t('reset'))
      : null,
  )
}

/** Secret input row (replaces the official SecretField). */
function SecretRow(props: {
  id: string
  label: string
  hint: string
  disabled: boolean
  text: string
  configured: boolean
  stateLabel: string
  onEdit: (text: string) => void
}) {
  const { id, label, hint, disabled, text, configured, stateLabel, onEdit } = props
  return createElement('div', { style: rowStyle },
    createElement('label', { htmlFor: id, style: labelStyle },
      label,
      createElement('span', { style: badgeStyle }, stateLabel),
    ),
    createElement('input', {
      id,
      type: 'password',
      disabled,
      placeholder: configured ? '••••••••' : '',
      value: text,
      onChange: (event: { target: { value: string } }) => onEdit(event.target.value),
      style: inputStyle,
      autoComplete: 'off',
    }),
    hint === '' ? null : createElement('p', { style: hintStyle }, hint),
  )
}

/** One row of a select control. */
function SelectRow(props: {
  id: string
  label: string
  hint: string
  disabled: boolean
  value: unknown
  options: readonly string[]
  overridden: boolean
  t: (key: string) => string
  onChange: (value: string) => void
}) {
  const { id, label, hint, disabled, value, options, overridden, t, onChange } = props
  return createElement('div', { style: rowStyle },
    createElement('label', { htmlFor: id, style: labelStyle },
      label,
      overridden ? createElement('span', { style: badgeStyle }, t('overridden')) : null,
    ),
    createElement('select', {
      id,
      disabled,
      value: typeof value === 'string' ? value : '',
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      style: selectStyle,
    },
      createElement('option', { value: '' }, ''),
      ...options.map((option) => createElement('option', { key: option, value: option }, option)),
    ),
    hint === '' ? null : createElement('p', { style: hintStyle }, hint),
  )
}

/** One row of a checkbox control. */
function BooleanRow(props: {
  id: string
  label: string
  hint: string
  disabled: boolean
  checked: boolean
  overridden: boolean
  t: (key: string) => string
  onChange: (checked: boolean) => void
}) {
  const { id, label, hint, disabled, checked, overridden, t, onChange } = props
  return createElement('div', { style: rowStyle },
    createElement('label', { htmlFor: id, style: checkboxLabelStyle },
      createElement('input', {
        id,
        type: 'checkbox',
        disabled,
        checked,
        onChange: (event: { target: { checked: boolean } }) => onChange(event.target.checked),
      }),
      createElement('span', null, label),
      overridden ? createElement('span', { style: badgeStyle }, t('overridden')) : null,
    ),
    hint === '' ? null : createElement('p', { style: hintStyle }, hint),
  )
}

/** The Tavily plugin card rendered in the settings "plugins" tab. */
function TavilyCard(props: TavilyCardProps) {
  const { t } = props
  const state = props.useTavilyCard((snapshot) => snapshot) as TavilyCardState
  const disabled = !state.shell.writable
  const shellState = state.shell
  return createElement(CardShell, {
    t,
    title: t('title'),
    description: t('description'),
    state: shellState,
    onApplyRecommended: () => { props.applyRecommended(RECOMMENDED_CONFIG) },
    onSave: props.save,
    onDiscard: props.discard,
    children: [
      state.apiKey.configured
        ? null
        : createElement('div', { style: noticeStyle, role: 'status' }, t('keylessNotice')),
      createElement(SecretRow, {
        id: 'plugin-config-tavily-key',
        label: t('apiKey'),
        hint: t('apiKeyHint'),
        disabled,
        text: state.apiKey.text,
        configured: state.apiKey.configured,
        stateLabel: t(state.apiKey.configured ? 'apiKeySet' : 'apiKeyUnset'),
        onEdit: (text: string) => { props.edit('apiKey', text) },
      }),
      createElement(TextRow, {
        id: 'plugin-config-tavily-env',
        label: t('apiKeyEnv'),
        hint: t('apiKeyEnvHint'),
        numeric: false,
        disabled,
        text: state.apiKeyEnv.text,
        overridden: state.apiKeyEnv.overridden,
        invalid: state.apiKeyEnv.invalid,
        t,
        onEdit: (text: string) => { props.edit('apiKeyEnv', text) },
        onReset: () => { props.resetField('apiKeyEnv') },
      }),
      createElement(TextRow, {
        id: 'plugin-config-tavily-base-url',
        label: t('baseURL'),
        hint: t('baseURLHint'),
        numeric: false,
        disabled,
        text: state.baseURL.text,
        overridden: state.baseURL.overridden,
        invalid: state.baseURL.invalid,
        t,
        onEdit: (text: string) => { props.edit('baseURL', text) },
        onReset: () => { props.resetField('baseURL') },
      }),
      createElement(TextRow, {
        id: 'plugin-config-tavily-max-results',
        label: t('maxResults'),
        hint: t('maxResultsHint'),
        numeric: true,
        disabled,
        text: state.maxResults.text,
        overridden: state.maxResults.overridden,
        invalid: state.maxResults.invalid,
        t,
        onEdit: (text: string) => { props.edit('maxResults', text) },
        onReset: () => { props.resetField('maxResults') },
      }),
      createElement(SelectRow, {
        id: 'plugin-config-tavily-depth',
        label: t('searchDepth'),
        hint: t('searchDepthHint'),
        disabled,
        value: state.searchDepth.value,
        options: state.searchDepth.options,
        overridden: state.searchDepth.overridden,
        t,
        onChange: (value: string) => { props.choose('searchDepth', value, value === '') },
      }),
      createElement(SelectRow, {
        id: 'plugin-config-tavily-topic',
        label: t('topic'),
        hint: t('topicHint'),
        disabled,
        value: state.topic.value,
        options: state.topic.options,
        overridden: state.topic.overridden,
        t,
        onChange: (value: string) => { props.choose('topic', value, value === '') },
      }),
      createElement(BooleanRow, {
        id: 'plugin-config-tavily-answer',
        label: t('includeAnswer'),
        hint: t('includeAnswerHint'),
        disabled,
        checked: state.includeAnswer.checked,
        overridden: state.includeAnswer.overridden,
        t,
        onChange: (checked: boolean) => { props.toggle('includeAnswer', checked, false) },
      }),
      createElement(BooleanRow, {
        id: 'plugin-config-tavily-images',
        label: t('includeImages'),
        hint: t('includeImagesHint'),
        disabled,
        checked: state.includeImages.checked,
        overridden: state.includeImages.overridden,
        t,
        onChange: (checked: boolean) => { props.toggle('includeImages', checked, false) },
      }),
      createElement(BooleanRow, {
        id: 'plugin-config-tavily-raw',
        label: t('includeRawContent'),
        hint: t('includeRawContentHint'),
        disabled,
        checked: state.includeRawContent.checked,
        overridden: state.includeRawContent.overridden,
        t,
        onChange: (checked: boolean) => { props.toggle('includeRawContent', checked, false) },
      }),
      createElement(BooleanRow, {
        id: 'plugin-config-tavily-favicon',
        label: t('includeFavicon'),
        hint: t('includeFaviconHint'),
        disabled,
        checked: state.includeFavicon.checked,
        overridden: state.includeFavicon.overridden,
        t,
        onChange: (checked: boolean) => { props.toggle('includeFavicon', checked, false) },
      }),
      createElement(BooleanRow, {
        id: 'plugin-config-tavily-usage',
        label: t('includeUsage'),
        hint: t('includeUsageHint'),
        disabled,
        checked: state.includeUsage.checked,
        overridden: state.includeUsage.overridden,
        t,
        onChange: (checked: boolean) => { props.toggle('includeUsage', checked, false) },
      }),
    ],
  })
}

/** Register the locale dictionaries and the plugin card. */
export function apply(ctx: ClientContext): void {
  ctx.locale.register(LOCALE_NS, { zh, en })
  const controller = new TavilyCardController(
    ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE }),
    ctx.connection.api,
  )
  ctx.effect(() => ctx.remote.$on('credentials/reference-updated', (ref) => {
    controller.refreshCredential(ref)
  }), 'web-search-tavily: credential invalidation')
  ctx.slots.inject('settings.plugin.item', function* () {
    yield ctx.slots.register({
      name: 'settings.plugin.item',
      key: SETTINGS_NAMESPACE,
      locale: LOCALE_NS,
      inject: () => controller.inject(),
    }, TavilyCard)
  })
}
