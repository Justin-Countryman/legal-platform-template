import {createHash} from 'node:crypto'
import {INLINE_SCRIPTS} from './inlineScripts'
import {SCRIPT_HOSTS} from './scriptHosts'

/**
 * The security headers every response carries, in one place.
 *
 * Ruled separately from `BI/rules/technical-seo.md` and queued as that file's
 * line 6: the standard set for a clean Lighthouse Best Practices score, on top
 * of the four that already shipped. TECH-6's scope note carries the pointer and
 * nothing else — these are platform security rather than technical SEO.
 *
 * THEY LIVE HERE RATHER THAN INLINE IN `next.config.ts` so a test can reach
 * them. That is the lesson `OUTSTANDING.md` item 159 paid for on the redirect
 * loader in the same file: logic inside a config module is logic no suite runs.
 *
 * ─── WHAT LIGHTHOUSE ACTUALLY AUDITS, checked rather than remembered ─────────
 *
 * Five of the Best Practices category's Trust & Safety audits are decided by a
 * response header. Read off Lighthouse's own `core/config/default-config.js`
 * and its audit sources on 2026-08-10, not from memory:
 *
 *   has-hsts                `Strict-Transport-Security`. Wants a long max-age
 *                           with `includeSubDomains` and `preload`. Already
 *                           satisfied by the header below and unchanged.
 *   clickjacking-mitigation `X-Frame-Options: SAMEORIGIN` or `DENY`, or a CSP
 *                           `frame-ancestors`. ADDED HERE.
 *   origin-isolation        A `Cross-Origin-Opener-Policy` naming any of
 *                           `unsafe-none`, `same-origin-allow-popups`,
 *                           `same-origin` or `noopener-allow-popups`. ADDED
 *                           HERE.
 *   csp-xss                 `Content-Security-Policy`. ADDED 2026-10-16
 *                           (monorepo [R-785]); informative, weight 0.
 *   trusted-types-xss       CSP `require-trusted-types-for`. Not added:
 *                           informative, and not part of the ruling.
 *
 * ─── THE CONTENT SECURITY POLICY, THE FINGERPRINT WAY ───────────────────────
 *
 * Ruled by Justin 2026-10-16 (monorepo [R-785]): hashes, never a nonce (a nonce
 * renders every page per visit), never `'unsafe-inline'` in script-src, and it
 * ships only if no PageSpeed score drops. It reverses the 2026-08-10 deferral
 * in `BI/rules/technical-seo.md`, whose reasoning was right: a policy written
 * without the inventory either breaks the site or protects nothing. The
 * inventory and the design are the monorepo's WS-CSP-DESIGN-2026-10-16.
 *
 * - `script-src`: the site's own origin (Next's chunks), the hash of each fixed
 *   inline script (`lib/inlineScripts.ts`: the relay that hands Next's inline
 *   page data over as data, the consent decision, the preview's switch-off),
 *   and the outside hosts in `lib/scriptHosts.ts`. Next's own inline data
 *   scripts are never run, so they need no hash (the relay). JSON-LD is a data
 *   block and is never checked. In `next dev` only, `'unsafe-eval'` (Next's own
 *   guide: its dev runtime evaluates code).
 * - `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'self'` (the same
 *   as X-Frame-Options below), `form-action 'self'`.
 * - Nothing else on purpose: styles (per firm, per edit, and every server-
 *   rendered style attribute), images, beacons, video and map frames and the
 *   vendors' own frames stay as they were. The protection against injected
 *   code is script-src; that is also what the graders score.
 * - On a Vercel preview deployment only, `https://vercel.live` for Vercel's
 *   own toolbar, which Vercel injects there and nowhere else.
 * - Page documents only (`CSP_SOURCE`, `CSP_MISSING`): a policy does nothing
 *   on a script, a stylesheet, an image or the router's own data requests,
 *   and sent on them its ~550 bytes cost the render-blocking stylesheet a
 *   simulated round trip in Lighthouse (measured 2026-10-16: an attorney page's
 *   phone LCP 2.76 s to 2.91 s in 4 of 5 runs). Not the operator's preview
 *   either: it renders per request and streams React's own inline scripts,
 *   which no fixed hash can name; it is behind a signed session and no visitor
 *   or grader sees it.
 * - What it does not stop, said plainly: a script injected with a `src` on a
 *   listed host. www.googletagmanager.com serves any Tag Manager container,
 *   and the Google hosts are on Lighthouse's own list of known bypasses, so
 *   Lighthouse's `csp-xss` keeps a High finding (it scores nothing). Injected
 *   inline code and inline handlers are what it stops.
 *
  * ─── WHY `same-origin-allow-popups` AND NOT `same-origin` ────────────────────
 *
 * All four COOP values above pass the audit equally, so the choice is made on
 * behaviour rather than on score. `same-origin` severs `window.opener` for
 * every popup a page opens, which is exactly how a third-party scheduling,
 * chat or payment widget that opens a popup and reports back stops working —
 * on a template that ships arbitrary operator-pasted embeds, that is a silent
 * break on somebody's site rather than a hypothetical.
 * `same-origin-allow-popups` isolates the browsing context group from anything
 * that opens THIS page while leaving popups this page opens intact.
 *
 * The first four are unchanged and predate this file: platform-portable
 * baseline, shipped in Phase 1.
 */
const sha256 = (text: string) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`

/** The policy, one fixed string for every firm and page. `dev` adds `'unsafe-eval'` for `next dev` alone; `preview`
 *  adds Vercel's toolbar on a Vercel preview deployment. */
export function contentSecurityPolicy(
  dev = process.env.NODE_ENV === 'development',
  preview = process.env.VERCEL_ENV === 'preview',
): string {
  const scriptSrc = [
    "'self'",
    ...Object.values(INLINE_SCRIPTS).map(sha256),
    ...SCRIPT_HOSTS.map((h) => h.source),
    ...(preview ? ['https://vercel.live'] : []),
    ...(dev ? ["'unsafe-eval'"] : []),
  ]
  return [
    `script-src ${scriptSrc.join(' ')}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
  ].join('; ')
}

export const securityHeaders = [
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
  {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
  {key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups'},
]

/** Every page path, in `next.config.ts`'s source syntax: not Next's own files (`/_next/`), the API routes, the icon,
 *  or the operator's preview (`app/(preview)/site-preview`). */
export const CSP_SOURCE = '/:path((?!_next/|api/|favicon\\.ico$|site-preview(?:/|$)).*)'

/** Not the router's own data requests (a link's page data, a prefetch), which carry an `RSC` header. */
export const CSP_MISSING = [{type: 'header' as const, key: 'rsc'}]

export const cspHeaders = [{key: 'Content-Security-Policy', value: contentSecurityPolicy()}]
