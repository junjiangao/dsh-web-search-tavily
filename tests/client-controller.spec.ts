/**
 * Regression for the settings card's key save. The card must speak the wire
 * contract the DEPLOYMENT actually serves:
 *
 * - dsh 0.1.1-rc.x (the shipped web line): `connection.api.credentials` —
 *   object arguments (`{ refs: [...] }`, `{ ref, value }`) and the RPC
 *   envelope `{ result: { ok, value | error } }`, exactly what the official
 *   0.1.1-rc.x web-search card calls;
 * - dsh 0.1.2+: `remote.credentials` — positional arguments and the
 *   RemoteResult envelope, mounted asynchronously.
 *
 * Either way, the key typed into the edit box must land in the credentials
 * domain — never the reference name, a hint, or any other descriptive text.
 */

import { describe, expect, it, vi } from 'vitest'
import { TavilyCardController } from '../client-src/client.ts'
import type {
  ConnectionService, CredentialView, LegacyCredentialsApi, ModernCredentialsApi, RemoteService,
} from '../client-src/client.ts'
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

/**
 * The 0.1.1-rc.x wire double: `connection.api.credentials` with object
 * arguments and the `{ result }` envelope. Records every call.
 */
function fakeLegacyCredentials(initial: CredentialView = { configured: false, writable: true }) {
  const view: CredentialView = { ...initial }
  const set = vi.fn(async (request: { ref: string; value: string }) => {
    view.configured = true
    return { result: { ok: true } }
  })
  const describe = vi.fn(async (request: { refs: string[] }) => {
    const credentials: Record<string, CredentialView> = {}
    for (const ref of request.refs) credentials[ref] = { ...view }
    return { result: { ok: true, value: { credentials } } }
  })
  const api: LegacyCredentialsApi = { describe, set }
  return { view, set, describe, api, service: { api } as ConnectionService }
}

/** The 0.1.2+ wire double: `remote.credentials`, positional + RemoteResult. */
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
  return { view, set, describe, api, service: { credentials: api } as unknown as RemoteService }
}

const RECOMMENDED = {
  apiKeyEnv: 'TAVILY_API_KEY',
  searchDepth: 'basic',
  maxResults: 5,
  includeAnswer: false,
}

async function settle() { await new Promise((resolve) => setTimeout(resolve, 0)) }

describe('TavilyCardController credentials wire (0.1.1-rc.x legacy face)', () => {
  it('asks connection.api.credentials with the object-argument describe', async () => {
    const legacy = fakeLegacyCredentials()
    new TavilyCardController(new FakeScope(), () => legacy.api, () => undefined)
    await settle()
    expect(legacy.describe).toHaveBeenCalledWith({ refs: ['TAVILY_API_KEY'] })
  })

  it('reports a stored key as configured via describe', async () => {
    const legacy = fakeLegacyCredentials({ configured: true, writable: true })
    const controller = new TavilyCardController(new FakeScope(), () => legacy.api, () => undefined)
    await settle()
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey).toMatchObject({
      configured: true,
      writable: true,
      text: '',
    })
  })

  it('reports a launch-environment-held reference as unwritable', async () => {
    const legacy = fakeLegacyCredentials({ configured: true, writable: false })
    const controller = new TavilyCardController(new FakeScope(), () => legacy.api, () => undefined)
    await settle()
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey).toEqual({
      text: '',
      configured: true,
      writable: false,
    })
  })

  it('saves the typed key through credentials.set and the recommended fields into the section', async () => {
    const scope = new FakeScope()
    const legacy = fakeLegacyCredentials()
    const controller = new TavilyCardController(scope, () => legacy.api, () => undefined)
    await settle()

    const actions = controller.inject()
    actions.applyRecommended(RECOMMENDED)
    actions.edit('apiKey', 'tvly-real-key-123')
    actions.save()
    await settle()

    // The key literal goes to the credentials domain under the reference the
    // section names — never the reference name or any other text as the value.
    expect(legacy.set).toHaveBeenCalledTimes(1)
    expect(legacy.set).toHaveBeenCalledWith({ ref: 'TAVILY_API_KEY', value: 'tvly-real-key-123' })
    // The section receives only the recommended configuration.
    expect(scope.snapshot.user).toEqual(RECOMMENDED)
    const snapshot = controller.inject().hooks.tavilyCard.getSnapshot()
    expect(snapshot.shell).toMatchObject({ dirty: false, failed: false, saving: false })
    expect(snapshot.apiKey).toMatchObject({ configured: true, text: '' })
  })

  it('surfaces the host refusal message when the write is rejected', async () => {
    const scope = new FakeScope()
    const legacy = fakeLegacyCredentials()
    legacy.set.mockResolvedValue({
      result: { ok: false, error: { code: 'credential-rejected', message: 'supplied read-only by the launching environment' } },
    })
    const controller = new TavilyCardController(scope, () => legacy.api, () => undefined)
    await settle()

    const actions = controller.inject()
    actions.edit('apiKey', 'tvly-real-key-123')
    actions.save()
    await settle()

    expect(legacy.set).toHaveBeenCalledWith({ ref: 'TAVILY_API_KEY', value: 'tvly-real-key-123' })
    expect(scope.snapshot.user).toBeNull()
    const snapshot = controller.inject().hooks.tavilyCard.getSnapshot()
    expect(snapshot.shell).toMatchObject({
      dirty: true,
      failed: true,
      failureMessage: 'supplied read-only by the launching environment',
    })
    expect(snapshot.apiKey.text).toBe('tvly-real-key-123')
  })

  it('retries until the credentials face mounts, then reports configured', async () => {
    const legacy = fakeLegacyCredentials({ configured: true, writable: true })
    let api: LegacyCredentialsApi | undefined
    const controller = new TavilyCardController(new FakeScope(), () => api, () => undefined, { delayMs: 5, maxAttempts: 5 })
    await settle()
    // The face has not mounted yet: no crash, and the card stays unconfigured
    // instead of keyless-by-assumption forever.
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey.configured).toBe(false)
    api = legacy.api
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey.configured).toBe(true)
  })

  it('refreshes the credential when the host reports a reference update', async () => {
    const legacy = fakeLegacyCredentials()
    const controller = new TavilyCardController(new FakeScope(), () => legacy.api, () => undefined)
    await settle()
    expect(legacy.describe).toHaveBeenCalledTimes(1)

    legacy.view.configured = true
    controller.refreshCredential('TAVILY_API_KEY')
    await settle()
    expect(legacy.describe).toHaveBeenCalledTimes(2)
    expect(controller.inject().hooks.tavilyCard.getSnapshot().apiKey.configured).toBe(true)
  })
})

describe('TavilyCardController credentials wire (0.1.2+ modern face)', () => {
  it('falls back to remote.credentials with positional arguments', async () => {
    const modern = fakeModernCredentials()
    const controller = new TavilyCardController(new FakeScope(), () => undefined, () => modern.service.credentials)
    await settle()

    const actions = controller.inject()
    actions.edit('apiKey', 'tvly-real-key-123')
    actions.save()
    await settle()

    expect(modern.set).toHaveBeenCalledWith('TAVILY_API_KEY', 'tvly-real-key-123')
    expect(controller.inject().hooks.tavilyCard.getSnapshot().shell).toMatchObject({ dirty: false, failed: false })
  })

  it('prefers the legacy connection.api face when both faces exist', async () => {
    const legacy = fakeLegacyCredentials()
    const modern = fakeModernCredentials()
    const controller = new TavilyCardController(new FakeScope(), () => legacy.api, () => modern.api)
    await settle()

    const actions = controller.inject()
    actions.edit('apiKey', 'tvly-real-key-123')
    actions.save()
    await settle()

    expect(legacy.set).toHaveBeenCalledWith({ ref: 'TAVILY_API_KEY', value: 'tvly-real-key-123' })
    expect(modern.set).not.toHaveBeenCalled()
  })
})
