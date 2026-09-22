/**
 * The client half's field table and card controller, exercised against the
 * stub that mirrors the shell's shared form contract.
 */

import { describe, expect, it, vi } from 'vitest'
import { TavilyCardController, TAVILY_ROW_CONFIG_KEY, TAVILY_SETTINGS_NS } from '../client-src/controller.ts'
import { specOf, TAVILY_FIELDS, type TavilyField } from '../client-src/fields.ts'
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
    const spec = specOf(fieldOf('includeImages'))
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

    const answer = specOf(fieldOf('includeAnswer'))
    expect(answer.parse('true')).toEqual({ kind: 'set', value: true })
    expect(answer.parse('false')).toEqual({ kind: 'set', value: false })
    expect(answer.parse('advanced')).toEqual({ kind: 'set', value: 'advanced' })
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
    const results = specOf(fieldOf('maxResults'))
    expect(results.format(5)).toBe('5')
    expect(results.format(undefined)).toBe('')
    expect(results.parse('5')).toEqual({ kind: 'set', value: 5 })
    expect(results.parse('five')).toBeUndefined()
    expect(results.parse('')).toEqual({ kind: 'clear' })

    const endpoint = specOf(fieldOf('baseURL'))
    expect(endpoint.format('https://api.tavily.com')).toBe('https://api.tavily.com')
    expect(endpoint.parse(' https://api.tavily.com ')).toEqual({ kind: 'set', value: 'https://api.tavily.com' })
  })

  it('describes every field the Host schema carries', () => {
    const names = TAVILY_FIELDS.map(field => field.field)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('apiKeyEnv')
    expect(names).toContain('chunksPerSource')
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
    const { scope, writes } = scopeOf({ maxResults: 5 })
    const controller = new TavilyCardController(scope)
    const face = controller.inject()
    face.actions.edit('maxResults', '10')
    expect(face.store.getSnapshot().dirty).toBe(true)
    expect(face.store.getSnapshot().fields.maxResults?.text).toBe('10')
    face.actions.save()
    await vi.waitFor(() => { expect(writes.length).toBeGreaterThan(0) })
    expect(writes[0]).toEqual([{ op: 'set', path: ['maxResults'], value: 10 }])
    controller.dispose()
  })

  it('reports an unaccepted draft as invalid without writing it', async () => {
    const { scope, writes } = scopeOf({ maxResults: 5 })
    const controller = new TavilyCardController(scope)
    const face = controller.inject()
    face.actions.edit('maxResults', 'many')
    const state = face.store.getSnapshot()
    expect(state.invalid).toBe(true)
    expect(state.dirty).toBe(true)
    face.actions.save()
    await Promise.resolve()
    expect(writes).toEqual([])
    controller.dispose()
  })

  it('resets a field back to the composition layer', () => {
    const { scope } = scopeOf({ maxResults: 5 }, { user: { maxResults: 5 } })
    const controller = new TavilyCardController(scope)
    const face = controller.inject()
    face.actions.edit('maxResults', '9')
    face.actions.resetField('maxResults')
    expect(face.store.getSnapshot().fields.maxResults?.text).toBe('')
    controller.dispose()
  })
})
