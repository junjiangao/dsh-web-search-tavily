/**
 * Test stub for `@deepseek-ai/dsh-client-runtime/client` — the real module
 * only exists inside the DSH Web shell. The stub implements the exact
 * snapshot-store surface the client code uses.
 */

export interface SnapshotStore<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
  set(value: T): void
  update(recipe: (draft: T) => void): void
}

export function createSnapshotStore<T>(initial: T): SnapshotStore<T> {
  let snapshot = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: (value) => {
      snapshot = value
      for (const listener of listeners) listener()
    },
    update: (recipe) => {
      const draft = structuredClone(snapshot)
      recipe(draft)
      snapshot = draft
      for (const listener of listeners) listener()
    },
  }
}
