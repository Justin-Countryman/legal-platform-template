import type {NextConfig} from 'next'
import {resolve} from 'node:path'
import {fetchSiteHiddenAtBuild} from './lib/searchVisibility'
import {
  assertRedirectCapNotExceeded,
  formatRedirectReport,
  loadRedirects,
  resolveRedirects,
} from './lib/redirects'
import {securityHeaders} from './lib/securityHeaders'

// ─── Security headers ─────────────────────────────────────────────────────────
// The set moved to `lib/securityHeaders.ts` on 2026-08-10 when it grew the two
// Lighthouse Best Practices audits it was missing — see that file's header for
// which audits are decided by a header, which two were added, and why CSP's two
// stay red. It moved for the same reason the redirect loader did: logic inside
// this config module is logic no suite can run.

// ─── Legacy URL redirects ─────────────────────────────────────────────────────
// ONE SOURCE, ruled 2026-08-17 (TECH-9). `CS/redirects.csv` is the only store of
// redirects: it is git tracked, the app's Redirects screen for that client is
// where an operator edits it, and `lib/redirects.ts` resolves it here at build.
// `output/redirects.csv` is the Site Prep Tool's regenerate-for-comparison
// artifact and serves nothing. The Studio redirects singleton was the second
// store and is deleted; see `lib/redirects.ts` for what it was and what
// measurement ended it.
//
// The parsing and merging logic lived inline here until 2026-08-10, where no
// test could reach it — `OUTSTANDING.md` item 159. Only the path resolution
// stays, because `__dirname` is a property of this file's location and not of
// the rule.
//
// `CS_SITEMAP_CSV` is EXPORTED for the same reason `formatRedirectReport`
// returns lines instead of printing them: it is the half of this pair that a
// suite has to be able to read. Its FILENAME is what decides whether the
// migrated-client warning below ever fires, and it shipped misspelled
// (`CS-Sitemap.csv` against the pipeline's `CS-SITEMAP.csv`) from the guard's
// own first build in `92fcd8b`, 2026-06-23, until this one — `OUTSTANDING.md`
// item 203. Next reads the default export and ignores this one.
const CS_REDIRECTS_CSV = resolve(__dirname, '../CS/redirects.csv')
export const CS_SITEMAP_CSV = resolve(__dirname, '../CS/CS-SITEMAP.csv')

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
  // Site-wide search visibility (ruled 2026-07-25). The meta tag in
  // app/layout.tsx only reaches HTML documents; this header reaches EVERY
  // response on `/:path*` — sitemap.xml, /api/og, RSC payloads, images — which
  // is what makes hiding genuine rather than cosmetic. Resolved at BUILD time
  // from the same `siteSettings.hideFromSearch` the rest of the site reads:
  // headers cannot change without a rebuild anyway, and both transitions (on at
  // build, off at launch) involve a deploy. FAIL-CLOSED — an unreachable
  // dataset or an unset field yields the header, never its absence.
  //
  // This REPLACES the hand-edit pattern: no client tree should ever again carry
  // a TEMPORARY X-Robots-Tag here.
  async headers() {
    const hidden = await fetchSiteHiddenAtBuild()
    return [
      {
        source: '/:path*',
        headers: hidden
          ? [...securityHeaders, {key: 'X-Robots-Tag', value: 'noindex, nofollow'}]
          : securityHeaders,
      },
    ]
  },
  async redirects() {
    const {rules, report} = resolveRedirects(loadRedirects(CS_REDIRECTS_CSV, CS_SITEMAP_CSV))
    // Printed on EVERY build, not only when something is wrong: a guard that only
    // speaks on failure is indistinguishable from a guard that is not running.
    // The lines name every row that could not be served as it was written — a
    // duplicate source, a flattened chain, a loop that now 404s.
    for (const line of formatRedirectReport(report)) console.log(line)
    // AFTER the report, so an over-cap build still prints which rows were
    // duplicated, flattened or looped — that is what tells the operator which
    // ones are safe to remove.
    assertRedirectCapNotExceeded(rules.length)
    return rules
  },
}

export default nextConfig
