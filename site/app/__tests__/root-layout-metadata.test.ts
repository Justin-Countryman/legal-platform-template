import {describe, it, expect, vi, beforeEach} from 'vitest'

// Importing the root layout pulls in `import './globals.css'`; stub it so Vite
// doesn't run it through Tailwind v4's PostCSS during the test transform.
// Resolves to the same absolute path as the layout's relative `./globals.css`.
vi.mock('@/app/globals.css', () => ({}))

// Mock the Sanity client at the module boundary. generateMetadata fetches
// SITE_METADATA_QUERY once; we drive its resolved value to assert how the
// favicon / webclip asset URLs map onto Next's `icons` metadata.
vi.mock('@/lib/sanity/client', () => ({
  client: {fetch: vi.fn()},
}))

import {client} from '@/lib/sanity/client'
import {generateMetadata} from '@/app/layout'

const FAVICON_URL = 'https://cdn.sanity.io/images/proj/production/abc-32x32.png'
const WEBCLIP_URL = 'https://cdn.sanity.io/images/proj/production/def-256x256.png'

beforeEach(() => {
  vi.mocked(client.fetch).mockReset()
})

describe('root layout generateMetadata — favicon / webclip → icons', () => {
  it('emits icons.icon (with mime type) and icons.apple when both assets resolve', async () => {
    vi.mocked(client.fetch).mockResolvedValue({
      firmName: 'Example Law',
      faviconUrl: FAVICON_URL,
      faviconMime: 'image/png',
      webclipUrl: WEBCLIP_URL,
    } as never)

    const meta = await generateMetadata()

    expect(meta.icons).toEqual({
      icon: [{url: FAVICON_URL, type: 'image/png'}],
      apple: [{url: WEBCLIP_URL}],
    })
  })

  it('emits icons.icon without a type when the favicon mime is missing', async () => {
    vi.mocked(client.fetch).mockResolvedValue({
      firmName: 'Example Law',
      faviconUrl: FAVICON_URL,
      faviconMime: null,
      webclipUrl: null,
    } as never)

    const meta = await generateMetadata()

    expect(meta.icons).toEqual({icon: [{url: FAVICON_URL}]})
  })

  it('emits no icons key when neither favicon nor webclip is set', async () => {
    vi.mocked(client.fetch).mockResolvedValue({
      firmName: 'Example Law',
      faviconUrl: null,
      faviconMime: null,
      webclipUrl: null,
    } as never)

    const meta = await generateMetadata()

    expect(meta.icons).toBeUndefined()
  })

  it('emits no icons key when siteSettings is absent (fetch returns null)', async () => {
    vi.mocked(client.fetch).mockResolvedValue(null as never)

    const meta = await generateMetadata()

    expect(meta.icons).toBeUndefined()
  })
})

// TECH-8's second surface (`BI/rules/technical-seo.md`, queue line 10). The
// token is operator-supplied in Studio and emitted ONLY when it is present —
// the same "an absent asset emits nothing rather than a placeholder" rule the
// icons cases above pin, on the one site-metadata surface that had no case.
// It is rendered server-side deliberately: Google's verification crawler does
// not run JavaScript.
describe('root layout generateMetadata — the search-console verification token', () => {
  it('emits verification.google when the operator has set one', async () => {
    vi.mocked(client.fetch).mockResolvedValue({
      firmName: 'Example Law',
      gscVerification: 'abc123-verification-token',
    } as never)

    const meta = await generateMetadata()

    expect(meta.verification).toEqual({google: 'abc123-verification-token'})
  })

  it('emits NO verification key when the field is unset', async () => {
    vi.mocked(client.fetch).mockResolvedValue({firmName: 'Example Law'} as never)

    const meta = await generateMetadata()

    expect(meta.verification).toBeUndefined()
  })

  it('treats a blank token as unset rather than emitting an empty tag', async () => {
    vi.mocked(client.fetch).mockResolvedValue({
      firmName: 'Example Law',
      gscVerification: '',
    } as never)

    const meta = await generateMetadata()

    expect(meta.verification).toBeUndefined()
  })
})
