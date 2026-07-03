import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"

afterEach(() => cleanup())

// ── jsdom gaps the components rely on ──────────────────────────────────────
// Defined unconditionally: jsdom ships a non-functional matchMedia stub, and
// framer-motion's reduced-motion init calls .addListener on the result.
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
// @ts-expect-error jsdom lacks these
globalThis.ResizeObserver = globalThis.ResizeObserver || MockObserver
// @ts-expect-error jsdom lacks these
globalThis.IntersectionObserver = globalThis.IntersectionObserver || MockObserver

if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn()
// @ts-expect-error scrollTo missing on Element in jsdom
if (!Element.prototype.scrollTo) Element.prototype.scrollTo = vi.fn()
