/**
 * The plugin's configuration fields as the Plugins page renders them.
 *
 * The Loader entry's schema is the source of truth on the Host; this table is
 * the browser-side mirror of the same field names and value kinds, because the
 * client contract ships values and write actions, never the schema. A field
 * added to `src/index.ts` without a row here is invisible on the page, and a
 * row without a Host field is refused by the Host on save.
 *
 * The table is a curated subset of that schema on purpose. A parameter earns a
 * row only when a deployment can meaningfully choose its value *and* changing
 * it improves result quality; the rest stay at Tavily's own default and remain
 * reachable through a profile patch. See the README for the per-parameter
 * table and the rationale behind each exclusion.
 */

import type { SettingsFieldSpec, SettingsFieldWrite } from '@deepseek-ai/dsh-client-ui-primitives'
import { settingsNumberField, settingsTextField } from '@deepseek-ai/dsh-client-ui-primitives'

/** The control one configuration field renders as. */
export type TavilyFieldKind = 'text' | 'password' | 'number' | 'boolean' | 'enum' | 'list'

/** Section of the card a field renders under. */
export type TavilyFieldGroup = 'credential' | 'search' | 'advanced'

/** One configuration field of the Tavily provider. */
export interface TavilyField {
  /** Field name inside the `web-search-tavily` section, as the Host schema spells it. */
  readonly field: string
  /** The control this field renders as. */
  readonly kind: TavilyFieldKind
  /** Section this field renders under. */
  readonly group: TavilyFieldGroup
  /**
   * Another field whose non-empty draft gates this control. Tavily answers a
   * companion-less parameter with a 400, so the card locks the control instead
   * of letting the user stage an edit the provider would have to drop.
   */
  readonly requires?: string
  /**
   * Members of an `enum` field, in the order the select lists them. The
   * literal members `true` and `false` write real booleans, which is how a
   * schema's boolean-or-mode unions are addressed.
   */
  readonly options?: readonly string[]
}

/** One section of the card. */
export interface TavilyGroup {
  /** Which section this is. */
  readonly group: TavilyFieldGroup
  /** True when the card starts the section collapsed behind a disclosure. */
  readonly collapsed: boolean
}

/** Card sections in render order; only the advanced section starts collapsed. */
export const TAVILY_GROUPS: readonly TavilyGroup[] = [
  { group: 'credential', collapsed: false },
  { group: 'search', collapsed: false },
  { group: 'advanced', collapsed: true },
]

/** Every field the page edits, in render order. */
export const TAVILY_FIELDS: readonly TavilyField[] = [
  { field: 'apiKey', kind: 'password', group: 'credential' },
  { field: 'apiKeyEnv', kind: 'text', group: 'credential' },
  { field: 'searchDepth', kind: 'enum', options: ['ultra-fast', 'fast', 'basic', 'advanced'], group: 'search' },
  { field: 'includeDomains', kind: 'list', group: 'search' },
  { field: 'excludeDomains', kind: 'list', group: 'search' },
  { field: 'language', kind: 'text', group: 'search' },
  { field: 'filterByLanguage', kind: 'boolean', group: 'search', requires: 'language' },
  { field: 'includeDomainsMode', kind: 'enum', options: ['restrict', 'prefer'], group: 'advanced', requires: 'includeDomains' },
  { field: 'includePublishedDate', kind: 'boolean', group: 'advanced' },
]

/** The fields of one section, in render order. */
export function fieldsOf(group: TavilyFieldGroup): readonly TavilyField[] {
  return TAVILY_FIELDS.filter(field => field.group === group)
}

/**
 * True when a field's own draft may be edited: either it names no companion, or
 * the companion it names carries a value.
 * @param field - the field whose control is being rendered.
 * @param draftOf - staged text of any field, by name.
 * @returns whether the control accepts input.
 */
export function fieldEnabled(field: TavilyField, draftOf: (name: string) => string): boolean {
  return field.requires === undefined || draftOf(field.requires).length > 0
}

/** A draft the boolean control accepts. */
function booleanWrite(text: string): SettingsFieldWrite | undefined {
  if (text === 'true') return { kind: 'set', value: true }
  if (text === 'false') return { kind: 'set', value: false }
  return undefined
}

/**
 * The staged-value spec of one field: how the stored value renders as draft
 * text and which drafts a save would write. An unaccepted draft returns
 * `undefined`, which blocks the save instead of silently dropping the edit.
 * Only the value's shape matters here, so a caller may describe a field the
 * card does not render (a parameter it leaves at the Host default).
 * @param field - the field to describe.
 * @returns the spec the shared form model stages over.
 */
export function specOf(field: Pick<TavilyField, 'field' | 'kind' | 'options'>): SettingsFieldSpec {
  switch (field.kind) {
    case 'number':
      return settingsNumberField(field.field)
    case 'boolean':
      return {
        field: field.field,
        format: value => value === true ? 'true' : value === false ? 'false' : '',
        parse: booleanWrite,
      }
    case 'enum':
      return {
        field: field.field,
        format: value => typeof value === 'boolean' ? String(value) : typeof value === 'string' ? value : '',
        parse: (text) => {
          if (text === '') return { kind: 'clear' }
          if (text === 'true' || text === 'false') return booleanWrite(text)
          return field.options?.includes(text) === true ? { kind: 'set', value: text } : undefined
        },
      }
    case 'list':
      return {
        field: field.field,
        format: value => Array.isArray(value) ? value.join(', ') : '',
        parse: (text) => {
          const members = text.split(',').map(item => item.trim()).filter(item => item.length > 0)
          return members.length === 0 ? { kind: 'clear' } : { kind: 'set', value: members }
        },
      }
    case 'password':
    case 'text':
      return settingsTextField(field.field)
  }
}
