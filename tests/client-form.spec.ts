import { describe, expect, it } from 'vitest'
import { FormModel, numberSpec, textSpec } from '../client-src/form.ts'
import type { FieldSpec } from '../client-src/form.ts'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings'

/** In-memory settings scope doubling the host-backed one. */
class FakeScope implements SettingsScope {
  snapshot: SettingsScopeSnapshot
  private listeners = new Set<() => void>()

  constructor(value: Record<string, unknown> = {}, user: Record<string, unknown> | null = null) {
    this.snapshot = {
      status: 'ready',
      value,
      base: { searchDepth: 'basic' },
      user,
      revision: 0,
      writable: true,
      mode: 'host',
    }
  }

  getSnapshot() { return this.snapshot }
  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  async set(field: string, value: unknown) {
    const user = { ...(this.snapshot.user ?? {}), [field]: value }
    this.snapshot = { ...this.snapshot, user, value: { ...this.snapshot.value, [field]: value }, revision: this.snapshot.revision! + 1 }
    this.notify()
  }
  async unset(field: string) {
    const user = { ...(this.snapshot.user ?? {}) }
    delete user[field]
    const value = { ...this.snapshot.value }
    delete value[field]
    this.snapshot = { ...this.snapshot, user, value, revision: this.snapshot.revision! + 1 }
    this.notify()
  }
  async dispose() { this.listeners.clear() }
  private notify() { for (const listener of this.listeners) listener() }
}

const SPECS: readonly FieldSpec[] = [
  { kind: 'secret', field: 'apiKey' },
  textSpec('baseURL'),
  numberSpec('maxResults'),
  { kind: 'select', field: 'searchDepth' },
  { kind: 'boolean', field: 'includeImages' },
]

function model(scope = new FakeScope()) {
  return new FormModel(scope, SPECS)
}

describe('FormModel shell state', () => {
  it('reports ready/writable and clean when nothing is staged', () => {
    const form = model()
    expect(form.shell()).toEqual({
      available: true,
      writable: true,
      dirty: false,
      invalid: false,
      saving: false,
      failed: false,
    })
  })

  it('turns dirty on a staged edit and clears on discard', () => {
    const form = model()
    form.actions().edit('baseURL', 'https://example.com')
    expect(form.shell().dirty).toBe(true)
    form.actions().discard()
    expect(form.shell().dirty).toBe(false)
    expect(form.textField('baseURL').text).toBe('')
  })

  it('flags invalid numeric drafts and refuses to save them', async () => {
    const scope = new FakeScope()
    const form = model(scope)
    const actions = form.actions()
    actions.edit('maxResults', 'not-a-number')
    expect(form.shell().invalid).toBe(true)
    expect(form.textField('maxResults').invalid).toBe(true)
    actions.save()
    await new Promise((resolve) => setTimeout(resolve, 0))
    // an invalid plan refuses to write anything and keeps the draft
    expect(scope.snapshot.user).toBeNull()
    expect(form.shell().dirty).toBe(true)
    expect(form.shell().failed).toBe(false)
  })
})

describe('FormModel field projections', () => {
  it('projects text fields from the section value and the user layer', () => {
    // `value` is the effective layer (user over composition); `user` marks overrides.
    const form = model(new FakeScope({ baseURL: 'https://user.example' }, { baseURL: 'https://user.example' }))
    expect(form.textField('baseURL')).toEqual({ text: 'https://user.example', overridden: true, invalid: false })
  })

  it('projects selects with the effective option', () => {
    const form = model(new FakeScope({ searchDepth: 'advanced' }))
    expect(form.selectField('searchDepth')).toEqual({ value: 'advanced', overridden: false })
  })

  it('projects booleans with the effective checked state', () => {
    const form = model(new FakeScope({ includeImages: true }))
    expect(form.booleanField('includeImages')).toEqual({ checked: true, overridden: false })
  })

  it('projects secrets with configured state', () => {
    const form = model(new FakeScope({ apiKey: 'sk-123' }))
    expect(form.secretField('apiKey')).toEqual({ text: '', configured: true })
  })
})

describe('FormModel save planning', () => {
  it('writes staged text edits and clears empty drafts', async () => {
    const scope = new FakeScope({ baseURL: 'https://old.example' })
    const form = model(scope)
    form.actions().edit('baseURL', 'https://new.example')
    form.actions().save()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(scope.snapshot.user).toEqual({ baseURL: 'https://new.example' })
    expect(form.shell().dirty).toBe(false)
  })

  it('writes select choices and clears them when reverted to default', async () => {
    const scope = new FakeScope({ searchDepth: 'basic' })
    const form = model(scope)
    form.actions().choose('searchDepth', 'advanced', false)
    form.actions().save()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(scope.snapshot.user).toEqual({ searchDepth: 'advanced' })
    // choosing the composition default clears the override
    form.actions().choose('searchDepth', 'basic', true)
    form.actions().save()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(scope.snapshot.user).toEqual({})
  })

  it('toggles booleans and clears them back to the default', async () => {
    const scope = new FakeScope()
    const form = model(scope)
    form.actions().toggle('includeImages', true, false)
    form.actions().save()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(scope.snapshot.user).toEqual({ includeImages: true })
    form.actions().toggle('includeImages', false, false)
    form.actions().save()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(scope.snapshot.user).toEqual({})
  })

  it('writes staged secrets into the section', async () => {
    const scope = new FakeScope()
    const form = model(scope)
    form.actions().edit('apiKey', 'sk-456')
    form.actions().save()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(scope.snapshot.user).toEqual({ apiKey: 'sk-456' })
  })

  it('keeps drafts when a write fails', async () => {
    const scope = new FakeScope()
    // a rejected write settles without landing: the user layer stays empty
    scope.set = async () => {}
    const form = model(scope)
    form.actions().edit('baseURL', 'https://never.example')
    form.actions().save()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(form.shell().failed).toBe(true)
    expect(form.shell().dirty).toBe(true)
    expect(form.textField('baseURL').text).toBe('https://never.example')
  })
})
