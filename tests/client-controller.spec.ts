/**
 * Regression for the settings card's key save: the card rides the host
 * credentials remote (`ctx.remote.credentials`) the way the official
 * web-search card does — POSITIONAL arguments (`describe([ref])`,
 * `set(ref, value)`) and the RemoteResult envelope (`{ ok, value/error }`).
 * A save must carry the key typed into the edit box into the credentials
 * domain, and never the env-var reference or any descriptive text.
 */

import { describe, expect, it, vi } from 'vitest'
import { TavilyCardController } from '../client-src/client.ts'
import type { CredentialsApi, CredentialView, RemoteResult } from '../client-src/client.ts'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings'

/** In-memory settings scope doubling the host-backed one. */
class FakeScope implements SettingsScope {
  snapshot: SettingsScopeSnapshot
  private listeners = new Set<() => void>()

  constructor(value: Record<string, unknown> = {}, user: Record<string, unknown> | null = null) {
    this.snapshot = {
      status: 'ready',
      value,
      base: {},
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

/** Credentials remote double in the exact wire shape; records every call. */
function fakeCredentials(initial: CredentialView = { configured: false, writable: true }) {
  const view: CredentialView = { ...initial }
  const set = vi.fn(async (ref: string, value: string): Promise<RemoteResult<null>> => {
    view.configured = true
    return { ok: true }
  })
  const describe = vi.fn(async (refs: string[]): Promise<RemoteResult<Record<string, CredentialView>>> => {
    const credentials: Record<string, CredentialView> = {}
    for (const ref of refs) credentials[ref] = { ...view }
    return { ok: true, value: credentials }
  })
  return { api: { describe, set } as CredentialsApi, view, set, describe }
}

const RECOMMENDED = {
  apiKeyEnv: 'TAVILY_API_KEY',
  searchDepth: 'basic',
  maxResults: 5,
  includeAnswer: false,
}

async function settle() { await new Promise((resolve) => setTimeout(resolve, 0)) }

describe('TavilyCardController credentials wire', () => {
  it('asks the credentials remote with a positional reference array', async () => {
    const credentials = fakeCredentials()
    new TavilyCardController(new FakeScope(), () => credentials.api)
    await settle()
    expect(credentials.describe).toHaveBeenCalledWith(['TAVILY_API_KEY'])
  })

  it('reports a stored key as configured via describe', async () => {
    const credentials = fakeCredentials({ configured: true, writable: true })
    const controller = new TavilyCardController(new FakeScope(), () => credentials.api)
    await settle()
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey).toMatchObject({
      configured: true,
      writable: true,
      text: '',
    })
  })

  it('reports a launch-environment-held reference as unwritable', async () => {
    const credentials = fakeCredentials({ configured: true, writable: false })
    const controller = new TavilyCardController(new FakeScope(), () => credentials.api)
    await settle()
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey).toEqual({
      text: '',
      configured: true,
      writable: false,
    })
  })

  it('saves the typed key through credentials.set and the recommended fields into the section', async () => {
    const scope = new FakeScope()
    const credentials = fakeCredentials()
    const controller = new TavilyCardController(scope, () => credentials.api)
    await settle()

    const actions = controller.inject()
    actions.applyRecommended(RECOMMENDED)
    actions.edit('apiKey', 'tvly-real-key-123')
    actions.save()
    await settle()

    // The key literal goes to the credentials domain, positionally, under the
    // reference the section names — never the reference itself as the value.
    expect(credentials.set).toHaveBeenCalledTimes(1)
    expect(credentials.set).toHaveBeenCalledWith('TAVILY_API_KEY', 'tvly-real-key-123')
    // The section receives only the recommended configuration.
    expect(scope.snapshot.user).toEqual(RECOMMENDED)
    const snapshot = controller.inject().hooks.tavilyCard.getSnapshot()
    expect(snapshot.shell).toMatchObject({ dirty: false, failed: false, saving: false })
    expect(snapshot.apiKey).toMatchObject({ configured: true, text: '' })
  })

  it('keeps the key draft and reports failure when the host refuses the write', async () => {
    const scope = new FakeScope()
    const credentials = fakeCredentials()
    credentials.set.mockResolvedValue({ ok: false, error: { code: 'credential-rejected', message: 'supplied read-only by the launching environment' } })
    const controller = new TavilyCardController(scope, () => credentials.api)
    await settle()

    const actions = controller.inject()
    actions.edit('apiKey', 'tvly-real-key-123')
    actions.save()
    await settle()

    expect(credentials.set).toHaveBeenCalledWith('TAVILY_API_KEY', 'tvly-real-key-123')
    expect(scope.snapshot.user).toBeNull()
    const snapshot = controller.inject().hooks.tavilyCard.getSnapshot()
    expect(snapshot.shell).toMatchObject({
      dirty: true,
      failed: true,
      failureMessage: 'supplied read-only by the launching environment',
    })
    expect(snapshot.apiKey.text).toBe('tvly-real-key-123')
  })

  it('retries until the credentials namespace mounts, then reports configured', async () => {
    const credentials = fakeCredentials({ configured: true, writable: true })
    let face: CredentialsApi | undefined
    const controller = new TavilyCardController(new FakeScope(), () => face, { delayMs: 5, maxAttempts: 5 })
    await settle()
    // The namespace has not mounted yet: no crash, and the card stays
    // unconfigured instead of keyless-by-assumption forever.
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey.configured).toBe(false)
    face = credentials.api
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey.configured).toBe(true)
  })

  it('refreshes the credential when the host reports a reference update', async () => {
    const credentials = fakeCredentials()
    const controller = new TavilyCardController(new FakeScope(), () => credentials.api)
    await settle()
    expect(credentials.describe).toHaveBeenCalledTimes(1)

    credentials.view.configured = true
    controller.refreshCredential('TAVILY_API_KEY')
    await settle()
    expect(credentials.describe).toHaveBeenCalledTimes(2)
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey.configured).toBe(true)
  })
})
