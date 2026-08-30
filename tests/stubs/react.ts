/**
 * Test stub for `react` — client.ts imports it at module scope, and the
 * controller tests exercise the model/controller layers only, never render.
 */

export function createElement(type: unknown, props: unknown, ...children: unknown[]): unknown {
  return { type, props, children }
}

export function useState(initial: unknown): [unknown, (next: unknown) => void] {
  return [initial, () => {}]
}

export function useEffect(_effect: unknown, _deps?: unknown): void {}

export function useRef(initial: unknown): { current: unknown } {
  return { current: initial }
}
