/** Tavily 的配置、只写凭据和共享 Web provider 选择。 */
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel, settingsTextField,
  type SettingsFieldState, type SettingsFormActions, type SettingsFormLabels,
  type SettingsFormScope, type SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { CredentialsRemote, RemoteService, SettingsDescribeFace } from './context.ts'
import { specOf, TAVILY_FIELDS, type TavilyField } from './fields.ts'

export const DEFAULT_API_KEY_REF = 'TAVILY_API_KEY'
export const TAVILY_SETTINGS_NS = 'web-search-tavily'
export const TAVILY_BUNDLE = '@junjiangao/dsh-web-search-tavily'
export const TAVILY_ROW_ID = 'web-search-tavily'
export type TavilySettings = Record<string, unknown>

export interface TavilyCredentialState {
  readonly ref: string
  readonly configured: boolean
  readonly writable: boolean
}

export interface TavilyCardState extends SettingsFormShell {
  readonly fields: Readonly<Record<string, SettingsFieldState>>
  readonly credential?: TavilyCredentialState | undefined
  readonly configWritable: boolean
  readonly keyWritable: boolean
  readonly literalKey: boolean
  readonly enabled: boolean
  readonly selectionWritable: boolean
}

export interface TavilyCardFace {
  readonly fields: readonly TavilyField[]
  readonly store: SnapshotStore<TavilyCardState>
  readonly actions: SettingsFormActions & { select(enabled: boolean): void }
  readonly labels: SettingsFormLabels
  readonly t: (key: string) => string
}

export class TavilyCardController {
  private readonly form: SettingsFormModel<TavilySettings>
  private readonly selection: SettingsFormModel<TavilySettings> | undefined
  private readonly store: SnapshotStore<TavilyCardState>
  private credential: TavilyCredentialState | undefined
  private credentials: CredentialsRemote | undefined
  private detachCredentials: (() => void) | undefined
  private readonly disposers: Array<() => void> = []
  private generation = 0
  private disposed = false
  private saving = false
  private failed = false
  private previous: { searchProvider: string; fetchProvider: string } | undefined

  constructor(
    private readonly scope: SettingsFormScope<TavilySettings>,
    private readonly web?: SettingsFormScope<TavilySettings>,
    private readonly describe?: SettingsDescribeFace,
  ) {
    // 凭据有独立的写权限；普通字段仍由原始 scope 检查权限和 revision。
    this.form = new SettingsFormModel({
      getSnapshot: () => ({ ...scope.getSnapshot(), writable: scope.getSnapshot().writable || this.keyWritable() }),
      subscribe: listener => scope.subscribe(listener),
      mutate: (ops, revision) => scope.mutate(ops, revision),
    }, TAVILY_FIELDS.filter(field => field.kind !== 'password').map(specOf), [
      { field: 'apiKey', write: value => this.writeKey(value) },
    ])
    this.selection = web === undefined ? undefined : new SettingsFormModel(web, [
      settingsTextField('searchProvider'), settingsTextField('fetchProvider'),
    ])
    this.store = createSnapshotStore(this.projection())
    for (const form of [this.form, this.selection]) {
      if (form !== undefined) this.disposers.push(form.bind(() => this.projection()).subscribe(() => this.publish()))
    }
    this.disposers.push(scope.subscribe(() => { void this.readCredential() }))
    if (describe !== undefined) this.disposers.push(describe.subscribe(() => this.publish()))
  }

  /** 每次远端重挂都重建订阅；旧请求和旧 disposer 不影响新连接。 */
  attachCredentials(remote: RemoteService, credentials: CredentialsRemote): () => void {
    this.detachCredentials?.()
    if (this.disposed) return () => {}
    this.credentials = credentials
    const off = remote.$on('credentials/reference-updated', ref => {
      if (ref === refOf(this.scope.getSnapshot().value)) void this.readCredential()
    })
    const detach = (): void => {
      if (this.detachCredentials !== detach) return
      off()
      this.generation++
      this.credentials = undefined
      this.credential = undefined
      this.detachCredentials = undefined
      this.publish()
    }
    this.detachCredentials = detach
    void this.readCredential()
    return detach
  }

  inject(): Pick<TavilyCardFace, 'store' | 'actions'> {
    const actions = this.form.actions()
    return {
      store: this.store,
      actions: {
        edit: (field, text) => { if (!this.saving) { this.failed = false; actions.edit(field, text) } },
        resetField: field => { if (!this.saving) { this.failed = false; actions.resetField(field) } },
        save: () => { void this.save() },
        discard: () => {
          if (this.saving) return
          this.failed = false
          actions.discard()
          this.selection?.actions().discard()
          this.previous = undefined
          this.publish()
        },
        select: enabled => this.select(enabled),
      },
    }
  }

  dispose(): void {
    this.disposed = true
    this.detachCredentials?.()
    this.generation++
    for (const dispose of this.disposers.splice(0)) dispose()
    this.form.dispose()
    this.selection?.dispose()
  }

  private select(enabled: boolean): void {
    if (this.saving || this.selection === undefined || !this.web?.getSnapshot().writable) return
    this.failed = false
    const snapshot = this.web.getSnapshot()
    const current = snapshot.value
    if (enabled && current?.searchProvider !== 'tavily') {
      this.previous = {
        searchProvider: stringOf(current?.searchProvider, 'deepseek-official'),
        fetchProvider: stringOf(current?.fetchProvider, 'http'),
      }
    }
    const settings = this.scope.getSnapshot().value
    const base = snapshot.base as TavilySettings | undefined
    const inheritedSearch = stringOf(base?.searchProvider, 'deepseek-official')
    const target = enabled ? { searchProvider: 'tavily', fetchProvider: 'http' } : {
      searchProvider: this.previous?.searchProvider ?? stringOf(settings?.previousSearchProvider,
        inheritedSearch === 'tavily' ? 'deepseek-official' : inheritedSearch),
      fetchProvider: this.previous?.fetchProvider ?? stringOf(settings?.previousFetchProvider, stringOf(base?.fetchProvider, 'http')),
    }
    // 保存前再次关闭开关，只撤销选择草稿。
    if (!enabled && current?.searchProvider !== 'tavily') {
      this.selection.actions().discard()
      this.previous = undefined
    } else {
      for (const [key, value] of Object.entries(target)) {
        if (base?.[key] === value) this.selection.actions().resetField(key)
        else this.selection.actions().edit(key, value)
      }
    }
    this.publish()
  }

  private async save(): Promise<void> {
    if (this.saving || this.disposed || this.projection().invalid) return
    this.saving = true
    this.failed = false
    this.publish()
    try {
      await this.form.save()
      if (this.disposed) return
      if (this.form.shell().failed || this.form.shell().dirty) { this.failed = true; return }
      this.form.actions().discard()
      if (this.selection?.shell().dirty && this.previous !== undefined) {
        const snapshot = this.scope.getSnapshot()
        if (!await this.scope.mutate([
          { op: 'set', path: ['previousSearchProvider'], value: this.previous.searchProvider },
          { op: 'set', path: ['previousFetchProvider'], value: this.previous.fetchProvider },
        ], snapshot.revision)) { this.failed = true; return }
      }
      if (this.disposed) return
      await this.selection?.save()
      if (this.selection?.shell().failed || this.selection?.shell().dirty) this.failed = true
      else {
        this.selection?.actions().discard()
        this.previous = undefined
      }
    } catch {
      this.failed = true
    } finally {
      this.saving = false
      this.publish()
    }
  }

  private async writeKey(value: string): Promise<boolean> {
    const credentials = this.credentials
    if (credentials === undefined || this.disposed) return false
    const snapshot = this.scope.getSnapshot()
    const ref = refOf(snapshot.value)
    const view = await credentials.describe([ref])
    if (!view.ok || !view.value[ref]?.writable || this.disposed || credentials !== this.credentials
      || ref !== refOf(this.scope.getSnapshot().value)) return false
    const result = await credentials.set(ref, value)
    if (!result.ok || this.disposed || credentials !== this.credentials
      || ref !== refOf(this.scope.getSnapshot().value)) return false
    // 旧配置的字面密钥优先级更高。显式切到凭据引用，无须读回或重写旧密钥。
    if (this.literalKey() && !await this.scope.mutate([
      { op: 'set', path: ['useCredential'], value: true },
    ], snapshot.revision)) return false
    await this.readCredential()
    return true
  }

  private async readCredential(): Promise<void> {
    const generation = ++this.generation
    const credentials = this.credentials
    const ref = refOf(this.scope.getSnapshot().value)
    this.credential = undefined
    this.publish()
    if (credentials === undefined || this.disposed) return
    try {
      const response = await credentials.describe([ref])
      if (this.disposed || generation !== this.generation || credentials !== this.credentials
        || ref !== refOf(this.scope.getSnapshot().value) || !response.ok) return
      const view = response.value[ref]
      if (view === undefined) return
      this.credential = { ref, configured: view.configured, writable: view.writable }
      this.publish()
    } catch {
      // 未知状态不能显示为“未配置”，也不能保留另一引用的旧结果。
    }
  }

  private literalKey(): boolean {
    if (this.scope.getSnapshot().value?.useCredential === true) return false
    const value = this.scope.getSnapshot().value?.apiKey
    if (typeof value === 'string' && value.trim() !== '') return true
    return this.describe?.getSnapshot().view?.namespaces.find(row => row.ns === TAVILY_SETTINGS_NS)
      ?.secrets?.some(secret => secret.path.length === 1 && secret.path[0] === 'apiKey' && secret.set) ?? false
  }

  private keyWritable(): boolean {
    return this.credentials !== undefined && this.credential?.writable === true
      && (!this.literalKey() || this.scope.getSnapshot().writable)
  }

  private publish(): void {
    if (!this.disposed) this.store.set(this.projection())
  }

  private projection(): TavilyCardState {
    const fields = Object.fromEntries(TAVILY_FIELDS.map(field => [field.field, this.form.field(field.field)]))
    const form = this.form.shell()
    const selection = this.selection?.shell()
    const literalKey = this.literalKey()
    const selected = this.selection?.field('searchProvider').text === 'tavily'
      && this.selection.field('fetchProvider').text === 'http'
    return {
      ...form,
      writable: form.writable || selection?.writable === true,
      dirty: form.dirty || selection?.dirty === true,
      invalid: form.invalid || selection?.invalid === true,
      saving: this.saving,
      failed: this.failed || form.failed || selection?.failed === true,
      fields,
      credential: literalKey ? { ref: 'apiKey', configured: true, writable: this.keyWritable() } : this.credential,
      configWritable: this.scope.getSnapshot().writable,
      keyWritable: this.keyWritable(),
      literalKey,
      enabled: selected,
      selectionWritable: selection?.available === true && selection.writable && this.scope.getSnapshot().writable,
    }
  }
}

function refOf(section: TavilySettings | undefined): string {
  return stringOf(section?.apiKeyEnv, DEFAULT_API_KEY_REF)
}

function stringOf(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}
