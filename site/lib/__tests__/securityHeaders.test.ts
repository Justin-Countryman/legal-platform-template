import {describe, it, expect} from 'vitest'
import {securityHeaders} from '../securityHeaders'

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
  securityHeaders.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value

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

  // A DELIBERATE ABSENCE, asserted so that adding CSP has to be a decision
  // rather than a drive-by. Locked decision D5 defers it, which leaves the
  // `csp-xss` and `trusted-types-xss` audits red on purpose. If this case ever
  // goes red, CSP arrived — check that D5 was actually reversed, and delete
  // this case with the reasoning rather than around it.
  it('csp-xss and trusted-types-xss stay unmet, because D5 defers CSP', () => {
    expect(value('Content-Security-Policy')).toBeUndefined()
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
