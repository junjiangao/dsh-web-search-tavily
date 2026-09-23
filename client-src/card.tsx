/**
 * The Tavily provider's card on the Plugins page: the one-liner the row's
 * page shows in place of a description, and the configuration form the row's
 * configure control opens.
 *
 * The form is grouped — credentials, retrieval, and a collapsed advanced
 * section — and a control whose companion value is missing renders locked,
 * because Tavily answers those combinations with a 400. The card reads the
 * shared model's snapshot through `useSyncExternalStore`; nothing here writes,
 * so a save is the only moment a draft becomes a document mutation.
 */

import { useState, useSyncExternalStore } from 'react'
import {
  IconChevronDownOutlineRegular,
  IconChevronRightOutlineRegular,
  SettingsForm,
  SettingsValueField,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  TavilyCredentialStatus,
  TavilyRow,
  TavilySelectField,
  TavilyToggleField,
  type TavilyControlProps,
} from './controls.tsx'
import type { TavilyCardFace, TavilyCardState } from './controller.ts'
import { fieldEnabled, fieldsOf, TAVILY_GROUPS, type TavilyField, type TavilyGroup } from './fields.ts'
import { TAVILY_CLASS } from './styles.ts'

/** Props the Plugins page binds when it renders this entry. */
export interface TavilyCardProps {
  /** `summary` renders the one-liner alone; `page` renders the form. */
  readonly view?: 'summary' | 'page'
}

/** Dictionary copy of one key, or the empty string when the namespace has none. */
function copyOf(t: (key: string) => string, key: string): string {
  const text = t(key)
  return text === key ? '' : text
}

/** Render one field with the control its kind names. */
function fieldControl(field: TavilyField, state: TavilyCardState, face: TavilyCardFace, enabled: boolean) {
  const draft = state.fields[field.field]
  const lockedHint = copyOf(face.t, `locked.${field.field}`)
  const common: TavilyControlProps = {
    id: `plugin-config-tavily-${field.field}`,
    label: copyOf(face.t, `field.${field.field}`) || field.field,
    // A locked control says why instead of repeating what it would do.
    hint: enabled ? copyOf(face.t, `hint.${field.field}`) : lockedHint,
    overridden: draft?.overridden ?? false,
    overriddenLabel: face.t('overridden'),
    resetLabel: face.t('reset'),
    disabled: !state.writable || !enabled,
    onReset: () => { face.actions.resetField(field.field) },
  }
  if (field.kind === 'boolean') {
    return (
      <TavilyToggleField
        {...common}
        checked={draft?.text === 'true'}
        onToggle={(next) => { face.actions.edit(field.field, String(next)) }}
      />
    )
  }
  if (field.kind === 'enum') {
    return (
      <TavilySelectField
        {...common}
        value={draft?.text ?? ''}
        options={field.options ?? []}
        unsetLabel={face.t('unsetOption')}
        onSelect={(next) => { face.actions.edit(field.field, next) }}
      />
    )
  }
  return (
    <SettingsValueField
      {...common}
      text={draft?.text ?? ''}
      invalid={draft?.invalid ?? false}
      invalidLabel={face.t('invalidNumber')}
      numeric={field.kind === 'number'}
      onEdit={(text) => { face.actions.edit(field.field, text) }}
    />
  )
}

/** The section header: a plain title, or a disclosure when the section folds. */
function groupHeader(entry: TavilyGroup, open: boolean, onToggle: () => void, face: TavilyCardFace) {
  const title = copyOf(face.t, `group.${entry.group}`) || entry.group
  if (!entry.collapsed) return <h3 className={TAVILY_CLASS.groupTitle}>{title}</h3>
  const panelId = `plugin-config-tavily-panel-${entry.group}`
  return (
    <button
      type="button"
      className={TAVILY_CLASS.disclosure}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
    >
      {open
        ? <IconChevronDownOutlineRegular size={12} className={TAVILY_CLASS.disclosureIcon} />
        : <IconChevronRightOutlineRegular size={12} className={TAVILY_CLASS.disclosureIcon} />}
      {title}
    </button>
  )
}

/** The fields of one section, each wrapped in the row that carries its divider. */
function groupRows(entry: TavilyGroup, state: TavilyCardState, face: TavilyCardFace) {
  const draftOf = (name: string): string => state.fields[name]?.text ?? ''
  return (
    <>
      {entry.group === 'credential' && state.credential !== undefined
        ? (
          <TavilyRow>
            <TavilyCredentialStatus
              configured={state.credential.configured}
              ref={state.credential.ref}
              configuredLabel={face.t('credentialConfigured')}
              unsetLabel={face.t('credentialUnset')}
            />
          </TavilyRow>
        )
        : null}
      {fieldsOf(entry.group).map(field => (
        <TavilyRow key={field.field}>
          {fieldControl(field, state, face, fieldEnabled(field, draftOf))}
        </TavilyRow>
      ))}
    </>
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
  // The advanced section is the only folded one; its state is view-only, so it
  // stays out of the shared form model.
  const [advancedOpen, setAdvancedOpen] = useState(false)
  if (props.view === 'summary') return <p>{face.t('summary')}</p>
  return (
    <SettingsForm labels={face.labels} state={state} onSave={face.actions.save} onDiscard={face.actions.discard}>
      {TAVILY_GROUPS.map(entry => (
        <section key={entry.group} className={TAVILY_CLASS.group} data-tavily-group={entry.group}>
          {groupHeader(entry, advancedOpen, () => { setAdvancedOpen(!advancedOpen) }, face)}
          {entry.collapsed
            ? (
              <div
                id={`plugin-config-tavily-panel-${entry.group}`}
                className={TAVILY_CLASS.panel}
                hidden={!advancedOpen}
              >
                {groupRows(entry, state, face)}
              </div>
            )
            : groupRows(entry, state, face)}
        </section>
      ))}
    </SettingsForm>
  )
}
