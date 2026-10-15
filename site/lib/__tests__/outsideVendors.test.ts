import {describe, it, expect} from 'vitest'
import vendors from '@/lib/outsideVendors.json'
import {PLATFORM_HOSTS, isAllowedHost} from '../../../scripts/check-template-is-blank.mjs'

// The outside vendor list the firm's privacy policy is drafted from (monorepo BI/rules/legal-pages.md), held to the
// scrub guard's host allowlist, which already fails the build on any real host the template names and does not allow.
// So a new outside script in the template cannot merge until it is a vendor here, or a link-only host with a reason.

const WHEN = new Set(['always', 'scroll', 'consent', 'paste'])
type Vendor = {id: string; name: string; purpose: string; hosts: string[]; when: string; receives: string}
const list = (vendors as {vendors: Vendor[]}).vendors
const linkOnly = (vendors as {linkOnly: Record<string, string>}).linkOnly

const coveredBy = (key: string, host: string) => {
  const bare = host.replace(/^\*\./, '')
  return bare === key || bare.endsWith(`.${key}`)
}

describe('site/lib/outsideVendors.json', () => {
  it('is well formed: unique ids, a name, a purpose, what it receives, when it loads, and its hosts', () => {
    expect(new Set(list.map((v) => v.id)).size).toBe(list.length)
    for (const v of list) {
      expect(v.name && v.purpose && v.receives).toBeTruthy()
      expect(WHEN.has(v.when)).toBe(true)
      expect(v.hosts.length).toBeGreaterThan(0)
    }
  })

  it('names only hosts the scrub guard allows', () => {
    for (const v of list) for (const h of v.hosts) expect(isAllowedHost(h.replace(/^\*\./, '')), `${v.id}: ${h}`).toBe(true)
  })

  it('accounts for every host the scrub guard allows: a vendor, or link-only with a reason, never both', () => {
    for (const key of (PLATFORM_HOSTS as Map<string, string>).keys()) {
      const vendor = list.some((v) => v.hosts.some((h) => coveredBy(key, h)))
      const link = key in linkOnly
      expect(vendor || link, `${key} is allowed by the scrub guard but is neither a vendor nor link-only`).toBe(true)
      expect(vendor && link, `${key} is both a vendor and link-only`).toBe(false)
      if (link) expect(linkOnly[key].length).toBeGreaterThan(10)
    }
  })

  it('lists no link-only host the scrub guard does not allow', () => {
    for (const key of Object.keys(linkOnly)) expect((PLATFORM_HOSTS as Map<string, string>).has(key), key).toBe(true)
  })
})
