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
 */

import { createElement } from 'react'
import { Fragment } from 'react/jsx-runtime'
import type { Context } from '@deepseek-ai/cordis'
import type { SlotsService } from '@deepseek-ai/dsh-client-ui-slots'
import type { LocaleService } from '@deepseek-ai/dsh-client-locale'
import type { SettingsScope, SettingsScopeService } from '@deepseek-ai/dsh-client-ui-settings'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { PluginCard, SecretField, ValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  PluginCardProps,
  SecretFieldProps,
  ValueFieldProps,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { FormModel, numberSpec, textSpec } from './form.ts'
import type { FieldSpec } from './form.ts'
import { en, LOCALE_NS, zh } from './locales.ts'

/** Cordis plugin name used by loader diagnostics (mirrors the host half). */
export const name = 'web-search-tavily'

/** The settings namespace this card binds. */
export const SETTINGS_NAMESPACE = 'web-search-tavily'

/** Services the client face needs from the shell. */
export const inject = ['slots', 'locale', 'settingsScope']

/** The settings namespace this card binds. */
interface ClientContext extends Context {
  slots: SlotsService
  locale: LocaleService
  settingsScope: SettingsScopeService
}

const SEARCH_DEPTHS = ['ultra-fast', 'fast', 'basic', 'advanced'] as const
const TOPICS = ['general', 'news', 'finance'] as const

/** Staged form fields, in card display order. */
const FORM_FIELDS: readonly FieldSpec[] = [
  { kind: 'secret', field: 'apiKey' },
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
  shell: ReturnType<FormModel['shell']>
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
  save: () => void
  discard: () => void
}

/** Controller: binds the namespace scope, owns the form, feeds the card. */
class TavilyCardController {
  private readonly form: FormModel
  private readonly store: SnapshotStore<TavilyCardState>

  constructor(scope: SettingsScope) {
    this.form = new FormModel(scope, FORM_FIELDS)
    this.store = this.form.bind(() => this.projection())
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

  /** The face the card's slot registration injects. */
  inject() {
    return {
      hooks: { tavilyCard: this.store },
      ...this.form.actions(),
    }
  }
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
  const pluginCardProps: PluginCardProps = {
    t,
    titleKey: 'title',
    descriptionKey: 'description',
    state: state.shell,
    onSave: props.save,
    onDiscard: props.discard,
    children: createElement(Fragment, null,
      createElement(SecretField, {
        id: 'plugin-config-tavily-key',
        label: t('apiKey'),
        hint: t('apiKeyHint'),
        disabled,
        text: state.apiKey.text,
        configured: state.apiKey.configured,
        stateLabel: t(state.apiKey.configured ? 'apiKeySet' : 'apiKeyUnset'),
        onEdit: (text: string) => { props.edit('apiKey', text) },
      } satisfies SecretFieldProps),
      createElement(ValueField, {
        id: 'plugin-config-tavily-env',
        label: t('apiKeyEnv'),
        hint: t('apiKeyEnvHint'),
        overriddenLabel: t('overridden'),
        resetLabel: t('reset'),
        invalidLabel: t('invalidNumber'),
        disabled,
        ...state.apiKeyEnv,
        onEdit: (text: string) => { props.edit('apiKeyEnv', text) },
        onReset: () => { props.resetField('apiKeyEnv') },
      } satisfies ValueFieldProps),
      createElement(ValueField, {
        id: 'plugin-config-tavily-base-url',
        label: t('baseURL'),
        hint: t('baseURLHint'),
        overriddenLabel: t('overridden'),
        resetLabel: t('reset'),
        invalidLabel: t('invalidNumber'),
        disabled,
        ...state.baseURL,
        onEdit: (text: string) => { props.edit('baseURL', text) },
        onReset: () => { props.resetField('baseURL') },
      } satisfies ValueFieldProps),
      createElement(ValueField, {
        id: 'plugin-config-tavily-max-results',
        label: t('maxResults'),
        hint: t('maxResultsHint'),
        overriddenLabel: t('overridden'),
        resetLabel: t('reset'),
        invalidLabel: t('invalidNumber'),
        numeric: true,
        disabled,
        ...state.maxResults,
        onEdit: (text: string) => { props.edit('maxResults', text) },
        onReset: () => { props.resetField('maxResults') },
      } satisfies ValueFieldProps),
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
        label: 'Topic',
        hint: 'Filter results to a topic.',
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
    ),
  }
  return createElement(PluginCard, pluginCardProps)
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
}
const checkboxLabelStyle: Record<string, string> = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
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
  margin: '2px 0 0',
}
const selectStyle: Record<string, string> = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: '8px',
  border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.3))',
  background: 'var(--dsw-alias-input-fill, transparent)',
  color: 'var(--dsw-alias-label-primary, inherit)',
  fontSize: '13px',
}

/** Register the locale dictionaries and the plugin card. */
export function apply(ctx: ClientContext): void {
  ctx.locale.register(LOCALE_NS, { zh, en })
  const controller = new TavilyCardController(ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE }))
  ctx.slots.inject('settings.plugin.item', function* () {
    yield ctx.slots.register({
      name: 'settings.plugin.item',
      key: SETTINGS_NAMESPACE,
      locale: LOCALE_NS,
      inject: () => controller.inject(),
    }, TavilyCard)
  })
}
