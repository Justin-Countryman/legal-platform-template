import {describe, it, expect} from 'vitest'
import {createHash} from 'node:crypto'
import {CSP_SOURCE, contentSecurityPolicy, cspHeaders, securityHeaders} from '../securityHeaders'
import {INLINE_SCRIPTS} from '../inlineScripts'
import {SCRIPT_HOSTS} from '../scriptHosts'
import vendors from '../outsideVendors.json'

/**
 * The security header set, pinned to the Lighthouse audits that decide it —
 * `BI/rules/technical-seo.md` build queue 6, ruled separately from that topic
 * because these are platform security rather than technical SEO.
 *
 * WHY PIN A CONSTANT AT ALL. Because the requirement is not "these six strings"
 * — it is "every Best Practices audit that a response header can satisfy". A
 * header dropped or a value weakened costs a Lighthouse point and nothing in a
 * build says so, which is `BI-SESSION-PROTOCOL`'s specified-and-undetected
 * shape exactly. The audit ids are named in each case so a future reader can
 * check the claim against Lighthouse rather than against this file.
 *
 * WHAT THIS CANNOT DO, stated so the cell above it is not over-read: it asserts
 * what the config OFFERS, not what a deployed response CARRIES. `headers()` in
 * `next.config.ts` applies the set to `/:path*`, and only a served response
 * proves it arrived. That half is the post-launch verification build, queue
 * line 4.
 */

const value = (key: string) =>
  [...securityHeaders, ...cspHeaders].find((h) => h.key.toLowerCase() === key.toLowerCase())?.value

describe('Lighthouse Best Practices: the audits a response header decides', () => {
  it('has-hsts: a long max-age with includeSubDomains and preload', () => {
    const hsts = value('Strict-Transport-Security')
    expect(hsts).toBeDefined()
    const maxAge = Number(/max-age=(\d+)/.exec(hsts ?? '')?.[1])
    // Lighthouse wants at least a year. This ships two.
    expect(maxAge).toBeGreaterThanOrEqual(31536000)
    expect(hsts).toContain('includeSubDomains')
    expect(hsts).toContain('preload')
  })

  it('clickjacking-mitigation: XFO is SAMEORIGIN or DENY', () => {
    expect(['SAMEORIGIN', 'DENY']).toContain(value('X-Frame-Options'))
  })

  it('origin-isolation: COOP names one of the four directives the audit accepts', () => {
    expect([
      'unsafe-none',
      'same-origin-allow-popups',
      'same-origin',
      'noopener-allow-popups',
    ]).toContain(value('Cross-Origin-Opener-Policy'))
  })

  // THE DEFERRAL'S CASE, REPLACED 2026-10-16. Until then this asserted the header's ABSENCE, so that adding CSP had to
  // be a decision rather than a drive-by; the decision is monorepo [R-785] (hashes, never a nonce, never
  // 'unsafe-inline' in script-src), and `BI/rules/technical-seo.md`'s CSP block records the reversal. What is pinned
  // now is that ruling's shape. Whether the policy breaks anything is `scripts/ci/csp-served.mjs`, on a served build.
  it('csp-xss: the policy is sent, enforced, in the shape [R-785] ruled', () => {
    const csp = value('Content-Security-Policy')
    expect(csp).toBeDefined()
    expect(value('Content-Security-Policy-Report-Only')).toBeUndefined()
    const directives = new Map(
      (csp ?? '').split(';').map((d) => d.trim().split(/\s+/)).map(([name, ...sources]) => [name, sources]),
    )
    expect([...directives.keys()]).toEqual(['script-src', 'object-src', 'base-uri', 'frame-ancestors', 'form-action'])
    expect(directives.get('object-src')).toEqual(["'none'"])
    expect(directives.get('base-uri')).toEqual(["'none'"])
    expect(directives.get('frame-ancestors')).toEqual(["'self'"])
    expect(directives.get('form-action')).toEqual(["'self'"])
    const script = directives.get('script-src') ?? []
    for (const unsafe of ["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "'strict-dynamic'", '*', 'https:', 'http:', 'data:', 'blob:']) {
      expect(script).not.toContain(unsafe)
    }
    expect(script.filter((s) => s.startsWith("'nonce-"))).toEqual([])
  })

  it('script-src names each fixed inline script by its hash, the listed hosts, and nothing else', () => {
    const script = (value('Content-Security-Policy') ?? '').split(';')[0].trim().split(/\s+/).slice(1)
    const hashes = Object.values(INLINE_SCRIPTS).map((t) => `'sha256-${createHash('sha256').update(t, 'utf8').digest('base64')}'`)
    expect(script).toEqual(["'self'", ...hashes, ...SCRIPT_HOSTS.map((h) => h.source)])
    expect(securityHeaders.map((h) => h.key)).not.toContain('Content-Security-Policy')
  })

  it('every outside host it lets a script load from is a vendor the firm’s privacy policy names', () => {
    const named = (vendors as {vendors: Array<{id: string; hosts: string[]}>}).vendors.flatMap((v) => v.hosts)
    const covered = (host: string) => named.some((h) => (h.startsWith('*.') ? host === h.slice(2) || host.endsWith(h.slice(1)) : host === h))
    for (const {source} of SCRIPT_HOSTS) expect(covered(source.replace('https://', '')), source).toBe(true)
    for (const h of SCRIPT_HOSTS) expect(h.source).toMatch(/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+$/)
  })

  it("next dev alone adds 'unsafe-eval', which Next's dev runtime needs; a Vercel preview alone adds its toolbar", () => {
    expect(contentSecurityPolicy(true, false)).toContain("'unsafe-eval'")
    expect(contentSecurityPolicy(false, false)).not.toContain("'unsafe-eval'")
    expect(contentSecurityPolicy(false, true)).toContain('https://vercel.live')
    expect(contentSecurityPolicy(false, false)).not.toContain('vercel.live')
  })

  it("covers every path but the operator's preview", () => {
    const re = new RegExp(`^${CSP_SOURCE.replace('/:path', '/')}$`)
    for (const p of ['/', '/contact', '/blog/a-post', '/review/x', '/site-previews', '/a/site-preview']) expect(re.test(p)).toBe(true)
    for (const p of ['/site-preview', '/site-preview/abc/def', '/site-preview/enter']) expect(re.test(p)).toBe(false)
  })
})

describe('the Phase 1 baseline, which is platform policy rather than an audit', () => {
  it.each([
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ])('%s is %s', (key, expected) => {
    expect(value(key)).toBe(expected)
  })

  it('Permissions-Policy denies the three device permissions and the cohort API', () => {
    const policy = value('Permissions-Policy') ?? ''
    for (const feature of ['camera', 'microphone', 'geolocation', 'interest-cohort']) {
      expect(policy).toContain(`${feature}=()`)
    }
  })

  it('every entry is a well-formed, non-empty key/value pair with no duplicates', () => {
    const keys = securityHeaders.map((h) => h.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const h of securityHeaders) {
      expect(h.key).toMatch(/^[A-Za-z-]+$/)
      expect(h.value.trim().length).toBeGreaterThan(0)
    }
  })
})
