import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, className}, ref) => <a ref={ref} href={href} className={className}>{children}</a>,
  ),
}))

import {Switcher} from '../Switcher'
import {THEMES} from '@/lib/themes'
import {PALETTE_PRESETS} from '@/lib/palettes'
import {planPreview, type StoredDesign} from '@/lib/preview/plan'
import {verifyToken, type PreviewGrant} from '@/lib/preview/session'

// The switcher (Phase 17A, monorepo WS-V1-PHASE17A-DESIGN §2.5): the operator's three
// rows, the client's one line, and the links it signs.

const SECRET = 'switcher-test-secret'
const stored: StoredDesign = {_id: 'designSettings', _rev: 'rev-9'}
const operator: PreviewGrant = {v: 1, role: 'operator', exp: 1_900_000_000, apply: {origin: 'http://127.0.0.1:8787', slug: 'example-firm'}}
const client: PreviewGrant = {v: 1, role: 'client', exp: 1_900_000_000, styleSet: 'graphite', palette: 'navy-brass', view: 'design'}
const choices = {styleSet: 'graphite', palette: 'navy-brass', view: 'design' as const}

beforeEach(() => vi.stubEnv('SITE_PREVIEW_SECRET', SECRET))
afterEach(() => vi.unstubAllEnvs())

const draw = (grant: PreviewGrant, doc = stored, c = choices, canvas: unknown = []) =>
  render(<Switcher grant={grant} choices={c} plan={planPreview(doc, c)} canvas={canvas} origin="https://example.com" />).container

const hrefs = (el: Element) => [...el.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')

describe('Switcher, the operator', () => {
  it('offers every style set and palette as a link to another preview address, and the view', () => {
    const links = hrefs(draw(operator))
    for (const t of THEMES) expect(links).toContain(`/site-preview/${t.id}/navy-brass/design`)
    for (const p of PALETTE_PRESETS) expect(links).toContain(`/site-preview/graphite/${p.id}/design`)
    expect(links).toContain('/site-preview/site/navy-brass/design')
    expect(links).toContain('/site-preview/graphite/navy-brass/grey')
  })

  it('shows the theme row as not built, and it links nowhere', () => {
    const c = draw(operator)
    const inert = [...c.querySelectorAll('.sw-inert')].map((el) => el.textContent)
    expect(inert).toContain('Not yet: themes arrive in Phase 17B')
  })

  it('signs a client share link bound to the current choices', () => {
    const input = draw(operator).querySelector('input') as HTMLInputElement
    const url = new URL(input.value)
    expect(url.origin + url.pathname).toBe('https://example.com/site-preview/enter')
    expect(verifyToken(url.searchParams.get('t'), SECRET)).toMatchObject({role: 'client', ...choices})
  })

  it('signs an Apply link carrying exactly the plan and the revision it was computed on', () => {
    const apply = hrefs(draw(operator)).find((h) => h.startsWith('http://127.0.0.1:8787/#/design?t='))!
    const payload = verifyToken(apply.split('?t=')[1], SECRET) as Record<string, unknown>
    const plan = planPreview(stored, choices)
    expect(payload).toMatchObject({kind: 'apply', slug: 'example-firm', rev: 'rev-9', set: plan.set, unset: plan.unset})
    expect(payload).not.toHaveProperty('role')
  })

  it('offers no Apply when nothing would change, or when the session came without an Apply target', () => {
    const wearing = {...stored, ...planPreview(stored, choices).set}
    expect(hrefs(draw(operator, wearing)).some((h) => h.includes('#/design'))).toBe(false)
    expect(hrefs(draw({...operator, apply: undefined})).some((h) => h.includes('#/design'))).toBe(false)
  })

  it('names what the site wears now, and the bands that keep their own look', () => {
    const wearing = {...stored, ...planPreview(stored, choices).set}
    const c = draw(operator, wearing, {styleSet: 'site', palette: 'site', view: 'design'}, [
      {_type: 'attorneySectionInline', _key: 'a', cardStyle: 'portrait'},
      {_type: 'contentSectionInline', _key: 'b', imageTreatment: 'framed'},
      {_type: 'contentSectionInline', _key: 'c', imageTreatment: 'slab'},
    ])
    expect(c.textContent).toContain('As the site is: Graphite')
    expect(c.textContent).toContain('As the site is: Navy & Brass')
    expect(c.textContent).toContain('Attorneys (card style), Content section (photo frame) ×2')
  })
})

describe('Switcher, the client', () => {
  it('shows one line: the choices, that nothing is live, and when it ends; no roster, no Apply, no share link', () => {
    const c = draw(client)
    expect(c.textContent).toContain('Preview, not live yet')
    expect(c.textContent).toContain('Graphite, Navy & Brass')
    expect(c.textContent).toContain('Links on this page open the live site')
    expect(c.querySelectorAll('a')).toHaveLength(0)
    expect(c.querySelector('input')).toBeNull()
  })
})
