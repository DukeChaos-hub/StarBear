// Extends Vitest's `expect` with @testing-library/jest-dom matchers
// (toBeInTheDocument, toHaveTextContent, etc.) and silences a few noisy
// console.error calls that React 19 emits during expected render trees.
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't ship a ResizeObserver; cmdk needs one when its dialog mounts.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom doesn't ship matchMedia; some libs probe for it.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// jsdom's HTMLElement doesn't implement scrollIntoView; cmdk calls it on
// highlighted items in the command list. Polyfill on the prototype.
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = function () {};
}

afterEach(() => {
  cleanup();
});
