/**
 * Test stub for `react/jsx-runtime` — the shell's module table resolves the
 * real one. The automatic runtime's calls are recorded as plain descriptors so
 * a spec can assert what a card rendered without a DOM.
 */

/** Fragment marker, standing in for the runtime's own. */
export const Fragment = Symbol('Fragment')

/**
 * Record one element.
 * @param type - the element type.
 * @param props - the element props.
 * @param key - the element key.
 * @returns a descriptor a spec can inspect.
 */
export function jsx(type: unknown, props: unknown, key?: unknown): unknown {
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
  return { type, props, key }
}
