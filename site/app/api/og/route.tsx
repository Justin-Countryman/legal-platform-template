import {ImageResponse} from 'next/og'
import {client} from '@/lib/sanity/client'
import {OG_DATA_QUERY} from '@/lib/sanity/queries'
import {resolvePalette} from '@/lib/designTokens'

// Dynamic OG image generation per locked decision D6: composed with logo
// + firm name + page title on the site's dark ground. Falls back to
// text-only when `designSettings.logoOnDark` is absent.
//
// The colours come from the same engine as the pages (Phase 14): the accepted
// dark ground and the text tier that reads on it, so a vivid or light colour
// typed into darkGround can never produce an unreadable share card. The engine
// is plain JS and loads at the edge (measured: +16.4 KB gzip).
//
// Query params:
//   ?title=<page title>   — page heading; URL-encoded; truncated at 140 chars
//
// Caching: revalidate 3600s aligns with the rest of the site; ImageResponse
// is also CDN-cacheable via Vercel's image cache.

export const runtime = 'edge'
export const revalidate = 3600

type OgData = {
  firmName?: string | null
  logo?: string | null
  darkGround?: string | null
}

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url)
  const title = (searchParams.get('title') ?? '').slice(0, 140)

  const data = await client.fetch<OgData>(OG_DATA_QUERY)
  const firmName = data.firmName ?? ''
  const {tokens} = resolvePalette({darkGround: data.darkGround})
  const bg = tokens['--color-brand-dark']
  const fg = tokens['--color-foreground-on-dark']
  const logo = data.logo ?? null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '72px 88px',
          background: bg,
          color: fg,
          fontFamily: 'sans-serif',
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- @vercel/og ImageResponse runs in an Edge sandbox with no next/image support; raw <img> is the documented pattern.
          <img
            src={logo}
            alt=""
            style={{height: 80, width: 'auto', objectFit: 'contain'}}
          />
        ) : (
          <div style={{fontSize: 36, fontWeight: 700, letterSpacing: '-0.01em'}}>
            {firmName}
          </div>
        )}

        <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
          {title ? (
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                maxWidth: 1024,
              }}
            >
              {title}
            </div>
          ) : null}
          {logo && firmName ? (
            <div style={{fontSize: 28, opacity: 0.85, fontWeight: 500}}>
              {firmName}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
