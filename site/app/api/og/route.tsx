import {ImageResponse} from 'next/og'
import {client} from '@/lib/sanity/client'
import {OG_DATA_QUERY} from '@/lib/sanity/queries'

// Dynamic OG image generation per locked decision D6: composed with logo
// + firm name + page title on brand-color background. Falls back to
// text-only when `designSettings.logoOnDark` is absent.
//
// Query params:
//   ?title=<page title>   — page heading; URL-encoded; truncated at 140 chars
//
// Caching: revalidate 3600s aligns with the rest of the site; ImageResponse
// is also CDN-cacheable via Vercel's image cache.

export const runtime = 'edge'
export const revalidate = 3600

const FALLBACK_BG = '#1f2937' // neutral-800 — used only when primaryColor is unset
const FALLBACK_FG = '#f9fafb' // neutral-50

type OgData = {
  firmName?: string | null
  logo?: string | null
  primaryColor?: string | null
}

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url)
  const title = (searchParams.get('title') ?? '').slice(0, 140)

  const data = await client.fetch<OgData>(OG_DATA_QUERY)
  const firmName = data.firmName ?? ''
  const bg = data.primaryColor ?? FALLBACK_BG
  const fg = FALLBACK_FG
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
