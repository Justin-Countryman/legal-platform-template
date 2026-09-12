/**
 * The proxy's two jobs ([R-185], item 271, 2026-09-11): strip a trailing slash
 * once, and rewrite /review-* to the internal route. The strip exists because
 * `skipTrailingSlashRedirect` turned off the framework's own, which used to
 * run ahead of the redirect map and cost every legacy URL a second hop.
 */
import {describe, expect, it} from 'vitest'
import {NextRequest} from 'next/server'
import {proxy, config, stripTrailingSlashUrl} from '../../proxy'

const ORIGIN = 'https://example-firm.test'

describe('stripTrailingSlashUrl', () => {
  it('strips one or more trailing slashes and keeps the query', () => {
    const out = stripTrailingSlashUrl(new URL(ORIGIN + '/wills-trusts/?utm=x'))
    expect(out?.pathname).toBe('/wills-trusts')
    expect(out?.search).toBe('?utm=x')
    expect(stripTrailingSlashUrl(new URL(ORIGIN + '/a/b//'))?.pathname).toBe('/a/b')
  })

  it('leaves the root and an unslashed path alone', () => {
    expect(stripTrailingSlashUrl(new URL(ORIGIN + '/'))).toBeNull()
    expect(stripTrailingSlashUrl(new URL(ORIGIN + '/wills-trusts'))).toBeNull()
  })
})

describe('proxy', () => {
  it('308s a slashed URL to its no-slash form, query kept', () => {
    const res = proxy(new NextRequest(ORIGIN + '/wills-trusts/?a=1'))
    expect(res.status).toBe(308)
    expect(res.headers.get('location')).toBe(ORIGIN + '/wills-trusts?a=1')
  })

  it('still rewrites /review-* to the internal route, unslashed', () => {
    const res = proxy(new NextRequest(ORIGIN + '/review-us'))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-middleware-rewrite')).toBe(ORIGIN + '/review/review-us')
  })

  it('matches every slashed path and the review slugs', () => {
    expect(config.matcher).toEqual(['/:path+/', '/:slug(review-.+)'])
  })
})
