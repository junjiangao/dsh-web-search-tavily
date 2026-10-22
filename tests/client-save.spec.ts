/** 使用发布包的真实 SettingsFormModel 验证写入、冲突与异步生命周期。 */
import { describe, expect, it, vi } from 'vitest'
import { TavilyCardController } from '../client-src/controller.ts'
import type { CredentialsRemote, SettingsDescribeFace } from '../client-src/context.ts'
import type { SettingsFormPathOp, SettingsFormScope } from '@deepseek-ai/dsh-client-ui-primitives'

function scopeOf(initial: Record<string, unknown> = {}, writable = true) {
  const listeners = new Set<() => void>()
  let snapshot = { status: 'ready' as const, value: { ...initial }, base: { ...initial }, user: {} as Record<string, unknown>, writable, revision: 1 }
  const notify = () => { for (const listener of listeners) listener() }
  const mutate = vi.fn(async (ops: readonly SettingsFormPathOp[], revision?: number) => {
    if (!snapshot.writable || (revision !== undefined && revision !== snapshot.revision)) return false
    const user = { ...snapshot.user }
    for (const op of ops) {
      if (op.op === 'set') user[op.path[0]!] = op.value
      else delete user[op.path[0]!]
    }
    snapshot = { ...snapshot, user, value: { ...snapshot.base, ...user }, revision: snapshot.revision + 1 }
    notify()
    return true
  })
  const scope: SettingsFormScope<Record<string, unknown>> = {
    getSnapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    mutate,
  }
  return { scope, mutate, change: (value: Record<string, unknown>) => {
    snapshot = { ...snapshot, user: { ...snapshot.user, ...value }, value: { ...snapshot.value, ...value }, revision: snapshot.revision + 1 }
    notify()
  } }
}

function remoteOf() {
  const values = new Map<string, string>()
  const listeners = new Set<(ref: string) => void>()
  const credentials: CredentialsRemote = {
    describe: vi.fn(async refs => ({ ok: true, value: Object.fromEntries(refs.map(ref => [ref, { configured: values.has(ref), writable: true }])) })),
    set: vi.fn(async (ref, value) => { values.set(ref, value); return { ok: true, value: undefined } }),
  }
  return { credentials, values,
    remote: { $on: (_event: string, listener: (ref: string) => void) => { listeners.add(listener); return () => { listeners.delete(listener) } } },
    emit: (ref: string) => { for (const listener of listeners) listener(ref) },
  }
}

async function save(controller: TavilyCardController): Promise<void> {
  controller.inject().actions.save()
  await vi.waitFor(() => { expect(controller.inject().store.getSnapshot().saving).toBe(false) })
}

async function attach(controller: TavilyCardController, remote = remoteOf()) {
  controller.attachCredentials(remote.remote, remote.credentials)
  await vi.waitFor(() => { expect(controller.inject().store.getSnapshot().credential).toBeDefined() })
  return remote
}

describe('credential writes', () => {
  it('keeps the draft if another client changes the reference during the key write', async () => {
    const config = scopeOf()
    const controller = new TavilyCardController(config.scope)
    const remote = await attach(controller)
    let finish!: (value: { ok: boolean; value: undefined }) => void
    vi.mocked(remote.credentials.set).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const face = controller.inject()
    face.actions.edit('apiKey', 'example')
    face.actions.save()
    face.actions.save()
    await vi.waitFor(() => { expect(remote.credentials.set).toHaveBeenCalledTimes(1) })
    face.actions.edit('apiKey', 'ignored-while-saving')
    face.actions.discard()
    expect(face.store.getSnapshot().fields.apiKey?.text).toBe('example')
    config.change({ apiKeyEnv: 'CHANGED_REF' })
    finish({ ok: true, value: undefined })
    await vi.waitFor(() => { expect(face.store.getSnapshot().saving).toBe(false) })
    expect(face.store.getSnapshot()).toMatchObject({ dirty: true, failed: true })
    controller.dispose()
  })
  it('saves a write-only key through credentials, clears it after success, and leaves blank inputs untouched', async () => {
    const config = scopeOf()
    const controller = new TavilyCardController(config.scope)
    const remote = await attach(controller)
    const face = controller.inject()
    face.actions.edit('apiKey', ' example-key ')
    await save(controller)
    expect(remote.credentials.set).toHaveBeenCalledWith('TAVILY_API_KEY', 'example-key')
    expect(config.mutate).not.toHaveBeenCalled()
    expect(face.store.getSnapshot()).toMatchObject({ dirty: false, failed: false, credential: { configured: true }, fields: { apiKey: { text: '' } } })
    face.actions.edit('apiKey', ' ')
    await save(controller)
    expect(remote.credentials.set).toHaveBeenCalledTimes(1)
    controller.dispose()
  })

  it('saves a changed reference before writing the key to that reference', async () => {
    const config = scopeOf({ apiKeyEnv: 'OLD_KEY' })
    const controller = new TavilyCardController(config.scope)
    const remote = await attach(controller)
    controller.inject().actions.edit('apiKey', 'new-example')
    controller.inject().actions.edit('apiKeyEnv', 'NEW_KEY')
    await save(controller)
    expect(remote.credentials.set).toHaveBeenCalledWith('NEW_KEY', 'new-example')
    expect(config.mutate.mock.calls[0]?.[0]).toEqual([{ op: 'set', path: ['apiKeyEnv'], value: 'NEW_KEY' }])
    expect(controller.inject().store.getSnapshot().failed).toBe(false)
    controller.dispose()
  })

  it.each(['refused', 'exception'])('keeps the key draft and reports a failed %s write', async mode => {
    const controller = new TavilyCardController(scopeOf().scope)
    const remote = await attach(controller)
    if (mode === 'refused') vi.mocked(remote.credentials.set).mockResolvedValue({ ok: false, value: undefined })
    else vi.mocked(remote.credentials.set).mockRejectedValue(new Error('unavailable'))
    controller.inject().actions.edit('apiKey', 'example')
    await save(controller)
    expect(controller.inject().store.getSnapshot()).toMatchObject({ dirty: true, failed: true, fields: { apiKey: { text: 'example' } } })
    controller.dispose()
  })

  it('allows credential-only writes when configuration is read-only', async () => {
    const config = scopeOf({}, false)
    const controller = new TavilyCardController(config.scope)
    const remote = await attach(controller)
    expect(controller.inject().store.getSnapshot()).toMatchObject({ keyWritable: true, configWritable: false })
    controller.inject().actions.edit('apiKey', 'example')
    await save(controller)
    expect(remote.credentials.set).toHaveBeenCalledOnce()
    expect(config.mutate).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('refuses a read-only credential without clearing its draft', async () => {
    const controller = new TavilyCardController(scopeOf().scope)
    const remote = remoteOf()
    vi.mocked(remote.credentials.describe).mockResolvedValue({ ok: true, value: { TAVILY_API_KEY: { configured: true, writable: false } } })
    await attach(controller, remote)
    expect(controller.inject().store.getSnapshot().keyWritable).toBe(false)
    controller.inject().actions.edit('apiKey', 'example')
    await save(controller)
    expect(remote.credentials.set).not.toHaveBeenCalled()
    expect(controller.inject().store.getSnapshot().failed).toBe(true)
    controller.dispose()
  })

  it('recognizes redacted literal keys and explicitly switches to the newly written credential', async () => {
    const config = scopeOf()
    const mirror: SettingsDescribeFace = { getSnapshot: () => ({ view: { namespaces: [
      { ns: 'web-search-tavily', secrets: [{ path: ['apiKey'], set: true }] },
    ] } }), subscribe: () => () => {} }
    const controller = new TavilyCardController(config.scope, undefined, mirror)
    await attach(controller)
    expect(controller.inject().store.getSnapshot()).toMatchObject({ literalKey: true, credential: { configured: true, ref: 'apiKey' }, fields: { apiKey: { text: '' } } })
    controller.inject().actions.edit('apiKey', 'replacement-example')
    await save(controller)
    expect(config.mutate).toHaveBeenCalledWith([{ op: 'set', path: ['useCredential'], value: true }], 1)
    expect(controller.inject().store.getSnapshot()).toMatchObject({ literalKey: false, credential: { ref: 'TAVILY_API_KEY', configured: true }, dirty: false })
    controller.dispose()
  })

  it('blocks provider selection when saving the key failed', async () => {
    const config = scopeOf()
    const web = scopeOf({ searchProvider: 'deepseek-search-api', fetchProvider: 'deepseek-fetch-api' })
    const controller = new TavilyCardController(config.scope, web.scope)
    const remote = await attach(controller)
    vi.mocked(remote.credentials.set).mockResolvedValue({ ok: false, value: undefined })
    controller.inject().actions.edit('apiKey', 'example')
    controller.inject().actions.select(true)
    await save(controller)
    expect(web.mutate).not.toHaveBeenCalled()
    controller.dispose()
  })
})

describe('provider selection', () => {
  it('switches both providers atomically and restores the previous pair after reopening the card', async () => {
    const config = scopeOf()
    const before = { searchProvider: 'deepseek-search-api', fetchProvider: 'deepseek-fetch-api' }
    const web = scopeOf(before)
    let controller = new TavilyCardController(config.scope, web.scope)
    controller.inject().actions.select(true)
    expect(web.mutate).not.toHaveBeenCalled()
    await save(controller)
    expect(web.mutate.mock.calls[0]?.[0]).toEqual([
      { op: 'set', path: ['searchProvider'], value: 'tavily' },
      { op: 'set', path: ['fetchProvider'], value: 'http' },
    ])
    expect(config.scope.getSnapshot().value).toMatchObject({ previousSearchProvider: before.searchProvider, previousFetchProvider: before.fetchProvider })
    expect(controller.inject().store.getSnapshot()).toMatchObject({ enabled: true, dirty: false, failed: false })
    controller.dispose()
    controller = new TavilyCardController(config.scope, web.scope)
    controller.inject().actions.select(false)
    await save(controller)
    expect(web.scope.getSnapshot().value).toEqual(before)
    expect(controller.inject().store.getSnapshot().enabled).toBe(false)
    controller.dispose()
  })

  it('follows changes from the official card and never overwrites a later concurrent selection', async () => {
    const config = scopeOf()
    const web = scopeOf({ searchProvider: 'tavily', fetchProvider: 'http' })
    const controller = new TavilyCardController(config.scope, web.scope)
    expect(controller.inject().store.getSnapshot().enabled).toBe(true)
    web.change({ searchProvider: 'deepseek-search-api', fetchProvider: 'deepseek-fetch-api' })
    expect(controller.inject().store.getSnapshot().enabled).toBe(false)
    controller.inject().actions.select(true)
    web.change({ searchProvider: 'another-search', fetchProvider: 'another-fetch' })
    await save(controller)
    expect(controller.inject().store.getSnapshot()).toMatchObject({ failed: true, dirty: true })
    expect(web.scope.getSnapshot().value).toEqual({ searchProvider: 'another-search', fetchProvider: 'another-fetch' })
    controller.dispose()
  })

  it('discards a toggle before saving without changing either namespace', async () => {
    const config = scopeOf()
    const web = scopeOf({ searchProvider: 'deepseek-official', fetchProvider: 'http' })
    const controller = new TavilyCardController(config.scope, web.scope)
    controller.inject().actions.select(true)
    controller.inject().actions.select(false)
    await save(controller)
    expect(web.mutate).not.toHaveBeenCalled()
    expect(config.mutate).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('does not change providers if saving the previous selection is refused', async () => {
    const config = scopeOf()
    config.mutate.mockResolvedValue(false)
    const web = scopeOf({ searchProvider: 'custom', fetchProvider: 'custom-fetch' })
    const controller = new TavilyCardController(config.scope, web.scope)
    controller.inject().actions.select(true)
    await save(controller)
    expect(web.mutate).not.toHaveBeenCalled()
    expect(controller.inject().store.getSnapshot()).toMatchObject({ failed: true, dirty: true })
    controller.dispose()
  })
})

describe('credential request lifetime', () => {
  it('keeps a replacement connection alive when an older scope is disposed', async () => {
    const controller = new TavilyCardController(scopeOf().scope)
    const first = remoteOf()
    const second = remoteOf()
    const detach = controller.attachCredentials(first.remote, first.credentials)
    await attach(controller, second)
    detach()
    second.values.set('TAVILY_API_KEY', 'example')
    second.emit('TAVILY_API_KEY')
    await vi.waitFor(() => { expect(controller.inject().store.getSnapshot().credential?.configured).toBe(true) })
    controller.dispose()
  })
  it('ignores older requests for the same reference, invalidates failed new references, and ignores settlement after disposal', async () => {
    const config = scopeOf()
    const controller = new TavilyCardController(config.scope)
    const remote = remoteOf()
    const pending: Array<(result: Awaited<ReturnType<CredentialsRemote['describe']>>) => void> = []
    vi.mocked(remote.credentials.describe).mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    controller.attachCredentials(remote.remote, remote.credentials)
    remote.emit('TAVILY_API_KEY')
    pending[1]!({ ok: true, value: { TAVILY_API_KEY: { configured: true, writable: true } } })
    await Promise.resolve()
    pending[0]!({ ok: true, value: { TAVILY_API_KEY: { configured: false, writable: false } } })
    await Promise.resolve()
    expect(controller.inject().store.getSnapshot().credential?.configured).toBe(true)
    config.change({ apiKeyEnv: 'NEW_KEY' })
    pending[2]!({ ok: false, value: {} })
    await Promise.resolve()
    expect(controller.inject().store.getSnapshot().credential).toBeUndefined()
    remote.emit('NEW_KEY')
    controller.dispose()
    const listener = vi.fn()
    controller.inject().store.subscribe(listener)
    pending[3]!({ ok: true, value: { NEW_KEY: { configured: true, writable: true } } })
    await Promise.resolve()
    expect(listener).not.toHaveBeenCalled()
  })
})
