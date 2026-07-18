/**
 * Simulated network layer for mock services.
 *
 * Every `services/*.service.ts` function returns a Promise shaped exactly
 * like a future `fetch()` call would (same params, same resolved shape).
 * Swapping mock storage for real HTTP later only touches the body of these
 * functions — call sites in pages/hooks never change.
 */

let idCounter = 1000;

export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function delay<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), ms);
  });
}
