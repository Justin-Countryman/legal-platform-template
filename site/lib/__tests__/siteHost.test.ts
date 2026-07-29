/**
 * The site's host has one source. BI-URL-Architecture.md → HOST-1.
 *
 * The assertion that matters is the LAST one: a production build with no
 * setting must fail rather than ship a placeholder. That is the behaviour
 * HOST-1 forbids and it is what shipped before — `localhost:3000` in the
 * metadata, sitemap and robots paths and `example.com` in four route files,
 * silently, on a production build.
 */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {absoluteUrl, siteHost, siteOrigin} from '../siteHost'

const ENV = {...process.env}
afterEach(() => {
  process.env = {...ENV}
  vi.unstubAllEnvs()
})

describe('siteHost', () => {
  it('names the configured host and nothing else', () => {
    process.env.NEXT_PUBLIC_SITE_DOMAIN = 'www.example.com'
    expect(siteHost()).toBe('www.example.com')
    expect(siteOrigin()).toBe('https://www.example.com')
  })

  it('joins a page path to the base, which is what pages supply', () => {
    process.env.NEXT_PUBLIC_SITE_DOMAIN = 'www.example.com'
    expect(absoluteUrl('/blaine-family-law/divorce/')).toBe(
      'https://www.example.com/blaine-family-law/divorce/',
    )
    expect(absoluteUrl('blog/')).toBe('https://www.example.com/blog/')
  })

  it('has no trailing slash on the origin, so joins never double up', () => {
    process.env.NEXT_PUBLIC_SITE_DOMAIN = 'www.example.com'
    expect(siteOrigin().endsWith('/')).toBe(false)
  })

  it('falls back to localhost in development, which is expected', () => {
    delete process.env.NEXT_PUBLIC_SITE_DOMAIN
    vi.stubEnv('NODE_ENV', 'development')
    expect(siteHost()).toBe('localhost:3000')
  })

  it('REFUSES a production build with no host rather than shipping one quietly', () => {
    delete process.env.NEXT_PUBLIC_SITE_DOMAIN
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => siteHost()).toThrow(/NEXT_PUBLIC_SITE_DOMAIN is not set/)
  })

  it('treats a blank setting as unset rather than as a host', () => {
    process.env.NEXT_PUBLIC_SITE_DOMAIN = '   '
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => siteHost()).toThrow()
  })
})
