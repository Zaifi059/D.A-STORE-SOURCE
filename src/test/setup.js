import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

const storage = new Map();
const localStorageShim = {
  getItem: (key) => storage.get(String(key)) ?? null,
  setItem: (key, value) => storage.set(String(key), String(value)),
  removeItem: (key) => storage.delete(String(key)),
  clear: () => storage.clear(),
  key: (index) => [...storage.keys()][index] ?? null,
  get length() { return storage.size; },
};

Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageShim });
Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorageShim });

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom does not implement matchMedia; framer-motion reads it for reduced-motion.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}
