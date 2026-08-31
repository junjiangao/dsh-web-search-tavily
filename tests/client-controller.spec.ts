/**
 * Regression for the settings card's key save. The card must speak the wire
 * contract the dsh 0.1.2 deployment serves: `remote.credentials` — positional
 * arguments and the RemoteResult envelope, mounted asynchronously.
 *
 * The key typed into the edit box must land in the credentials domain — never
 * the reference name, a hint, or any other descriptive text.
 */

import { describe, expect, it, vi } from 'vitest'
import { TavilyCardController } from '../client-src/client.ts'
import type { CredentialView, ModernCredentialsApi } from '../client-src/client.ts'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'

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
  async mutate(ops: readonly { op: 'set' | 'unset'; path: string[]; value?: unknown }[]) {
    for (const op of ops) {
      if (op.path.length !== 1) continue
      const field = op.path[0]!
      if (op.op === 'set') await this.set(field, op.value)
      else await this.unset(field)
    }
  }
  async dispose() { this.listeners.clear() }
  private notify() { for (const listener of this.listeners) listener() }
}

/** The 0.1.2 wire double: `remote.credentials`, positional + RemoteResult. */
function fakeModernCredentials(initial: CredentialView = { configured: false, writable: true }) {
  const view: CredentialView = { ...initial }
  const set = vi.fn(async (ref: string, value: string) => {
    view.configured = true
    return { ok: true }
  })
  const describe = vi.fn(async (refs: string[]) => {
    const credentials: Record<string, CredentialView> = {}
    for (const ref of refs) credentials[ref] = { ...view }
    return { ok: true, value: credentials }
  })
  const api: ModernCredentialsApi = { describe, set }
  return { view, set, describe, api }
}

const RECOMMENDED = {
  apiKeyEnv: 'TAVILY_API_KEY',
  searchDepth: 'basic',
  maxResults: 5,
  includeAnswer: false,
}

async function settle() { await new Promise((resolve) => setTimeout(resolve, 0)) }

describe('TavilyCardController credentials wire (0.1.2 remote.credentials)', () => {
  it('asks remote.credentials with the positional describe', async () => {
    const modern = fakeModernCredentials()
    new TavilyCardController(new FakeScope(), () => modern.api)
    await settle()
    expect(modern.describe).toHaveBeenCalledWith(['TAVILY_API_KEY'])
  })

  it('reports a stored key as configured via describe', async () => {
    const modern = fakeModernCredentials({ configured: true, writable: true })
    const controller = new TavilyCardController(new FakeScope(), () => modern.api)
    await settle()
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey).toMatchObject({
      configured: true,
      writable: true,
      text: '',
    })
  })

  it('reports a launch-environment-held reference as unwritable', async () => {
    const modern = fakeModernCredentials({ configured: true, writable: false })
    const controller = new TavilyCardController(new FakeScope(), () => modern.api)
    await settle()
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey).toEqual({
      text: '',
      configured: true,
      writable: false,
    })
  })

  it('saves the typed key through credentials.set and the recommended fields into the section', async () => {
    const scope = new FakeScope()
    const modern = fakeModernCredentials()
    const controller = new TavilyCardController(scope, () => modern.api)
    await settle()

    const actions = controller.inject()
    actions.applyRecommended(RECOMMENDED)
    actions.edit('apiKey', 'tvly-real-key-123')
    actions.save()
    await settle()

    // The key literal goes to the credentials domain under the reference the
    // section names — never the reference name or any other text as the value.
    expect(modern.set).toHaveBeenCalledTimes(1)
    expect(modern.set).toHaveBeenCalledWith('TAVILY_API_KEY', 'tvly-real-key-123')
    // The section receives only the recommended configuration.
    expect(scope.snapshot.user).toEqual(RECOMMENDED)
    const snapshot = controller.inject().hooks.tavilyCard.getSnapshot()
    expect(snapshot.shell).toMatchObject({ dirty: false, failed: false, saving: false })
    expect(snapshot.apiKey).toMatchObject({ configured: true, text: '' })
  })

  it('surfaces the host refusal message when the write is rejected', async () => {
    const scope = new FakeScope()
    const modern = fakeModernCredentials()
    modern.set.mockResolvedValue({
      ok: false,
      error: { code: 'credential-rejected', message: 'supplied read-only by the launching environment' },
    })
    const controller = new TavilyCardController(scope, () => modern.api)
    await settle()

    const actions = controller.inject()
    actions.edit('apiKey', 'tvly-real-key-123')
    actions.save()
    await settle()

    expect(modern.set).toHaveBeenCalledWith('TAVILY_API_KEY', 'tvly-real-key-123')
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
    const modern = fakeModernCredentials({ configured: true, writable: true })
    let api: ModernCredentialsApi | undefined
    const controller = new TavilyCardController(new FakeScope(), () => api, { delayMs: 5, maxAttempts: 5 })
    await settle()
    // The namespace has not mounted yet: no crash, and the card stays
    // unconfigured instead of keyless-by-assumption forever.
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey.configured).toBe(false)
    api = modern.api
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey.configured).toBe(true)
  })

  it('refreshes the credential when the host reports a reference update', async () => {
    const modern = fakeModernCredentials()
    const controller = new TavilyCardController(new FakeScope(), () => modern.api)
    await settle()
    expect(modern.describe).toHaveBeenCalledTimes(1)

    modern.view.configured = true
    controller.refreshCredential('TAVILY_API_KEY')
    await settle()
    expect(modern.describe).toHaveBeenCalledTimes(2)
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey.configured).toBe(true)
  })
})
