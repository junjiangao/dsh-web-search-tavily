/**
 * Test stub for `react` — the shell's module table resolves the real one.
 * Controller and field tests never render, so the hook surface is inert.
 */

export function createElement(type: unknown, props: unknown, ...children: unknown[]): unknown {
  return { type, props, children }
}

export function useSyncExternalStore<T>(
  _subscribe: (listener: () => void) => () => void,
  getSnapshot: () => T,
): T {
  return getSnapshot()
}
