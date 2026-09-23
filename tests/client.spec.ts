/**
 * The client half's field table and card controller, exercised against the
 * stub that mirrors the shell's shared form contract.
 */

import { describe, expect, it, vi } from 'vitest'
import { Config } from '../src/index.ts'
import { TavilyCardController, TAVILY_ROW_CONFIG_KEY, TAVILY_SETTINGS_NS } from '../client-src/controller.ts'
import { specOf, TAVILY_FIELDS, fieldEnabled, fieldsOf, TAVILY_GROUPS, type TavilyField } from '../client-src/fields.ts'
import { dictionaries } from '../client-src/locales.ts'
import type { SettingsFormPathOp, SettingsFormScope } from './stubs/ui-primitives.ts'

/** Field table lookup, so a spec case names its field rather than its index. */
function fieldOf(name: string): TavilyField {
  const field = TAVILY_FIELDS.find(candidate => candidate.field === name)
  if (field === undefined) throw new Error(`no field ${name}`)
  return field
}

/** A writable scope over a fixed section, recording every mutation. */
function scopeOf(
  value: Record<string, unknown> = {},
  options: { user?: Record<string, unknown>, writable?: boolean, status?: 'ready' | 'unavailable' } = {},
) {
  const listeners = new Set<() => void>()
  const writes: SettingsFormPathOp[][] = []
  const snapshot = {
    status: options.status ?? ('ready' as const),
    value,
    base: {},
    user: options.user ?? {},
    writable: options.writable ?? true,
    revision: 1,
  }
  const scope: SettingsFormScope<Record<string, unknown>> = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    mutate: async (ops) => { writes.push([...ops]); return true },
  }
  return { scope, writes }
}

describe('client field specs', () => {
  it('keeps the settings namespace and row key aligned with the bundle patch', () => {
    expect(TAVILY_SETTINGS_NS).toBe('web-search-tavily')
    expect(TAVILY_ROW_CONFIG_KEY).toBe('@junjiangao/dsh-web-search-tavily#web-search-tavily')
  })

  it('renders booleans as true/false and refuses anything else', () => {
    const spec = specOf(fieldOf('filterByLanguage'))
    expect(spec.format(true)).toBe('true')
    expect(spec.format(false)).toBe('false')
    expect(spec.format(undefined)).toBe('')
    expect(spec.parse('true')).toEqual({ kind: 'set', value: true })
    expect(spec.parse('false')).toEqual({ kind: 'set', value: false })
    expect(spec.parse('')).toBeUndefined()
  })

  it('accepts only listed enum members, including the boolean union members', () => {
    const depth = specOf(fieldOf('searchDepth'))
    expect(depth.parse('advanced')).toEqual({ kind: 'set', value: 'advanced' })
    expect(depth.parse('deep')).toBeUndefined()
    expect(depth.parse('')).toEqual({ kind: 'clear' })
    expect(depth.format('basic')).toBe('basic')

    // The boolean-union vocabulary stays available to a field table even
    // though the curated surface no longer renders one.
    const answer = specOf({ field: 'includeAnswer', kind: 'enum', options: ['true', 'false', 'basic', 'advanced'] })
    expect(answer.parse('true')).toEqual({ kind: 'set', value: true })
    expect(answer.parse('false')).toEqual({ kind: 'set', value: false })
    expect(answer.parse('advanced')).toEqual({ kind: 'set', value: 'advanced' })
    expect(answer.parse('bogus')).toBeUndefined()
    expect(answer.format(true)).toBe('true')
    expect(answer.format(undefined)).toBe('')
  })

  it('renders domain lists as comma-separated text', () => {
    const spec = specOf(fieldOf('includeDomains'))
    expect(spec.format(['a.com', 'b.com'])).toBe('a.com, b.com')
    expect(spec.format('not-an-array')).toBe('')
    expect(spec.parse(' a.com , b.com ')).toEqual({ kind: 'set', value: ['a.com', 'b.com'] })
    expect(spec.parse(' , ')).toEqual({ kind: 'clear' })
  })

  it('parses numbers and text through the shared specs', () => {
    const results = specOf({ field: 'maxResults', kind: 'number' })
    expect(results.format(5)).toBe('5')
    expect(results.format(undefined)).toBe('')
    expect(results.parse('5')).toEqual({ kind: 'set', value: 5 })
    expect(results.parse('five')).toBeUndefined()
    expect(results.parse('')).toEqual({ kind: 'clear' })

    const endpoint = specOf({ field: 'baseURL', kind: 'text' })
    expect(endpoint.format('https://api.tavily.com')).toBe('https://api.tavily.com')
    expect(endpoint.parse(' https://api.tavily.com ')).toEqual({ kind: 'set', value: 'https://api.tavily.com' })
  })

  it('renders a curated subset of the Host schema, and nothing outside it', () => {
    const names = TAVILY_FIELDS.map(field => field.field)
    expect(new Set(names).size).toBe(names.length)
    const hostFields = new Set(Object.keys(Config.dict as Record<string, unknown>))
    for (const name of names) expect(hostFields, name).toContain(name)
    // Only parameters a deployment can meaningfully choose, in render order.
    expect(names).toEqual([
      'apiKey',
      'apiKeyEnv',
      'searchDepth',
      'includeDomains',
      'excludeDomains',
      'language',
      'filterByLanguage',
      'includeDomainsMode',
      'includePublishedDate',
    ])
  })

  it('sections every field into the groups the card draws, in order', () => {
    expect(TAVILY_GROUPS.map(entry => entry.group)).toEqual(['credential', 'search', 'advanced'])
    // Exactly one section folds, and it is the advanced one.
    expect(TAVILY_GROUPS.filter(entry => entry.collapsed).map(entry => entry.group)).toEqual(['advanced'])
    expect(fieldsOf('credential').map(field => field.field)).toEqual(['apiKey', 'apiKeyEnv'])
    expect(fieldsOf('search').map(field => field.field))
      .toEqual(['searchDepth', 'includeDomains', 'excludeDomains', 'language', 'filterByLanguage'])
    expect(fieldsOf('advanced').map(field => field.field))
      .toEqual(['includeDomainsMode', 'includePublishedDate'])
    // Every field belongs to exactly one rendered section, in table order.
    const sectioned = TAVILY_GROUPS.flatMap(entry => fieldsOf(entry.group))
    expect(sectioned).toEqual([...TAVILY_FIELDS])
  })

  it('locks a field until the companion it names carries a value', () => {
    const drafts: Record<string, string> = {}
    const draftOf = (name: string): string => drafts[name] ?? ''
    const language = fieldOf('language')
    const filter = fieldOf('filterByLanguage')
    const mode = fieldOf('includeDomainsMode')

    // A field with no companion is always editable.
    expect(fieldEnabled(language, draftOf)).toBe(true)
    expect(fieldEnabled(filter, draftOf)).toBe(false)
    expect(fieldEnabled(mode, draftOf)).toBe(false)
    drafts.language = 'zh'
    expect(fieldEnabled(filter, draftOf)).toBe(true)
    expect(fieldEnabled(mode, draftOf)).toBe(false)
    drafts.includeDomains = 'a.com'
    expect(fieldEnabled(mode, draftOf)).toBe(true)
    // Empty text is what the field stages when the section carries no value.
    drafts.language = ''
    expect(fieldEnabled(filter, draftOf)).toBe(false)
  })

  it('carries copy for every rendered field in both dictionaries', () => {
    for (const [locale, dictionary] of Object.entries(dictionaries)) {
      for (const { field } of TAVILY_FIELDS) {
        expect(dictionary[`field.${field}`], `${locale} field.${field}`).toBeDefined()
        expect(dictionary[`hint.${field}`], `${locale} hint.${field}`).toBeDefined()
      }
      for (const { group } of TAVILY_GROUPS) {
        expect(dictionary[`group.${group}`], `${locale} group.${group}`).toBeDefined()
      }
    }
  })

  it('explains why a locked field is locked, in both dictionaries', () => {
    const locked = TAVILY_FIELDS.filter(field => field.requires !== undefined)
    expect(locked.map(field => field.field)).toEqual(['filterByLanguage', 'includeDomainsMode'])
    for (const [locale, dictionary] of Object.entries(dictionaries)) {
      for (const { field } of locked) {
        expect(dictionary[`locked.${field}`], `${locale} locked.${field}`).toBeDefined()
      }
    }
  })
})

describe('TavilyCardController', () => {
  it('projects the section into per-field drafts and a clean shell', () => {
    const { scope } = scopeOf({ apiKeyEnv: 'TAVILY_API_KEY', searchDepth: 'basic' }, { user: { searchDepth: 'fast' } })
    const controller = new TavilyCardController(scope)
    const state = controller.inject().store.getSnapshot()
    expect(state.available).toBe(true)
    expect(state.writable).toBe(true)
    expect(state.dirty).toBe(false)
    expect(state.fields.searchDepth).toEqual({ text: 'basic', overridden: true, invalid: false })
    expect(state.fields.apiKeyEnv?.overridden).toBe(false)
    controller.dispose()
  })

  it('stages an edit, marks the form dirty, and writes it on save', async () => {
    const { scope, writes } = scopeOf({ searchDepth: 'basic' })
    const controller = new TavilyCardController(scope)
    const face = controller.inject()
    face.actions.edit('searchDepth', 'advanced')
    expect(face.store.getSnapshot().dirty).toBe(true)
    expect(face.store.getSnapshot().fields.searchDepth?.text).toBe('advanced')
    face.actions.save()
    await vi.waitFor(() => { expect(writes.length).toBeGreaterThan(0) })
    expect(writes[0]).toEqual([{ op: 'set', path: ['searchDepth'], value: 'advanced' }])
    controller.dispose()
  })

  it('reports an unaccepted draft as invalid without writing it', async () => {
    const { scope, writes } = scopeOf({ searchDepth: 'basic' })
    const controller = new TavilyCardController(scope)
    const face = controller.inject()
    face.actions.edit('searchDepth', 'deep')
    const state = face.store.getSnapshot()
    expect(state.invalid).toBe(true)
    expect(state.dirty).toBe(true)
    face.actions.save()
    await Promise.resolve()
    expect(writes).toEqual([])
    controller.dispose()
  })

  it('resets a field back to the composition layer', () => {
    const { scope } = scopeOf({ searchDepth: 'basic' }, { user: { searchDepth: 'basic' } })
    const controller = new TavilyCardController(scope)
    const face = controller.inject()
    face.actions.edit('searchDepth', 'fast')
    face.actions.resetField('searchDepth')
    expect(face.store.getSnapshot().fields.searchDepth?.text).toBe('')
    controller.dispose()
  })
})

/** A credentials domain answering from a mutable table, with its fanned-out events. */
function remoteOf(answers: Record<string, { configured: boolean; writable: boolean } | undefined>, ok = true) {
  const listeners = new Map<string, (ref: string) => void>()
  const described: string[][] = []
  const credentials = {
    describe: async (refs: readonly string[]) => {
      described.push([...refs])
      return ok
        ? { ok: true as const, value: Object.fromEntries(refs.map(ref => [ref, answers[ref]])) }
        : { ok: false as const, value: {} }
    },
  }
  const remote = {
    $on: (event: string, listener: (ref: string) => void) => {
      listeners.set(event, listener)
      return () => { listeners.delete(event) }
    },
  }
  return { remote, credentials, described, emit: (ref: string) => { for (const listener of listeners.values()) listener(ref) } }
}

/** A controller already attached to a fake credentials domain. */
function attached(scope: SettingsFormScope<Record<string, unknown>>, fake: ReturnType<typeof remoteOf>) {
  const controller = new TavilyCardController(scope)
  controller.attachCredentials(fake.remote as never, fake.credentials as never)
  return controller
}

describe('TavilyCardController credential status', () => {
  it('reports nothing until a credentials domain is attached', () => {
    const { scope } = scopeOf({ apiKeyEnv: 'TAVILY_API_KEY' })
    const controller = new TavilyCardController(scope)
    expect(controller.inject().store.getSnapshot().credential).toBeUndefined()
    controller.dispose()
  })

  it('reports the reference the section names as configured', async () => {
    const { scope } = scopeOf({ apiKeyEnv: 'MY_TAVILY_KEY' })
    const fake = remoteOf({ MY_TAVILY_KEY: { configured: true, writable: true } })
    const controller = attached(scope, fake)
    await vi.waitFor(() => {
      expect(controller.inject().store.getSnapshot().credential)
        .toEqual({ ref: 'MY_TAVILY_KEY', configured: true, writable: true })
    })
    expect(fake.described[0]).toEqual(['MY_TAVILY_KEY'])
    controller.dispose()
  })

  it('falls back to the provider default reference and reports it unconfigured', async () => {
    const { scope } = scopeOf({})
    const controller = attached(scope, remoteOf({ TAVILY_API_KEY: { configured: false, writable: true } }))
    await vi.waitFor(() => {
      expect(controller.inject().store.getSnapshot().credential)
        .toEqual({ ref: 'TAVILY_API_KEY', configured: false, writable: true })
    })
    controller.dispose()
  })

  it('re-reads the reference when the credentials domain reports it updated', async () => {
    const answers: Record<string, { configured: boolean; writable: boolean } | undefined> = {
      TAVILY_API_KEY: { configured: false, writable: true },
    }
    const fake = remoteOf(answers)
    const { scope } = scopeOf({})
    const controller = attached(scope, fake)
    await vi.waitFor(() => { expect(controller.inject().store.getSnapshot().credential?.configured).toBe(false) })
    answers.TAVILY_API_KEY = { configured: true, writable: true }
    fake.emit('TAVILY_API_KEY')
    await vi.waitFor(() => { expect(controller.inject().store.getSnapshot().credential?.configured).toBe(true) })
    controller.dispose()
  })

  it('reports nothing when the Host refuses the read, never "not configured"', async () => {
    const { scope } = scopeOf({})
    const controller = attached(scope, remoteOf({}, false))
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.inject().store.getSnapshot().credential).toBeUndefined()
    controller.dispose()
  })

  it('reports nothing when the read throws, never "not configured"', async () => {
    const { scope } = scopeOf({})
    const controller = new TavilyCardController(scope)
    controller.attachCredentials(
      { $on: () => () => {} } as never,
      { describe: async () => { throw new Error('offline') } } as never,
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.inject().store.getSnapshot().credential).toBeUndefined()
    controller.dispose()
  })

  it('attaches only once', async () => {
    const { scope } = scopeOf({})
    const first = remoteOf({ TAVILY_API_KEY: { configured: true, writable: true } })
    const second = remoteOf({ TAVILY_API_KEY: { configured: false, writable: true } })
    const controller = attached(scope, first)
    controller.attachCredentials(second.remote as never, second.credentials as never)
    await vi.waitFor(() => { expect(controller.inject().store.getSnapshot().credential?.configured).toBe(true) })
    expect(second.described).toEqual([])
    controller.dispose()
  })
})
