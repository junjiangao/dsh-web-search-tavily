/**
 * The client entry: which Plugins page surfaces the bundle claims, and what it
 * hands each one.
 */

import { describe, expect, it } from 'vitest'
import { apply, inject, TAVILY_ITEM_ORDER } from '../client-src/client.ts'
import { TAVILY_ROW_CONFIG_KEY, TAVILY_SETTINGS_NS } from '../client-src/controller.ts'
import { NS } from '../client-src/locales.ts'

/** One registration as the entry made it. */
interface Registration {
  readonly options: {
    readonly name: string
    readonly id?: string
    readonly key?: string
    readonly order?: number
    readonly label?: () => string
    readonly locale?: string
  }
  readonly component: (props: unknown) => unknown
}

/** A browser context recording every surface the entry claims. */
function contextOf(remote?: unknown) {
  const registrations: Registration[] = []
  const injected: string[] = []
  const awaited: string[][] = []
  const dictionaries: string[] = []
  const section = {
    status: 'ready' as const,
    value: { apiKeyEnv: 'TAVILY_API_KEY', maxResults: 5 },
    base: {},
    user: {},
    writable: true,
    revision: 1,
  }
  const ctx = {
    locale: {
      register: (namespace: string) => { dictionaries.push(namespace) },
      bind: (namespace: string) => (key: string) => `${namespace}.${key}`,
    },
    slots: {
      inject: (name: string, factory: () => unknown) => { injected.push(name); factory() },
      register: (options: Registration['options'], component: Registration['component']) => {
        registrations.push({ options, component })
        return { dispose: () => {} }
      },
    },
    configForms: {
      get: () => ({
        getSnapshot: () => section,
        subscribe: () => () => {},
        mutate: async () => true,
      }),
      whileServed: (namespaces: readonly string[], register: (served: ReadonlySet<string>) => () => void) => {
        register(new Set(namespaces))
        return () => {}
      },
    },
    get: (name: string) => name === 'remote' ? remote : undefined,
    inject: (names: readonly string[], callback: (scoped: unknown) => void) => {
      awaited.push([...names])
      // A deployment that mounted neither namespace: the callback runs, finds
      // nothing, and the card simply has no key status to report.
      callback({ get: () => undefined })
      return { dispose: () => {} }
    },
    effect: (callback: () => void | (() => void)) => {
      const disposer = callback()
      return () => { if (typeof disposer === 'function') disposer() }
    },
  }
  return { ctx, registrations, injected, awaited, dictionaries }
}

describe('client entry surfaces', () => {
  it('requires only the services both cards read', () => {
    expect(inject).toEqual(['slots', 'locale', 'configForms'])
  })

  it('waits for the credentials namespace instead of injecting it', () => {
    const fake = contextOf()
    apply(fake.ctx as never)
    // Soft, so a deployment that never mounts the namespace still activates.
    expect(fake.awaited).toEqual([['remote', 'remote.credentials']])
  })

  it('registers the Official group card and the bundle row control', () => {
    const fake = contextOf()
    apply(fake.ctx as never)
    expect(fake.dictionaries).toEqual([NS])
    expect(fake.injected).toEqual(['plugins.item', 'plugins.row.config'])

    const item = fake.registrations.find(entry => entry.options.name === 'plugins.item')
    // The id is the namespace the Host serves: that is what lets the page hand
    // this entry's configuration form to the card it opens.
    expect(item?.options.id).toBe(TAVILY_SETTINGS_NS)
    expect(item?.options.order).toBe(TAVILY_ITEM_ORDER)
    expect(item?.options.locale).toBe(NS)
    expect(item?.options.label?.()).toBe(`${NS}.title`)

    const row = fake.registrations.find(entry => entry.options.name === 'plugins.row.config')
    expect(row?.options.key).toBe(TAVILY_ROW_CONFIG_KEY)
  })

  it('renders a summary and a form through both cards', () => {
    const fake = contextOf()
    apply(fake.ctx as never)
    expect(fake.registrations).toHaveLength(2)
    for (const registration of fake.registrations) {
      expect(registration.component({ view: 'summary' })).toBeDefined()
      expect(registration.component({ view: 'page' })).toBeDefined()
    }
  })

  it('renders both cards without a credentials domain', () => {
    const fake = contextOf()
    apply(fake.ctx as never)
    const page = fake.registrations[0]?.component({ view: 'page' }) as { props: { children: unknown[] } }
    // No credential line: the deployment exposes no remote service to ask.
    expect(JSON.stringify(page.props.children[0])).not.toContain('credential')
  })
})
