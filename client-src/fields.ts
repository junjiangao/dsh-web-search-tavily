/**
 * The plugin's configuration fields as the Plugins page renders them.
 *
 * The Loader entry's schema is the source of truth on the Host; this table is
 * the browser-side mirror of the same field names and value kinds, because the
 * client contract ships values and write actions, never the schema. A field
 * added to `src/index.ts` without a row here is invisible on the page, and a
 * row without a Host field is refused by the Host on save.
 */

import type { SettingsFieldSpec, SettingsFieldWrite } from '@deepseek-ai/dsh-client-ui-primitives'
import { settingsNumberField, settingsTextField } from '@deepseek-ai/dsh-client-ui-primitives'

/** The control one configuration field renders as. */
export type TavilyFieldKind = 'text' | 'password' | 'number' | 'boolean' | 'enum' | 'list'

/** One configuration field of the Tavily provider. */
export interface TavilyField {
  /** Field name inside the `web-search-tavily` section, as the Host schema spells it. */
  readonly field: string
  /** The control this field renders as. */
  readonly kind: TavilyFieldKind
  /**
   * Members of an `enum` field, in the order the select lists them. The
   * literal members `true` and `false` write real booleans, which is how the
   * schema's boolean-or-mode unions (`includeAnswer`, `includeRawContent`)
   * are addressed.
   */
  readonly options?: readonly string[]
}

/** Every field the page edits, in render order. */
export const TAVILY_FIELDS: readonly TavilyField[] = [
  { field: 'apiKey', kind: 'password' },
  { field: 'apiKeyEnv', kind: 'text' },
  { field: 'baseURL', kind: 'text' },
  { field: 'searchDepth', kind: 'enum', options: ['ultra-fast', 'fast', 'basic', 'advanced'] },
  { field: 'topic', kind: 'enum', options: ['general', 'news', 'finance'] },
  { field: 'maxResults', kind: 'number' },
  { field: 'chunksPerSource', kind: 'number' },
  { field: 'autoParameters', kind: 'boolean' },
  { field: 'timeRange', kind: 'enum', options: ['day', 'week', 'month', 'year'] },
  { field: 'days', kind: 'number' },
  { field: 'startDate', kind: 'text' },
  { field: 'endDate', kind: 'text' },
  { field: 'includeAnswer', kind: 'enum', options: ['true', 'false', 'basic', 'advanced'] },
  { field: 'includeRawContent', kind: 'enum', options: ['true', 'false', 'markdown', 'text'] },
  { field: 'includeImages', kind: 'boolean' },
  { field: 'includeImageDescriptions', kind: 'boolean' },
  { field: 'includeFavicon', kind: 'boolean' },
  { field: 'includeUsage', kind: 'boolean' },
  { field: 'includeDomains', kind: 'list' },
  { field: 'excludeDomains', kind: 'list' },
  { field: 'exactMatch', kind: 'boolean' },
  { field: 'language', kind: 'text' },
  { field: 'filterByLanguage', kind: 'boolean' },
  { field: 'country', kind: 'text' },
]

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
 * @param field - the field to describe.
 * @returns the spec the shared form model stages over.
 */
export function specOf(field: TavilyField): SettingsFieldSpec {
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
