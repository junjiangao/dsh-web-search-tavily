/**
 * The card's own stylesheet: what it installs, that installing twice is a
 * no-op, and that every class the controls render has a rule behind it.
 */

import { describe, expect, it } from 'vitest'
import { installTavilyStyles, TAVILY_CLASS, TAVILY_CSS, TAVILY_STYLE_ELEMENT_ID } from '../client-src/styles.ts'

/** A `Document` stand-in recording what was appended. */
function documentStub() {
  const appended: Array<{ id: string; textContent: string }> = []
  const head = { appendChild: (node: unknown) => { appended.push(node as { id: string; textContent: string }); return node } }
  return {
    appended,
    target: {
      getElementById: (id: string) => appended.find(node => node.id === id) ?? null,
      createElement: (_tag: string) => ({ id: '', textContent: '' }),
      head,
    },
  }
}

describe('card stylesheet', () => {
  it('installs one style element carrying the rules', () => {
    const { appended, target } = documentStub()
    expect(installTavilyStyles(target)).toBe(TAVILY_STYLE_ELEMENT_ID)
    expect(appended).toHaveLength(1)
    expect(appended[0]?.id).toBe(TAVILY_STYLE_ELEMENT_ID)
    expect(appended[0]?.textContent).toBe(TAVILY_CSS)
  })

  it('installs nothing on a second call', () => {
    const { appended, target } = documentStub()
    installTavilyStyles(target)
    expect(installTavilyStyles(target)).toBe(TAVILY_STYLE_ELEMENT_ID)
    expect(appended).toHaveLength(1)
  })

  it('skips a host with no document at all', () => {
    // The test runner is that host: `document` is undefined, and the entry
    // still applies without one.
    expect(installTavilyStyles()).toBeUndefined()
  })

  it('gives every class the card renders a rule, and every rule a class', () => {
    for (const [name, className] of Object.entries(TAVILY_CLASS)) {
      expect(TAVILY_CSS, name).toContain(`.${className}`)
    }
    // One selector per rule, so a stray rule cannot hide an unused class.
    const selectors = TAVILY_CSS.split('{').slice(0, -1).map(block => block.split('}').pop() ?? '')
    const classes = new Set(Object.values(TAVILY_CLASS) as string[])
    for (const selector of selectors) {
      const named = [...classes].some(className => selector.includes(className))
      expect(named, selector.trim()).toBe(true)
    }
  })

  it('reads the shell\u2019s tokens rather than hard-coded colours', () => {
    // The one exception is the select's chevron: a data-URI SVG cannot resolve
    // a CSS variable, which is why it carries the shell's caption gray — and
    // the comment saying so names it too.
    const declarations = TAVILY_CSS
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/url\("data:[^"]*"\)/g, '')
    expect(declarations).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(declarations).not.toMatch(/\brgba?\(/)
    expect(TAVILY_CSS).toContain('var(--dsw-alias-')
  })

  it('pairs every capsule radius with the round corner shape', () => {
    // The shell's global superellipse squares off a full-round radius unless
    // the rule opts out, so no rule here may use one without the other.
    const blocks = TAVILY_CSS.split('}')
    for (const block of blocks) {
      if (!/border-radius:\s*(?:50%|999px|10px)/.test(block)) continue
      expect(block, block.trim()).toContain('corner-shape: round')
    }
  })
})
