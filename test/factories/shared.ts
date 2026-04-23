/**
 * Shared, auto-incrementing counters used by all test-data factories.
 *
 * Each factory calls `nextId('user')`, `nextId('course')`, etc.
 * to produce unique sequential values per entity type.
 *
 * Call `resetFactoryCounters()` in `beforeEach` / `beforeAll`
 * to keep test runs deterministic.
 */

const counters: Record<string, number> = {};

export function nextId(prefix: string): number {
  if (!(prefix in counters)) {
    counters[prefix] = 0;
  }
  return ++counters[prefix];
}

export function resetFactoryCounters(): void {
  for (const key of Object.keys(counters)) {
    counters[key] = 0;
  }
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type FactoryFn<T> = (overrides?: DeepPartial<T>) => T;
