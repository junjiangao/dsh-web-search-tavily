/**
 * The test double reproduces the one runtime rule a card can trip over without
 * any DOM: React owns `ref`, and a string ref reaches no component.
 *
 * This is a regression gate, not a curiosity. A prop named `ref` on a function
 * component typechecks (the props interface can declare it) and records
 * perfectly in a naive stub, then throws in the browser — React 18 error #290,
 * "Element ref was specified as a string (%s) but no owner was set" — and the
 * shell reports `slot entry crashed` for every slot the card registered, so the
 * settings surface disappears instead of rendering.
 */

import { describe, expect, it } from 'vitest'
import { jsx, jsxDEV, jsxs } from './stubs/jsx-runtime.ts'

function Probe(props: { readonly label: string }) {
  return props.label
}

describe('jsx-runtime stub', () => {
  it('records an element as a descriptor', () => {
    const element = jsx('code', { className: 'x' }) as { type: unknown; props: unknown }
    expect(element.type).toBe('code')
    expect(element.props).toEqual({ className: 'x' })
  })

  it('rejects a string ref the way React does, whichever runtime entry is used', () => {
    const expected = /Element ref was specified as a string \(TAVILY_API_KEY\)/
    expect(() => jsx(Probe, { label: 'a', ref: 'TAVILY_API_KEY' })).toThrow(expected)
    expect(() => jsxs(Probe, { label: 'a', ref: 'TAVILY_API_KEY' })).toThrow(expected)
    expect(() => jsxDEV(Probe, { label: 'a', ref: 'TAVILY_API_KEY' })).toThrow(expected)
  })

  it('leaves a real ref alone: React owns it, the component never sees it', () => {
    const ref = { current: null }
    const element = jsx(Probe, { label: 'a', ref }) as { props: Record<string, unknown> }
    expect(element.props['ref']).toBe(ref)
  })
})
