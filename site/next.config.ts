import type {NextConfig} from 'next'
import {readFileSync, existsSync} from 'node:fs'
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
//
// Trailing-slash normalization: the site runs with the default
// `trailingSlash: false`, so Next 308-strips a trailing slash off the incoming
// path BEFORE matching redirect rules. CSV paths are WordPress-style slashed
// (`/about/attorney/`), so we strip both source and destination to the site's
// canonical slashless form. Without this the rule (keyed on the slashed source)
// never matches and the legacy URL 404s. Result: a slashless legacy URL is a
// single 301; an originally-slashed one is a functional 308→301 chain (Next
// normalizes the incoming slash first — unavoidable without disabling the
// site-wide trailing-slash redirect). Normalizing the destination too avoids a
// trailing 308 hop to the canonical target.
function stripTrailingSlash(p: string): string {
  return p === '/' ? '/' : p.replace(/\/+$/, '')
}

function loadRedirects(): {source: string; destination: string; statusCode: number}[] {
  const csvPath = resolve(__dirname, '../CS/redirects.csv')
  let raw: string
  try {
    raw = readFileSync(csvPath, 'utf8')
  } catch {
    // A missing redirects.csv is fine for a brand-new firm. But a MIGRATED client has a
    // CS-Sitemap.csv full of legacy URLs and MUST ship redirects — a missing file there
    // is a real defect that previously failed silently and 404'd every legacy URL.
    // Warn loudly at build time so it can never ship empty unnoticed again.
    try {
      if (existsSync(resolve(__dirname, '../CS/CS-Sitemap.csv'))) {
        console.warn(
          '[redirects] WARNING: CS/redirects.csv not found but CS-Sitemap.csv exists — ' +
            'this migrated client will ship ZERO redirects and legacy URLs will 404. ' +
            'Seed CS/redirects.csv via Site-Prep generate_redirects.',
        )
      }
    } catch {
      /* ignore */
    }
    return []
  }

  const lines = raw.split('\n')
  const out: {source: string; destination: string; statusCode: number}[] = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (i === 0 && trimmed.toLowerCase().startsWith('old_path')) continue // header
    const [rawSource, rawDestination, rawType] = trimmed.split(',').map((s) => s.trim())
    if (!rawSource || !rawDestination) continue
    const source = stripTrailingSlash(rawSource)
    const destination = stripTrailingSlash(rawDestination)
    // After normalization a `/foo/`→`/foo` row collapses to a self-redirect —
    // skip it (Next rejects a rule whose source equals its destination).
    if (source === destination) continue
    const statusCode = rawType === '302' ? 302 : 301
    out.push({source, destination, statusCode})
  }
  return out
}

// NOTE: experimental.inlineCss was tested here (2026-06-23) to drop the one
// render-blocking stylesheet. It cleared that diagnostic but REGRESSED prod LCP/score
// (≈97 → ≈79, LCP 2.6s → 4.3s, measured prod-vs-prod 3 runs): inlining ~17.6 KiB of CSS
// bloats the HTML document, and since the LCP element is text IN that document, the
// bigger response costs more than the saved request saves. Left as a separate
// (Brotli-compressed, cacheable) stylesheet on purpose. Do not re-enable without measuring.
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
