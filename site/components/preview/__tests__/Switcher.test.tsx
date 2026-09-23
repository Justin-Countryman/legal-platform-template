import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string; 'aria-current'?: 'true'}>(
    ({href, children, className, ...rest}, ref) => <a ref={ref} href={href} className={className} aria-current={rest['aria-current']}>{children}</a>,
  ),
}))

import {Switcher, ROW_THEME_HEAD, CHROME_NOTE_HEAD, chromeNote, familyLabel} from '../Switcher'
import {THEMES} from '@/lib/themes'
import {PALETTE_PRESETS} from '@/lib/palettes'
import {FAMILIES, FLOWS, flowId} from '@/lib/flows'
import {planPreview, type StoredDesign} from '@/lib/preview/plan'
import {verifyToken, type PreviewGrant} from '@/lib/preview/session'
import {type SiteChrome} from '@/components/layout/SiteShell'

// The switcher (Phase 17A, monorepo WS-V1-PHASE17A-DESIGN §2.5): the operator's three
// rows, the client's one line, and the links it signs. Phase 17B session 3 (record
// §2.10): the theme row with its families and steps, the needs a page lacks, the bands
// that keep their own ground, and the theme in the Apply link.

const SECRET = 'switcher-test-secret'
const stored: StoredDesign = {_id: 'designSettings', _rev: 'rev-9'}
const operator: PreviewGrant = {v: 1, role: 'operator', exp: 1_900_000_000, apply: {origin: 'http://127.0.0.1:8787', slug: 'example-firm'}}
const client: PreviewGrant = {v: 1, role: 'client', exp: 1_900_000_000, styleSet: 'graphite', palette: 'navy-brass', flow: 'alternating.balanced', view: 'design'}
const choices = {styleSet: 'graphite', palette: 'navy-brass', flow: 'site', view: 'design' as const}
/** A chrome whose style set names a texture, so Cut blocks' one need is met. */
const chromeWithTexture = {designTokens: {patternTexture: 'diagonalHatch'}, header: {siteSettings: {firmName: 'Example Law Firm'}, mainNavigation: {defaultScheme: 'light', heroMerge: false}}} as unknown as SiteChrome

beforeEach(() => vi.stubEnv('SITE_PREVIEW_SECRET', SECRET))
afterEach(() => vi.unstubAllEnvs())

const draw = (grant: PreviewGrant, doc = stored, c = choices, canvas: unknown = [], chrome: SiteChrome | null = null, hero: 'dark' | 'image' | 'tint' | 'light' | null = null) =>
  render(<Switcher grant={grant} choices={c} plan={planPreview(doc, c)} canvas={canvas} chrome={chrome} origin="https://example.com" hero={hero} />).container

const hrefs = (el: Element) => [...el.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')

describe('Switcher, the operator', () => {
  it('offers every style set, palette and theme family as a link to another preview address, and the view', () => {
    const links = hrefs(draw(operator))
    for (const t of THEMES) expect(links).toContain(`/site-preview/${t.id}/navy-brass/site/design`)
    for (const p of PALETTE_PRESETS) expect(links).toContain(`/site-preview/graphite/${p.id}/site/design`)
    for (const f of FAMILIES) expect(links).toContain(`/site-preview/graphite/navy-brass/${flowId(f.id, f.defaultStep)}/design`)
    expect(links).toContain('/site-preview/site/navy-brass/site/design')
    expect(links).toContain('/site-preview/graphite/site/site/design')
    expect(links).toContain('/site-preview/graphite/navy-brass/site/design')
    expect(links).toContain('/site-preview/graphite/navy-brass/site/grey')
  })

  it('the theme row heads with the bundle sentinel, names each family with its sentence, and says what the site wears', () => {
    const c = draw(operator)
    expect(c.textContent).toContain(ROW_THEME_HEAD)
    for (const f of FAMILIES) {
      expect(c.textContent).toContain(f.name)
      expect(c.textContent).toContain(f.sentence)
    }
    // Nothing stored: the site wears the platform default.
    expect(c.textContent).toContain('As the site is: Quiet')
    expect(c.textContent).toContain('Theme: Quiet. A dark hero, then light all the way down')
  })

  it('a two-step family shows its steps on a second line with the chosen one active, and a step the eye has not passed says so', () => {
    const c = draw(operator, stored, {...choices, flow: 'cutBlocks.mostlyDark'})
    expect(c.textContent).toContain('Step: Cut blocks')
    const steps = [...c.querySelectorAll('a')].filter((a) => a.getAttribute('href')?.includes('/cutBlocks.'))
    expect(steps.map((a) => a.getAttribute('href'))).toEqual(expect.arrayContaining([
      '/site-preview/graphite/navy-brass/cutBlocks.balanced/design',
      '/site-preview/graphite/navy-brass/cutBlocks.mostlyDark/design',
    ]))
    const active = steps.find((a) => a.getAttribute('aria-current') === 'true')!
    expect(active.getAttribute('href')).toBe('/site-preview/graphite/navy-brass/cutBlocks.mostlyDark/design')
    // Every step not yet passed says so once: on the step line of a two-step family, on the
    // family's own button where it has one step (Phase 17B session 5).
    const unjudged = FAMILIES.filter((f) => f.steps.length === 1 && !f.passed.includes(f.defaultStep)).length
      + FAMILIES.filter((f) => f.id === 'cutBlocks').flatMap((f) => f.steps.filter((s) => !f.passed.includes(s))).length
    expect((c.textContent!.match(/\(not yet judged\)/g) ?? []).length).toBe(unjudged)
    // A one-step family shows no step line.
    expect(draw(operator, stored, {...choices, flow: 'quiet.mostlyLight'}).textContent).not.toContain('Step: Quiet')
  })

  it('names the needs the page or site lacks for the shown theme, and marks a family whose default step needs them', () => {
    // No style set texture: Cut blocks needs one.
    const bare = draw(operator, stored, {...choices, styleSet: 'site', flow: 'cutBlocks.balanced'})
    expect(bare.textContent).toContain('Needs this page lacks: a style set with a texture; it renders without them.')
    expect(bare.textContent).toContain('Needs a style set with a texture this page lacks.')
    // With the previewed style set naming a texture, the need is met.
    const met = draw(operator, stored, {...choices, styleSet: 'site', flow: 'cutBlocks.balanced'}, [], chromeWithTexture)
    expect(met.textContent).not.toContain('Needs this page lacks')
    expect(met.textContent).not.toContain('Needs texture')
  })

  it('a one-step family whose step the eye has not passed says so on its own button (Phase 17B session 5)', () => {
    expect(familyLabel({name: 'Planted', steps: ['mostlyLight'], passed: [], defaultStep: 'mostlyLight'})).toBe('Planted (not yet judged)')
    expect(familyLabel({name: 'Planted', steps: ['mostlyLight'], passed: ['mostlyLight'], defaultStep: 'mostlyLight'})).toBe('Planted')
    // A two-step family carries the mark on its step line instead.
    expect(familyLabel({name: 'Planted', steps: ['balanced', 'mostlyDark'], passed: [], defaultStep: 'balanced'})).toBe('Planted')
  })

  it('reads the hero it is handed: a theme that wants a dark hero is met by a dark or photo one', () => {
    const tob = {...choices, flow: 'typeOnBlack.allDark'}
    for (const hero of ['dark', 'image'] as const) expect(draw(operator, stored, tob, [], null, hero).textContent, hero).not.toContain('a dark or photo hero')
    for (const hero of ['tint', 'light', null] as const) expect(draw(operator, stored, tob, [], null, hero).textContent, String(hero)).toContain('Needs this page lacks: a dark or photo hero')
  })

  it('counts the bands that keep their own ground, whatever the theme', () => {
    const c = draw(operator, stored, choices, [
      {_type: 'contentSectionInline', _key: 'a', layout: 'statement', heading: 'One', appearance: {surface: 'dark'}},
      {_type: 'contentSectionInline', _key: 'b', layout: 'statement', heading: 'Two', appearance: {surface: 'tint'}},
      {_type: 'practiceAreaNavInline', _key: 'c', heading: 'Areas', appearance: {inset: true}},
      {_type: 'contentSectionInline', _key: 'd', layout: 'statement', heading: 'Four', appearance: {}},
    ])
    expect(c.textContent).toContain('3 sections keep their own ground, whatever the theme: Content section (surface) ×2, Areas of law (inset).')
    expect(draw(operator).textContent).not.toContain('keep their own ground')
  })

  it('signs a client share link bound to the current choices, the theme included', () => {
    const c = {...choices, flow: 'cutBlocks.balanced'}
    const input = draw(operator, stored, c).querySelector('input') as HTMLInputElement
    const url = new URL(input.value)
    expect(url.origin + url.pathname).toBe('https://example.com/site-preview/enter')
    expect(verifyToken(url.searchParams.get('t'), SECRET)).toMatchObject({role: 'client', ...c})
  })

  it('signs an Apply link carrying exactly the plan, the revision it was computed on, and the three names', () => {
    const c = {...choices, flow: 'alternating.balanced'}
    const legacy = {...stored, sectionJoin: 'angled', brandGhost: 'none'}
    const apply = hrefs(draw(operator, legacy, c)).find((h) => h.startsWith('http://127.0.0.1:8787/#/design?t='))!
    const payload = verifyToken(apply.split('?t=')[1], SECRET) as Record<string, unknown>
    const plan = planPreview(legacy, c)
    expect(payload).toMatchObject({kind: 'apply', slug: 'example-firm', rev: 'rev-9', set: plan.set, unset: plan.unset,
      flow: {id: 'alternating.balanced', name: 'Alternating'}})
    expect(plan.set.flow).toBe('alternating.balanced')
    expect(plan.unset).toEqual(['sectionJoin', 'brandGhost'])
    expect(payload).not.toHaveProperty('role')
    // A theme alone is a change worth applying.
    expect(apply).toContain('#/design?t=')
  })

  it('offers no Apply when nothing would change, or when the session came without an Apply target', () => {
    const wearing = {...stored, ...planPreview(stored, choices).set}
    expect(hrefs(draw(operator, wearing)).some((h) => h.includes('#/design'))).toBe(false)
    expect(hrefs(draw({...operator, apply: undefined})).some((h) => h.includes('#/design'))).toBe(false)
    // The theme the site already stores is no change either.
    const themed = {...wearing, flow: 'cutBlocks.balanced'}
    expect(hrefs(draw(operator, themed, {...choices, flow: 'cutBlocks.balanced'})).some((h) => h.includes('#/design'))).toBe(false)
  })

  it('names what the site wears now, and the bands that keep their own look', () => {
    const wearing = {...stored, ...planPreview(stored, choices).set, flow: 'cutBlocks.mostlyDark'}
    const c = draw(operator, wearing, {styleSet: 'site', palette: 'site', flow: 'site', view: 'design'}, [
      {_type: 'attorneySectionInline', _key: 'a', cardStyle: 'portrait'},
      {_type: 'contentSectionInline', _key: 'b', imageTreatment: 'framed'},
      {_type: 'contentSectionInline', _key: 'c', imageTreatment: 'slab'},
    ])
    expect(c.textContent).toContain('As the site is: Graphite')
    expect(c.textContent).toContain('As the site is: Navy & Brass')
    expect(c.textContent).toContain('As the site is: Cut blocks, mostly dark')
    expect(c.textContent).toContain('Attorneys (card style), Content section (photo frame) ×2')
    // A stored theme's family shows its steps, the stored one active.
    expect(c.textContent).toContain('Step: Cut blocks')
  })

  it('the chrome note says what the theme gives the header and footer, and names what is stored (Phase 17B session 4)', () => {
    const dark = FLOWS.find((f) => f.id === 'cutBlocks.mostlyDark')!
    const light = FLOWS.find((f) => f.id === 'quiet.mostlyLight')!
    expect(chromeNote(dark, null)).toBe(`${CHROME_NOTE_HEAD}: a dark header and a dark footer.`)
    expect(chromeNote(light, null)).toBe(`${CHROME_NOTE_HEAD}: a light header and a dark footer.`)
    // A stored scheme wins, per field, and the note names it.
    const stored = chromeNote(dark, {header: {mainNavigation: {scrolledScheme: 'glass'}}, footer: {footerSettings: {footerScheme: 'light'}}})
    expect(stored).toContain('a dark, glass when scrolled header and a light footer')
    expect(stored).toContain('Stored, so no theme reaches them: the header when scrolled (glass), the footer (light)')
    // The light logo without the dark one keeps a dark theme's header light, and says why.
    const noDarkLogo = chromeNote(dark, {header: {designSettings: {logoOnLight: {src: 'x'}, logoOnDark: null}}})
    expect(noDarkLogo).toContain('a light header')
    expect(noDarkLogo).toContain('needs the logo for dark grounds')
  })
})

describe('Switcher, the client', () => {
  it('shows one line: the three choices, that nothing is live, and when it ends; no roster, no Apply, no share link', () => {
    const c = draw(client, stored, {...choices, flow: 'alternating.balanced'})
    expect(c.textContent).toContain('Preview, not live yet')
    expect(c.textContent).toContain('Graphite, Navy & Brass, Alternating')
    expect(c.textContent).toContain('Links on this page open the live site')
    expect(c.textContent).not.toContain(ROW_THEME_HEAD)
    expect(c.querySelectorAll('a')).toHaveLength(0)
    expect(c.querySelector('input')).toBeNull()
  })
})
