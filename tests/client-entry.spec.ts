/**
 * The client entry: which Plugins page surfaces the bundle claims, and what it
 * hands each one.
 */

import { describe, expect, it, vi } from 'vitest'
import { apply, inject, TAVILY_ITEM_ORDER } from '../client-src/client.ts'
import { TavilyCredentialStatus } from '../client-src/controls.tsx'
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

/** One rendered element descriptor, as the JSX stub records it. */
interface Element {
  readonly type: unknown
  readonly props: Record<string, unknown>
}

/** Every element of a rendered tree, depth first, ignoring text nodes. */
function elementsOf(node: unknown): Element[] {
  // A `.map` in a JSX child list yields a nested array, which the real
  // runtime flattens; this walk has to do the same or it stops at a fragment.
  if (Array.isArray(node)) return node.flatMap(elementsOf)
  if (node === null || typeof node !== 'object') return []
  const element = node as Partial<Element>
  if (element.props === undefined) return []
  return [element as Element, ...elementsOf(element.props['children'])]
}

/** The staged props of every rendered field, keyed by field name. */
function controlPropsOf(page: unknown): Map<string, Record<string, unknown>> {
  const found = new Map<string, Record<string, unknown>>()
  for (const element of elementsOf(page)) {
    const label = element.props['label']
    const prefix = `${NS}.field.`
    if (typeof label === 'string' && label.startsWith(prefix)) {
      found.set(label.slice(prefix.length), element.props)
    }
  }
  return found
}

/** A browser context recording every surface the entry claims. */
function contextOf(options: {
  remote?: unknown
  credentials?: unknown
  value?: Record<string, unknown>
} = {}) {
  const registrations: Registration[] = []
  const injected: string[] = []
  const awaited: string[][] = []
  const dictionaries: string[] = []
  const section = {
    status: 'ready' as const,
    value: options.value ?? { apiKeyEnv: 'TAVILY_API_KEY', searchDepth: 'basic' },
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
      register: (options_: Registration['options'], component: Registration['component']) => {
        registrations.push({ options: options_, component })
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
    get: (name: string) => name === 'remote' ? options.remote : undefined,
    inject: (names: readonly string[], callback: (scoped: unknown) => void) => {
      awaited.push([...names])
      // A deployment that mounted neither namespace: the callback runs, finds
      // nothing, and the card simply has no key status to report.
      callback({ get: (name: string) => name === 'remote' ? options.remote : options.credentials })
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
    const page = fake.registrations[0]?.component({ view: 'page' })
    // No status row: the deployment exposes no remote service to ask.
    expect(elementsOf(page).some(element => element.type === TavilyCredentialStatus)).toBe(false)
  })

  it('draws three sections, folding only the advanced one', () => {
    const fake = contextOf()
    apply(fake.ctx as never)
    const page = fake.registrations[0]?.component({ view: 'page' })
    const sections = elementsOf(page).filter(element => element.props['data-tavily-group'] !== undefined)
    expect(sections.map(section => section.props['data-tavily-group']))
      .toEqual(['credential', 'search', 'advanced'])
    // The folded section keeps its controls in the tree behind `hidden`, so its
    // disclosure can still name the panel it opens.
    const panels = elementsOf(sections[2]).filter(element => element.type === 'div')
    expect(panels[0]?.props['hidden']).toBe(true)
    expect(panels[0]?.props['id']).toBe('plugin-config-tavily-panel-advanced')
    const disclosure = elementsOf(sections[2]).find(element => element.type === 'button')
    expect(disclosure?.props['aria-expanded']).toBe(false)
    expect(disclosure?.props['aria-controls']).toBe(panels[0]?.props['id'])
  })

  it('locks a control until the companion value it needs is staged', () => {
    const locked = contextOf()
    apply(locked.ctx as never)
    const lockedProps = controlPropsOf(locked.registrations[0]?.component({ view: 'page' }))
    // The section carries no language and no domains.
    expect(lockedProps.get('language')?.['disabled']).toBe(false)
    expect(lockedProps.get('filterByLanguage')?.['disabled']).toBe(true)
    expect(lockedProps.get('includeDomainsMode')?.['disabled']).toBe(true)
    expect(lockedProps.get('includePublishedDate')?.['disabled']).toBe(false)
    // A locked control says why instead of repeating what it would do.
    expect(lockedProps.get('filterByLanguage')?.['hint']).toBe(`${NS}.locked.filterByLanguage`)
    expect(lockedProps.get('includeDomainsMode')?.['hint']).toBe(`${NS}.locked.includeDomainsMode`)

    // `includeDomains` is a list field, so the section holds an array.
    const open = contextOf({ value: { language: 'zh', includeDomains: ['a.com'] } })
    apply(open.ctx as never)
    const openProps = controlPropsOf(open.registrations[0]?.component({ view: 'page' }))
    expect(openProps.get('filterByLanguage')?.['disabled']).toBe(false)
    expect(openProps.get('includeDomainsMode')?.['disabled']).toBe(false)
    expect(openProps.get('filterByLanguage')?.['hint']).toBe(`${NS}.hint.filterByLanguage`)
  })

  it('reports the resolved credential reference beside its state', async () => {
    const fake = contextOf({
      remote: { $on: () => () => {} },
      credentials: {
        describe: async (refs: readonly string[]) => ({
          ok: true,
          value: Object.fromEntries(refs.map(ref => [ref, { configured: true, writable: true }])),
        }),
      },
    })
    apply(fake.ctx as never)
    // The read is asynchronous, so the row lands a microtask after apply.
    await vi.waitFor(() => {
      const status = elementsOf(fake.registrations[0]?.component({ view: 'page' }))
        .find(element => element.type === TavilyCredentialStatus)
      expect(status?.props['ref']).toBe('TAVILY_API_KEY')
      expect(status?.props['configured']).toBe(true)
      expect(status?.props['configuredLabel']).toBe(`${NS}.credentialConfigured`)
    })
  })
})
