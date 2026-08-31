/**
 * Client face of `@junjiangao/dsh-web-search-tavily`.
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
 * the shell's static module table (`react`, primitives, the client store) or
 * the boot graph, and the bundle itself is a factory-form module the module
 * loader invokes.
 *
 * Card chrome mirrors the official plugin-card exactly: the disclosure
 * header (title + description + unsaved badge + the native 14px primitives
 * chevron) and every style value are lifted 1:1 from the official
 * PluginCard.module.css / fields.module.css into a scoped stylesheet, so the
 * card reads as a native part of the settings tab. The official
 * PluginCard/SecretField/ValueField components themselves are private to
 * dsh-client-ui-settings-plugins; only the primitives icon is a public
 * shell export.
 */

import { createElement, useEffect, useRef, useState } from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '@deepseek-ai/cordis'
import type { SlotsService } from '@deepseek-ai/dsh-client-ui-slots'
import type { LocaleService } from '@deepseek-ai/dsh-client-locale'
import type { SettingsScope, SettingsScopeService } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { FormModel, numberSpec, textSpec } from './form.ts'
import type { FieldSpec, ShellState } from './form.ts'
import { en, LOCALE_NS, zh } from './locales.ts'

/** Cordis plugin name used by loader diagnostics (mirrors the host half). */
export const name = 'web-search-tavily'

/** The settings namespace this card binds. */
export const SETTINGS_NAMESPACE = 'web-search-tavily'

/**
 * Services the client face needs from the shell. dsh 0.1.2 mounts the
 * credentials domain as the `remote.credentials` namespace (typed subservice
 * of the `remote` assembly); it mounts asynchronously, so the access itself
 * is probed per call, never assumed at activation.
 */
export const inject = ['slots', 'locale', 'settingsScope', 'remote', 'remote.credentials']

/** The settings namespace this card binds. */
interface ClientContext extends Context {
  slots: SlotsService
  locale: LocaleService
  settingsScope: SettingsScopeService
  remote: RemoteService
}

/**
 * Per-reference credential state the credentials remote reports; the literal
 * value never rides the wire (`@deepseek-ai/dsh-credentials` `CredentialInfo`).
 */
export interface CredentialView {
  configured: boolean
  writable: boolean
  source?: string
}

/**
 * Normalized credentials face the controller consumes: the deployment's
 * `remote.credentials` namespace, positional arguments, RemoteResult envelope.
 * The adapter never throws — every failure (transport or business) comes back
 * as `{ ok: false, message? }` so the card can surface the host's own refusal
 * text.
 */
export interface CredentialsFace {
  describe(refs: string[]): Promise<{
    ok: boolean
    views?: Record<string, CredentialView> | undefined
    message?: string | undefined
  }>
  set(ref: string, value: string): Promise<{ ok: boolean; message?: string | undefined }>
}

/**
 * Wire face of dsh 0.1.2+ deployments (`remote.credentials`): positional
 * arguments and the RemoteResult envelope. The namespace mounts
 * asynchronously, so the access itself can answer `undefined` for a while.
 */
export interface ModernCredentialsApi {
  describe(refs: string[]): Promise<
    { ok: true; value?: Record<string, CredentialView> } | { ok: false; error?: { message?: string } }
  >
  set(ref: string, value: string): Promise<{ ok: true } | { ok: false; error?: { message?: string } }>
}
export interface RemoteService {
  credentials?: ModernCredentialsApi
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
 * Credential-read retry pacing: the remote assembly mounts the credentials
 * namespace asynchronously, so the first read can race it. Failed reads
 * back off exponentially and stop once the read lands or attempts run out.
 */
const READ_RETRY_DELAY_MS = 1000
const READ_RETRY_MAX_ATTEMPTS = 6

/** Normalize an RPC failure to the adapter's result, honoring exact optionality. */
function refusal(message: string | undefined): { ok: false; message?: string } {
  return message === undefined ? { ok: false } : { ok: false, message }
}

/**
 * Controller: binds the namespace scope, owns the form, and watches the
 * credential the section references — the same domain the official
 * web-search card consumes on dsh 0.1.2 (`remote.credentials`: positional
 * arguments, RemoteResult envelope). The face resolves per call because the
 * namespace mounts asynchronously, possibly after this plugin activates. The
 * key state comes from `credentials.describe` — a key stored in the
 * credential store, a launch-environment export, or a stored literal all
 * report as configured; a staged key is written through the credentials
 * domain.
 */
export class TavilyCardController {
  private readonly scope: SettingsScope
  private readonly credentialsFace: () => ModernCredentialsApi | undefined
  private readonly retry: { delayMs: number; maxAttempts: number }
  private readonly form: FormModel
  private readonly store: SnapshotStore<TavilyCardState>
  private credential = { ref: '', configured: false, writable: true }
  private readTimer: ReturnType<typeof setTimeout> | undefined

  constructor(
    scope: SettingsScope,
    credentialsFace: () => ModernCredentialsApi | undefined,
    retry: { delayMs: number; maxAttempts: number } = {
      delayMs: READ_RETRY_DELAY_MS, maxAttempts: READ_RETRY_MAX_ATTEMPTS,
    },
  ) {
    this.scope = scope
    this.credentialsFace = credentialsFace
    this.retry = retry
    this.form = new FormModel(scope, FORM_FIELDS, {
      configured: () => this.credentialConfigured(),
      writable: () => this.credential.writable,
      write: (value) => this.writeKey(value),
    })
    this.store = this.form.bind(() => this.projection())
    scope.subscribe(() => { void this.readCredential() })
    void this.readCredential()
  }

  /**
   * Normalize `remote.credentials` onto {@link CredentialsFace}. The adapter
   * never throws: every failure — transport or business — comes back as
   * `{ ok: false, message? }`, so the card can surface the host's own refusal
   * text.
   */
  private resolveFace(): CredentialsFace | undefined {
    const modern = this.credentialsFace()
    if (modern === undefined) return undefined
    return {
      describe: async (refs) => {
        try {
          const response = await modern.describe(refs)
          return response.ok
            ? { ok: true, views: response.value }
            : refusal(response.error?.message)
        } catch (error) {
          return refusal(error instanceof Error ? error.message : String(error))
        }
      },
      set: async (ref, value) => {
        try {
          const response = await modern.set(ref, value)
          return response.ok ? { ok: true } : refusal(response.error?.message)
        } catch (error) {
          return refusal(error instanceof Error ? error.message : String(error))
        }
      },
    }
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
   * published only while it still answers for the reference in force. A read
   * that cannot land — the namespace not mounted yet, a transport failure, a
   * host refusal — is retried with backoff rather than silently leaving the
   * card keyless forever.
   */
  private async readCredential(attempt = 0): Promise<void> {
    clearTimeout(this.readTimer)
    this.readTimer = undefined
    const ref = this.credentialRef()
    if (ref !== this.credential.ref) {
      this.credential = { ref, configured: false, writable: true }
      this.store.set(this.projection())
    }
    const face = this.resolveFace()
    let response
    try {
      response = await face?.describe([ref])
    } catch {
      response = undefined
    }
    if (face === undefined || response === undefined || !response.ok || ref !== this.credentialRef()) {
      this.scheduleReadRetry(attempt)
      return
    }
    const view = response.views?.[ref]
    const next = {
      ref,
      configured: view?.configured ?? false,
      writable: view?.writable ?? true,
    }
    if (next.configured === this.credential.configured && next.writable === this.credential.writable) return
    this.credential = next
    this.store.set(this.projection())
  }

  /** Re-read after a delay; bounded so a permanently absent face stops soon. */
  private scheduleReadRetry(attempt: number): void {
    if (attempt >= this.retry.maxAttempts) return
    clearTimeout(this.readTimer)
    this.readTimer = setTimeout(() => {
      void this.readCredential(attempt + 1)
    }, this.retry.delayMs * 2 ** attempt)
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
   * document. A refusal surfaces the host's own message verbatim — for
   * instance the launch-environment shadow refusal — instead of a generic
   * save-failure line.
   */
  private async writeKey(value: string): Promise<{ ok: boolean; message?: string | undefined }> {
    const face = this.resolveFace()
    if (face === undefined) return { ok: false }
    const result = await face.set(this.credentialRef(), value)
    if (!result.ok) return { ok: false, message: result.message }
    await this.readCredential()
    return { ok: this.credentialConfigured() }
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
// Card chrome — a 1:1 mirror of the official plugin-card. The official
// PluginCard/SecretField/ValueField components and their CSS modules are
// private to dsh-client-ui-settings-plugins, so the values below are lifted
// verbatim from PluginCard.module.css and fields.module.css under a
// `tavily-` class prefix, injected once per card. The chevron is the native
// primitives icon the official cards render.
// ---------------------------------------------------------------------------

const CARD_CSS = `
.tavily-card { list-style: none; border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; background: var(--dsw-alias-bg-layer-3); transition: border-color .16s, background .16s; }
.tavily-card:hover { border-color: var(--dsw-alias-label-dimmed); }
.tavily-cardOpen { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-label-dimmed); }
.tavily-header { width: 100%; appearance: none; border: 0; background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; }
.tavily-header:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.tavily-headText { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.tavily-name { font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary); }
.tavily-description { font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.tavily-chevron { flex: none; color: var(--dsw-alias-label-tertiary); transition: transform .16s; }
.tavily-chevronOpen { transform: rotate(180deg); }
.tavily-body { border-top: 1px solid var(--dsw-alias-border-l2); margin: 0 16px; padding-bottom: 8px; }
.tavily-readOnly { margin: 12px 0 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.tavily-pending { flex: none; border-radius: 999px; padding: 1px 8px; font-size: 11px; line-height: 17px; font-weight: 500; white-space: nowrap; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-secondary); }
.tavily-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 12px 0 4px; border-top: 1px solid var(--dsw-alias-border-l2); }
.tavily-failed { flex: 1; min-width: 0; margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-error); }
.tavily-recommend, .tavily-discard, .tavily-save { appearance: none; border: 1px solid transparent; border-radius: 8px; padding: 5px 14px; font: inherit; font-size: 13px; line-height: 1.5; cursor: pointer; }
.tavily-recommend, .tavily-discard { border-color: var(--dsw-alias-border-l2); background: none; color: var(--dsw-alias-label-secondary); }
.tavily-recommend:hover:not(:disabled), .tavily-discard:hover:not(:disabled) { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-label-dimmed); }
.tavily-save { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-3); }
.tavily-recommend:disabled, .tavily-discard:disabled, .tavily-save:disabled { opacity: 0.4; cursor: default; }
.tavily-recommend:focus-visible, .tavily-discard:focus-visible, .tavily-save:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.tavily-field { display: flex; flex-direction: column; gap: 6px; padding: 12px 0; }
.tavily-field + .tavily-field { border-top: 1px solid var(--dsw-alias-border-l2); }
.tavily-head { display: flex; align-items: center; gap: 8px; }
.tavily-label { flex: 1; min-width: 0; font-size: 13px; font-weight: 500; line-height: 1.5; color: var(--dsw-alias-label-primary); }
.tavily-badges { display: inline-flex; align-items: center; gap: 8px; }
.tavily-badge { border-radius: 999px; padding: 1px 8px; font-size: 11px; line-height: 17px; white-space: nowrap; font-weight: 500; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-secondary); }
.tavily-badgeMuted { border-radius: 999px; padding: 1px 8px; font-size: 11px; line-height: 17px; white-space: nowrap; color: var(--dsw-alias-label-tertiary); }
.tavily-reset { border: none; background: none; padding: 0; font: inherit; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.tavily-reset:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
.tavily-reset:disabled { cursor: default; }
.tavily-input { height: 34px; padding: 0 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-3); font: inherit; font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-primary); }
.tavily-input:focus-visible { outline: none; border-color: var(--dsw-alias-brand-primary); }
.tavily-input:disabled { color: var(--dsw-alias-label-tertiary); cursor: default; }
.tavily-inputInvalid { border-color: var(--dsw-alias-label-error); }
.tavily-invalid { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-error); }
.tavily-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.tavily-checkbox { flex: none; width: 14px; height: 14px; margin: 0; accent-color: var(--dsw-alias-brand-primary); cursor: pointer; }
.tavily-checkbox:disabled { cursor: default; }
.tavily-notice { margin: 12px 0 0; font-size: 12px; line-height: 1.5; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-warning-border, rgba(217,119,6,.4)); background: var(--dsw-alias-warning-fill, rgba(217,119,6,.1)); color: var(--dsw-alias-label-secondary); }
`

/**
 * The card shell, mirroring the official PluginCard: a whole-row toggle
 * header, a body that renders only while expanded, and a save/discard
 * footer. Collapse follows the official behavior — a card closes itself
 * after the Host confirms a save, while a rejected write keeps its
 * diagnostics and retained drafts visible. The recommend button is this
 * card's one addition and takes the discard (secondary) styling.
 */
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
  const saveStarted = useRef(false)
  useEffect(() => {
    if (state.saving) {
      saveStarted.current = true
      return
    }
    if (!saveStarted.current) return
    saveStarted.current = false
    if (!state.dirty && !state.failed) setOpen(false)
  }, [state.dirty, state.failed, state.saving])
  if (!state.available) return null
  const blocked = !state.dirty || state.invalid || state.saving
  return createElement('li', { className: `tavily-card${open ? ' tavily-cardOpen' : ''}` },
    createElement('style', null, CARD_CSS),
    createElement('button', {
      type: 'button',
      className: 'tavily-header',
      'aria-expanded': open,
      'aria-label': `${t(open ? 'collapse' : 'expand')}: ${title}`,
      onClick: () => { setOpen(!open) },
    },
      createElement('span', { className: 'tavily-headText' },
        createElement('span', { className: 'tavily-name' }, title),
        createElement('span', { className: 'tavily-description' }, description),
      ),
      state.dirty
        ? createElement('span', { className: 'tavily-pending' }, t('unsaved'))
        : null,
      createElement(IconChevronDownOutline14, {
        className: `tavily-chevron${open ? ' tavily-chevronOpen' : ''}`,
      }),
    ),
    open
      ? createElement('div', { className: 'tavily-body' },
        !state.writable
          ? createElement('p', { className: 'tavily-readOnly', role: 'status' }, t('readOnly'))
          : null,
        ...children,
        createElement('div', { className: 'tavily-footer' },
          state.failed
            ? createElement('p', { className: 'tavily-failed', role: 'status' },
              state.failureMessage ?? t('saveFailed'))
            : null,
          createElement('button', {
            type: 'button',
            className: 'tavily-recommend',
            onClick: onApplyRecommended,
          }, t('recommend')),
          createElement('button', {
            type: 'button',
            className: 'tavily-discard',
            disabled: !state.dirty || state.saving,
            onClick: onDiscard,
          }, t('discard')),
          createElement('button', {
            type: 'button',
            className: 'tavily-save',
            disabled: blocked,
            onClick: onSave,
          }, state.saving ? t('saving') : t('save')),
        ),
      )
      : null,
  )
}

/** Text input row, mirroring the official ValueField. */
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
  return createElement('div', { className: 'tavily-field' },
    createElement('div', { className: 'tavily-head' },
      createElement('label', { className: 'tavily-label', htmlFor: id }, label),
      overridden
        ? createElement('span', { className: 'tavily-badges' },
          createElement('span', { className: 'tavily-badge' }, t('overridden')),
          createElement('button', {
            type: 'button',
            className: 'tavily-reset',
            disabled,
            onClick: onReset,
          }, t('reset')),
        )
        : null,
    ),
    createElement('input', {
      id,
      className: invalid ? 'tavily-input tavily-inputInvalid' : 'tavily-input',
      type: 'text',
      ...(numeric ? { inputMode: 'numeric' as const } : {}),
      ...(invalid ? { 'aria-invalid': 'true' } : {}),
      value: text,
      disabled,
      onChange: (event: { target: { value: string } }) => onEdit(event.target.value),
    }),
    createElement('p', { className: invalid ? 'tavily-invalid' : 'tavily-hint' },
      invalid ? t('invalidNumber') : hint),
  )
}

/** Secret input row, mirroring the official SecretField. */
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
  return createElement('div', { className: 'tavily-field' },
    createElement('div', { className: 'tavily-head' },
      createElement('label', { className: 'tavily-label', htmlFor: id }, label),
      createElement('span', { className: 'tavily-badges' },
        createElement('span', { className: configured ? 'tavily-badge' : 'tavily-badgeMuted' }, stateLabel),
      ),
    ),
    createElement('input', {
      id,
      className: 'tavily-input',
      type: 'password',
      autoComplete: 'off',
      value: text,
      disabled,
      onChange: (event: { target: { value: string } }) => onEdit(event.target.value),
    }),
    createElement('p', { className: 'tavily-hint' }, hint),
  )
}

/** One row of a select control, styled as an official field. */
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
  return createElement('div', { className: 'tavily-field' },
    createElement('div', { className: 'tavily-head' },
      createElement('label', { className: 'tavily-label', htmlFor: id }, label),
      overridden
        ? createElement('span', { className: 'tavily-badges' },
          createElement('span', { className: 'tavily-badge' }, t('overridden')),
        )
        : null,
    ),
    createElement('select', {
      id,
      className: 'tavily-input',
      disabled,
      value: typeof value === 'string' ? value : '',
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    },
      createElement('option', { value: '' }, ''),
      ...options.map((option) => createElement('option', { key: option, value: option }, option)),
    ),
    createElement('p', { className: 'tavily-hint' }, hint),
  )
}

/** One row of a checkbox control, styled as an official field. */
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
  return createElement('div', { className: 'tavily-field' },
    createElement('div', { className: 'tavily-head' },
      createElement('input', {
        id,
        type: 'checkbox',
        className: 'tavily-checkbox',
        disabled,
        checked,
        onChange: (event: { target: { checked: boolean } }) => onChange(event.target.checked),
      }),
      createElement('label', { className: 'tavily-label', htmlFor: id }, label),
      overridden
        ? createElement('span', { className: 'tavily-badges' },
          createElement('span', { className: 'tavily-badge' }, t('overridden')),
        )
        : null,
    ),
    createElement('p', { className: 'tavily-hint' }, hint),
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
        : createElement('div', { className: 'tavily-notice', role: 'status' }, t('keylessNotice')),
      createElement(SecretRow, {
        id: 'plugin-config-tavily-key',
        label: t('apiKey'),
        hint: t('apiKeyHint'),
        // The credentials domain accepts a key even when the settings document
        // itself is read-only; they are separate stores with separate
        // refusals. Its own writability is what disables this control — a key
        // sourced from the launch environment cannot be written from here
        // (the official web-search card gates on exactly this).
        disabled: !state.apiKey.writable,
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
    // The credentials namespace mounts asynchronously after this plugin
    // activates, so the access resolves per call rather than at apply time.
    () => ctx.remote.credentials,
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
