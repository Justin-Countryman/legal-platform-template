import {afterEach, vi} from 'vitest'
import {cleanup} from '@testing-library/react'

// `next-sanity/image` (used by <SanityImage>) imports `next/image` with no file
// extension, which Node's ESM resolver rejects under Vitest ("Cannot find module
// .../next/image"). Production (Next's bundler) resolves it fine. Stub the loader
// here so importing <SanityImage> doesn't pull the real module into the test env;
// individual component tests still mock `next/image` itself for render assertions.
vi.mock('next-sanity/image', () => ({
  imageLoader: ({src, width, quality}: {src: string; width: number; quality?: number}) =>
    `${src}&w=${width}${quality ? `&q=${quality}` : ''}`,
}))

// Vitest doesn't auto-cleanup React Testing Library renders between tests
// (unlike Jest with @testing-library/react v9+ default cleanup). Without this,
// `screen.getByRole(...)` finds elements from previous renders and throws.
afterEach(() => {
  cleanup()
})
