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
// CSV shape: `old_path,new_path[,redirect_type]` with header row. The first two
// columns are path-relative (leading `/`). The optional third column is the
// HTTP status (`301` or `302`); when absent it defaults to `301` — the correct
// default for a migration. Lines beginning with `#` are comments; empty lines
// are skipped. Emitting an explicit `statusCode` (301/302) rather than
// `permanent` preserves the literal type from CS-SITEMAP.csv.
function loadRedirects(): {source: string; destination: string; statusCode: number}[] {
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
  const out: {source: string; destination: string; statusCode: number}[] = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (i === 0 && trimmed.toLowerCase().startsWith('old_path')) continue // header
    const [source, destination, rawType] = trimmed.split(',').map((s) => s.trim())
    if (!source || !destination) continue
    const statusCode = rawType === '302' ? 302 : 301
    out.push({source, destination, statusCode})
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
