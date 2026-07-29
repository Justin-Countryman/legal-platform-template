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
