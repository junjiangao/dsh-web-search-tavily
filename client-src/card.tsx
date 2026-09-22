/**
 * The Tavily provider's card on the Plugins page: the one-liner the row's
 * page shows in place of a description, and the configuration form the row's
 * configure control opens.
 *
 * The card reads the shared model's snapshot through `useSyncExternalStore`;
 * nothing here writes, so a save is the only moment a draft becomes a
 * document mutation.
 */

import { useSyncExternalStore } from 'react'
import { SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import { TavilySelectField, TavilyToggleField, type TavilyControlProps } from './controls.tsx'
import type { TavilyCardFace, TavilyCardState } from './controller.ts'
import type { TavilyField } from './fields.ts'

/** Props the Plugins page binds when it renders this entry. */
export interface TavilyCardProps {
  /** `summary` renders the one-liner alone; `page` renders the form. */
  readonly view?: 'summary' | 'page'
}

const credentialStyle = { fontSize: '12px', margin: '0 0 12px', opacity: 0.85 }

/** Dictionary copy of one key, or the empty string when the namespace has none. */
function copyOf(t: (key: string) => string, key: string): string {
  const text = t(key)
  return text === key ? '' : text
}

/** Render one field with the control its kind names. */
function fieldControl(field: TavilyField, state: TavilyCardState, face: TavilyCardFace) {
  const draft = state.fields[field.field]
  const common: TavilyControlProps = {
    id: `plugin-config-tavily-${field.field}`,
    label: copyOf(face.t, `field.${field.field}`) || field.field,
    hint: copyOf(face.t, `hint.${field.field}`),
    overridden: draft?.overridden ?? false,
    overriddenLabel: face.t('overridden'),
    resetLabel: face.t('reset'),
    disabled: !state.writable,
    onReset: () => { face.actions.resetField(field.field) },
  }
  if (field.kind === 'boolean') {
    return (
      <TavilyToggleField
        key={field.field}
        {...common}
        checked={draft?.text === 'true'}
        onToggle={(next) => { face.actions.edit(field.field, String(next)) }}
      />
    )
  }
  if (field.kind === 'enum') {
    return (
      <TavilySelectField
        key={field.field}
        {...common}
        value={draft?.text ?? ''}
        options={field.options ?? []}
        onSelect={(next) => { face.actions.edit(field.field, next) }}
      />
    )
  }
  return (
    <SettingsValueField
      key={field.field}
      {...common}
      text={draft?.text ?? ''}
      invalid={draft?.invalid ?? false}
      invalidLabel={face.t('invalidNumber')}
      numeric={field.kind === 'number'}
      onEdit={(text) => { face.actions.edit(field.field, text) }}
    />
  )
}

/**
 * Render the card the Plugins page asks for.
 * @param props - the view the page asks for.
 * @param face - the bound form snapshot, its actions, and this plugin's copy.
 * @returns the one-liner, or the configuration form.
 */
export function TavilyCard(props: TavilyCardProps, face: TavilyCardFace) {
  const state = useSyncExternalStore(face.store.subscribe, face.store.getSnapshot)
  if (props.view === 'summary') return <p>{face.t('summary')}</p>
  return (
    <SettingsForm labels={face.labels} state={state} onSave={face.actions.save} onDiscard={face.actions.discard}>
      {state.credential === undefined
        ? null
        : (
          <p style={credentialStyle} data-plugin-credential-status>
            {state.credential.configured
              ? `${face.t('credentialConfigured')}${state.credential.ref}`
              : `${face.t('credentialUnset')}${state.credential.ref}`}
          </p>
        )}
      {face.fields.map(field => fieldControl(field, state, face))}
    </SettingsForm>
  )
}
