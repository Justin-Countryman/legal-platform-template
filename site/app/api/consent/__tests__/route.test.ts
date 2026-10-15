// @vitest-environment node
/**
 * The cookie banner's durable copy of a visitor's choice (monorepo [R-751]): a first-party cookie the server sets,
 * which Safari keeps when it deletes the page's own storage after seven days without a click on the site.
 */

import {describe, expect, it} from 'vitest'
import {CONSENT_KEEP_SECONDS} from '@/lib/consent'
import {POST} from '../route'

const now = () => Math.floor(Date.now() / 1000)
const entry = (o: Record<string, unknown> = {}) => JSON.stringify({v: 2, analytics: 'granted', ads: 'denied', at: now(), ...o})
const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new Request('https://www.firm.example/api/consent', {
    method: 'POST', body,
    headers: {host: 'www.firm.example', origin: 'https://www.firm.example', 'x-forwarded-proto': 'https', ...headers},
  }))

describe('POST /api/consent', () => {
  it('answers with the choice as a first-party cookie the page can read, kept twelve months', async () => {
    const res = await post(entry())
    expect(res.status).toBe(204)
    const cookie = res.headers.get('set-cookie') ?? ''
    const value = JSON.parse(decodeURIComponent(cookie.split(';')[0].replace('lp-consent=', '')))
    expect(value).toMatchObject({v: 2, analytics: 'granted', ads: 'denied'})
    expect(cookie).toContain(`Max-Age=${CONSENT_KEEP_SECONDS}`)
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Secure')
    expect(cookie).not.toMatch(/HttpOnly/i)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('refuses another origin, so another site cannot set a visitor’s choice', async () => {
    expect((await post(entry(), {origin: 'https://evil.example'})).status).toBe(403)
    expect((await post(entry(), {origin: ''})).status).toBe(403)
  })

  it('refuses anything that is not a choice, and a time far from the server’s', async () => {
    expect((await post('{"v":2,"analytics":"maybe","at":1}')).status).toBe(400)
    expect((await post('not json')).status).toBe(400)
    expect((await post(entry({at: now() - 10 * 24 * 3600}))).status).toBe(400)
    expect((await post('x'.repeat(600))).status).toBe(413)
  })

  it('has no Secure flag on plain http (a developer’s machine, CI)', async () => {
    const res = await post(entry(), {'x-forwarded-proto': 'http'})
    expect(res.headers.get('set-cookie')).not.toContain('Secure')
  })
})
