import type {NextConfig} from 'next'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

// ─── Security headers ─────────────────────────────────────────────────────────
// Platform-portable security headers. CSP intentionally deferred to a
// future workstream (per locked decision D5) — the four headers here are
// the low-risk baseline that ships in Phase 1.
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
]

// ─── Legacy URL redirects ─────────────────────────────────────────────────────
// Read once at build time from `CS/redirects.csv` (operator-curated,
// tracked in git). The Site Prep Tool may regenerate `output/redirects.csv`
// for comparison but never overwrites the CS-tracked copy.
//
// CSV shape: `old_path,new_path` with header row. Both columns are
// path-relative (leading `/`). Lines beginning with `#` are treated as
// comments. Empty lines are skipped.
function loadRedirects(): {source: string; destination: string; permanent: boolean}[] {
  const csvPath = resolve(__dirname, '../CS/redirects.csv')
  let raw: string
  try {
    raw = readFileSync(csvPath, 'utf8')
  } catch {
    // First-time clients without a redirects.csv aren't an error — return
    // an empty list and let the build proceed.
    return []
  }

  const lines = raw.split('\n')
  const out: {source: string; destination: string; permanent: boolean}[] = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (i === 0 && trimmed.toLowerCase().startsWith('old_path')) continue // header
    const [source, destination] = trimmed.split(',').map((s) => s.trim())
    if (!source || !destination) continue
    out.push({source, destination, permanent: true})
  }
  return out
}

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return loadRedirects()
  },
}

export default nextConfig
