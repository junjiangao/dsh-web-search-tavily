/**
 * Test stub for `react` — the shell's module table resolves the real one.
 * Controller and field tests never render, so the hook surface is inert.
 */

export function createElement(type: unknown, props: unknown, ...children: unknown[]): unknown {
  return { type, props, children }
}

/** Inert: the disclosure's staged state never needs to change in a tree test. */
export function useState<T>(initial: T): [T, (next: T) => void] {
  return [initial, () => {}]
}

export function useSyncExternalStore<T>(
  _subscribe: (listener: () => void) => () => void,
  getSnapshot: () => T,
): T {
  return getSnapshot()
}
