// @vitest-environment node
/**
 * Every retired URL is rewritten here, and gets 410 Gone (`lib/retired.ts`,
 * monorepo [R-562]): a plain page with a link home, cached at the CDN, never
 * indexed.
 */

import {describe, expect, it} from 'vitest'
import {GET, HEAD} from '../route'

describe('the 410 page', () => {
  it('answers 410 with a page that links home', async () => {
    const res = GET()
    expect(res.status).toBe(410)
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=86400')
    expect(res.headers.get('x-robots-tag')).toBe('noindex')
    const html = await res.text()
    expect(html).toContain('<h1>This page has been removed</h1>')
    expect(html).toContain('<a href="/">Go to the homepage</a>')
    expect(html).toContain('<meta name="robots" content="noindex">')
  })

  it('answers HEAD the same, without a body', async () => {
    const res = HEAD()
    expect(res.status).toBe(410)
    expect(await res.text()).toBe('')
  })
})
