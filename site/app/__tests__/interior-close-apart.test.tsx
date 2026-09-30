import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'

// EVERY PAGE'S CLOSE STANDS APART FROM THE FOOTER (`[R-597]`, amended by `[R-603]`: "the final CTA should alwasy be a
// different color than the footer").
//
// An interior page closed on the muted step always, so under a light footer (Editorial, Soft wash, and since Phase 18
// session B Quiet, Ribbon rhythm and Photo scrims) its close sat ΔE 1.0 from the footer. It now reads the footer as
// the shell renders it: the dark ground over a light footer, the muted step over a dark one, a stored scheme winning.

vi.mock('@/lib/sanity/client', () => ({
  client: {fetch: vi.fn()},
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound')
  },
  permanentRedirect: () => {
    throw new Error('permanentRedirect')
  },
  redirect: () => {
    throw new Error('redirect')
  },
}))

import {client} from '@/lib/sanity/client'
import * as Q from '@/lib/sanity/queries'
import {ROUTES, type Route} from './fixtures/closeRoutes'

const HEADING = 'Talk to someone today'

function serve(route: Route, designTokens: Record<string, unknown>, footerSettings: Record<string, unknown> = {}) {
  const chrome = {
    nap: {firmName: 'Example Firm', locations: []},
    designTokens,
    header: {mainNavigation: {}, designSettings: {}},
    footer: {footerSettings},
    globalCta: {layout: 'centered', heading: HEADING, description: 'No obligation.', buttons: [{title: 'Call', url: '/contact/', variant: 'primary'}]},
  }
  vi.mocked(client.fetch).mockImplementation((async (query: string) => {
    if (query === Q.SITE_CHROME_QUERY) return chrome
    if (query === route.query) return {...route.doc}
    if (query === Q.RELATED_POSTS_QUERY) return {byCategory: [], recent: []}
    return []
  }) as never)
}

/** The classes of the section that holds the close's heading. */
async function closeClasses(route: Route): Promise<string[]> {
  const html = renderToStaticMarkup(await route.render())
  const at = html.indexOf(HEADING)
  const open = html.lastIndexOf('<section', at)
  const tag = html.slice(open, html.indexOf('>', open))
  return (/class="([^"]*)"/.exec(tag)?.[1] ?? '').split(/\s+/)
}

beforeEach(() => {
  vi.mocked(client.fetch).mockReset()
})

describe('every interior page closes apart from the footer', () => {
  it.each(ROUTES.map((r) => [r.name, r] as const))('%s: dark over the light footer of Soft wash, the muted step over the dark footer of Alternating', async (_name, route) => {
    serve(route, {flow: 'softWash.mostlyLight'})
    expect(await closeClasses(route)).toContain('bg-brand-dark')
    serve(route, {flow: 'alternating.balanced'})
    expect(await closeClasses(route)).toContain('bg-muted')
  })

  it('reads a stored footer scheme as the shell does: Quiet with a stored dark footer keeps the muted close', async () => {
    const route = ROUTES.find((r) => r.name === 'events')!
    serve(route, {flow: 'quiet.mostlyLight'})
    expect(await closeClasses(route)).toContain('bg-brand-dark')
    serve(route, {flow: 'quiet.mostlyLight'}, {footerScheme: 'dark'})
    expect(await closeClasses(route)).toContain('bg-muted')
  })
})

// The pre-report break pass: a page whose last full-width section is dark closed dark over the light footer, one block
// with the section above it. Where the section above is dark the close takes the accent, where the palette's fill reads
// as its own color, its buttons in the saturated context; else the dark ground, as the homepage does.
describe('an interior close under a dark last section', () => {
  const navyBrass = {darkGround: '#1c2b4a', lightGround: '#f5eedc', accent: '#b8893a'}
  const withDarkSection = (route: Route) => ({...route.doc, sections: [{_type: 'contentSection', _key: 's1', layout: 'statement', heading: 'A dark statement', appearance: {surface: 'dark'}}]})
  function serveWith(route: Route, designTokens: Record<string, unknown>) {
    serve(route, designTokens)
    const base = vi.mocked(client.fetch).getMockImplementation() as unknown as (query: string) => Promise<unknown>
    vi.mocked(client.fetch).mockImplementation((async (query: string) => (query === route.query ? withDarkSection(route) : base(query))) as never)
  }

  it('takes the accent over the light footer, its buttons in the saturated context; the dark ground where the palette has no fill', async () => {
    const route = ROUTES.find((r) => r.name === 'a CMS page (catch-all)')!
    serveWith(route, {flow: 'quiet.mostlyLight', ...navyBrass})
    const html = renderToStaticMarkup(await route.render())
    const at = html.indexOf(HEADING)
    const section = html.slice(html.lastIndexOf('<section', at), html.indexOf('</section>', at))
    expect(section).toContain('bg-accent-fill')
    expect(section).not.toMatch(/\bbg-action\b/)
    serveWith(route, {flow: 'quiet.mostlyLight'})
    expect(await closeClasses(route)).toContain('bg-brand-dark')
  })
})
