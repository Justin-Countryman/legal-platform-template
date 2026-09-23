import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {NextRequest} from 'next/server'
import {GET} from '../site-preview/enter/route'
import {signToken} from '@/lib/preview/session'

// The way into a preview (Phase 17A, monorepo WS-V1-PHASE17A-DESIGN §2.1). A signed
// link becomes a cookie scoped to the preview; anything else is a 404 that sets
// nothing. The served form of these, and of the layout's and page's checks, runs in
// `scripts/ci/check-preview-not-shipped.mjs` against a built site.

const SECRET = 'enter-route-secret'
const now = () => Math.floor(Date.now() / 1000)
const enter = (t: string | null) =>
  GET(new NextRequest(`https://example.com/site-preview/enter${t === null ? '' : `?t=${encodeURIComponent(t)}`}`))

beforeEach(() => vi.stubEnv('SITE_PREVIEW_SECRET', SECRET))
afterEach(() => vi.unstubAllEnvs())

describe('GET /site-preview/enter', () => {
  it('turns an operator link into a cookie scoped to the preview, and goes to the site as it is', async () => {
    const token = signToken({v: 1, role: 'operator', exp: now() + 600}, SECRET)!
    const res = await enter(token)
    expect(res.status).toBe(303)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/site-preview/site/site/site/design')
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain(`lp-preview=${token}`)
    for (const part of ['HttpOnly', 'Secure', 'SameSite=lax', 'Path=/site-preview']) expect(cookie).toContain(part)
    expect(Number(cookie.match(/Max-Age=(\d+)/)?.[1])).toBeGreaterThan(590)
    expect(res.headers.get('x-robots-tag')).toContain('noindex')
  })

  it('sends a client to the choices the link was sent with, the theme included', async () => {
    const token = signToken({v: 1, role: 'client', exp: now() + 600, styleSet: 'marble', palette: 'black-gold', flow: 'cutBlocks.balanced', view: 'grey'}, SECRET)!
    const res = await enter(token)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/site-preview/marble/black-gold/cutBlocks.balanced/grey')
  })

  it('a client link minted before the theme row (no flow in the grant) enters as the site is', async () => {
    const token = signToken({v: 1, role: 'client', exp: now() + 600, styleSet: 'marble', palette: 'black-gold', view: 'grey'}, SECRET)!
    const res = await enter(token)
    expect(res.status).toBe(303)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/site-preview/marble/black-gold/site/grey')
  })

  it('refuses no link, a bad one, an expired one, an unknown choice, and every link when there is no secret', async () => {
    const expired = signToken({v: 1, role: 'operator', exp: now() - 1}, SECRET)!
    const unknown = signToken({v: 1, role: 'client', exp: now() + 600, styleSet: 'nope', palette: 'site', view: 'design'}, SECRET)!
    const unknownTheme = signToken({v: 1, role: 'client', exp: now() + 600, styleSet: 'site', palette: 'site', flow: 'nope', view: 'design'}, SECRET)!
    const other = signToken({v: 1, role: 'operator', exp: now() + 600}, 'another-secret')!
    for (const t of [null, 'nope', expired, unknown, unknownTheme, other]) {
      const res = await enter(t)
      expect(res.status).toBe(404)
      expect(res.headers.get('set-cookie')).toBeNull()
    }
    vi.stubEnv('SITE_PREVIEW_SECRET', '')
    expect((await enter(signToken({v: 1, role: 'operator', exp: now() + 600}, SECRET)!)).status).toBe(404)
  })

  it('a link minted before a step was retired enters as the site is ([R-523])', async () => {
    const retired = signToken({v: 1, role: 'client', exp: now() + 600, styleSet: 'graphite', palette: 'site', flow: 'alternating.mostlyDark', view: 'design'}, SECRET)!
    const res = await enter(retired)
    expect(res.status).toBe(303)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/site-preview/graphite/site/site/design')
  })
})
