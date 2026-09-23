/**
 * Test stub for `react/jsx-runtime` — the shell's module table resolves the
 * real one. The automatic runtime's calls are recorded as plain descriptors so
 * a spec can assert what a card rendered without a DOM.
 *
 * One rule of the real runtime is reproduced rather than recorded: `ref` is
 * React's own attribute, and a **string** ref reaches no component. React 18
 * rejects it with error #290 ("Element ref was specified as a string (%s) but
 * no owner was set"), which surfaces in the shell as `slot entry crashed`
 * instead of a rendered card. A stub that accepted it silently would let a
 * prop named `ref` pass every spec and still break the page, so it throws here.
 */

/** Fragment marker, standing in for the runtime's own. */
export const Fragment = Symbol('Fragment')

/**
 * Record one element, rejecting the string ref React rejects.
 * @param type - the element type.
 * @param props - the element props.
 * @param key - the element key.
 * @returns a descriptor a spec can inspect.
 */
export function jsx(type: unknown, props: unknown, key?: unknown): unknown {
  const ref = (props as { ref?: unknown } | null | undefined)?.ref
  if (typeof ref === 'string') {
    throw new Error(
      `Element ref was specified as a string (${ref}) but no owner was set.`
      + ' This could happen for one of the following reasons:'
      + '\n1. You may be adding a ref to a function component'
      + '\n2. You may be adding a ref to a component that was not created inside a component\'s render method'
      + '\n3. You have multiple copies of React loaded'
      + '\nSee https://reactjs.org/link/refs-must-have-owner for more information.',
    )
  }
  return { type, props, key }
}

export const jsxs = jsx

/**
 * The development runtime's element recorder, carrying the same descriptor.
 * @param type - the element type.
 * @param props - the element props.
 * @param key - the element key.
 * @returns a descriptor a spec can inspect.
 */
export function jsxDEV(type: unknown, props: unknown, key?: unknown): unknown {
  return jsx(type, props, key)
}
