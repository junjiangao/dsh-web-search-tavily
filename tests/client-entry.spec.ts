/**
 * The client entry: which Plugins page surfaces the bundle claims, and what it
 * hands each one.
 */

import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../client-src/client.ts'
import { TavilyCredentialStatus } from '../client-src/controls.tsx'
import { TAVILY_BUNDLE, TAVILY_ROW_ID } from '../client-src/controller.ts'
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
  manager?: unknown
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
  const services: Record<string, unknown> = {
    remote: options.remote,
    'remote.credentials': options.credentials,
    'remote.pluginManager': options.manager,
  }
  const ctx = {
    locale: {
      register: (namespace: string) => { dictionaries.push(namespace) },
      bind: (namespace: string) => (key: string) => `${namespace}.${key}`,
    },
    slots: {
      inject: (name: string, factory: () => unknown) => {
        injected.push(name)
        // The real service installs the factory as an effect per declaration
        // lifetime and returns an idempotent disposer for the wait; the factory
        // itself returns the registration's disposer.
        const dispose = factory()
        return () => { if (typeof dispose === 'function') dispose() }
      },
      register: (options_: Registration['options'], component: Registration['component']) => {
        const entry = { options: options_, component }
        registrations.push(entry)
        // The real register wraps the entry in the caller's effect and returns
        // that effect's disposer, so a re-key under a new name can retire it.
        return () => {
          const index = registrations.indexOf(entry)
          if (index >= 0) registrations.splice(index, 1)
        }
      },
    },
    configForms: {
      get: () => ({
        getSnapshot: () => section,
        subscribe: () => () => {},
        mutate: async () => true,
      }),
      whileServed: (namespaces: readonly string[], register: (served: ReadonlySet<string>) => () => void) => {
        const dispose = register(new Set(namespaces))
        // The real service runs the entry's disposer when no namespace is
        // served any more; a re-key under a new name relies on that.
        return () => { if (typeof dispose === 'function') dispose() }
      },
    },
    get: (name: string) => services[name],
    inject: (names: readonly string[], callback: (scoped: unknown) => void) => {
      awaited.push([...names])
      // A deployment that mounted neither namespace runs the callback, finds
      // nothing, and the card simply has no key status to report.
      callback({ get: (name: string) => services[name] })
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
  it('requires only the services the card reads', () => {
    expect(inject).toEqual(['slots', 'locale', 'configForms'])
  })

  it('waits for the credentials and manager namespaces instead of injecting them', () => {
    const fake = contextOf()
    apply(fake.ctx as never)
    // Soft, so a deployment that never mounts either namespace still activates.
    expect(fake.awaited).toEqual([['remote', 'remote.credentials'], ['remote', 'remote.pluginManager']])
  })

  it('registers the bundle configuration surface and nothing else', () => {
    const fake = contextOf()
    apply(fake.ctx as never)
    expect(fake.dictionaries).toEqual([NS])
    // The bundle's own page, never `plugins.row.config` (a second entry behind
    // the row's configure control for the same form) and never `plugins.item`
    // (that slot lists the official host-plane settings pages beside the
    // official bundles, and a bundle's card there would show the default glyph
    // whatever its manifest declares — the artwork map is keyed to the four
    // shipped item ids).
    expect(fake.injected).toEqual(['plugins.bundle.config'])
    expect(fake.registrations).toHaveLength(1)
    // With no manager answering, the package's own name is the key.
    expect(fake.registrations[0]?.options.name).toBe('plugins.bundle.config')
    expect(fake.registrations[0]?.options.key).toBe(TAVILY_BUNDLE)
  })

  it('re-keys the surface to the name the profile declares', async () => {
    // A profile that installed this package before the rename still declares it
    // as `@deepseek-ai/dsh-web-search-tavily`, and the Plugins page dispatches
    // that declared name — not the package's own. A real-name key therefore
    // renders nothing at all.
    const declared = '@deepseek-ai/dsh-web-search-tavily'
    const manager = {
      listBundles: async () => ({
        ok: true,
        value: [
          { name: 'dsh-web-mcp-manager', rows: [{ rowId: 'web-mcp-manager', moduleName: 'dsh-web-mcp-manager' }] },
          { name: declared, rows: [{ rowId: TAVILY_ROW_ID, moduleName: TAVILY_BUNDLE }] },
        ],
      }),
    }
    const fake = contextOf({ manager })
    apply(fake.ctx as never)
    await vi.waitFor(() => {
      expect(fake.registrations[0]?.options.key).toBe(declared)
    })
    // The package-name registration is gone, not shadowed by a second one.
    expect(fake.registrations).toHaveLength(1)
  })

  it('keeps the package-name key when the manager refuses to answer', () => {
    const manager = { listBundles: async () => { throw new Error('no management') } }
    const fake = contextOf({ manager })
    apply(fake.ctx as never)
    expect(fake.registrations[0]?.options.key).toBe(TAVILY_BUNDLE)
    expect(fake.registrations).toHaveLength(1)
  })

  it('renders a summary and a form through the card', () => {
    const fake = contextOf()
    apply(fake.ctx as never)
    expect(fake.registrations).toHaveLength(1)
    for (const registration of fake.registrations) {
      expect(registration.component({ view: 'summary' })).toBeDefined()
      expect(registration.component({ view: 'page' })).toBeDefined()
    }
  })

  it('renders the card without a credentials domain', () => {
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
      // The reference travels as `reference`: a prop named `ref` is React's own
      // attribute, and a string value there is a legacy string ref React
      // rejects with error #290 — which crashed this card in both slots.
      expect(status?.props['reference']).toBe('TAVILY_API_KEY')
      expect(status?.props['ref']).toBeUndefined()
      expect(status?.props['configured']).toBe(true)
      expect(status?.props['configuredLabel']).toBe(`${NS}.credentialConfigured`)
    })
  })
})
