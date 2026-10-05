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
import {RETIRED_STYLE_SETS, STYLE_SETS} from '@/lib/styleSets'
import {PALETTE_PRESETS} from '@/lib/palettes'
import {FAMILIES, FLOWS, flowId} from '@/lib/flows'
import {planPreview, type StoredDesign} from '@/lib/preview/plan'
import {verifyToken, type PreviewGrant} from '@/lib/preview/session'
import {type SiteChrome} from '@/components/layout/SiteShell'
import {setPhotoEntries} from '@/lib/heroGround'

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
    for (const t of STYLE_SETS) expect(links).toContain(`/site-preview/${t.id}/navy-brass/site/design`)
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
    expect(c.textContent).toContain('Theme: Quiet. A dark hero, the ribbon on the accent, then light all the way down')
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
    // Counted on the theme rows only: since Phase 17C session 2b the style-set row marks its own
    // unjudged entries the same way.
    const flowRows = [...c.querySelectorAll('.sw-row')].slice(3).map((r) => r.textContent ?? '').join(' ')
    expect((flowRows.match(/\(not yet judged\)/g) ?? []).length).toBe(unjudged)
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
    expect(chromeNote(light, null)).toBe(`${CHROME_NOTE_HEAD}: a light header and a light footer.`)
    // A stored scheme wins, per field, and the note names it.
    const stored = chromeNote(dark, {header: {mainNavigation: {scrolledScheme: 'glass'}}, footer: {footerSettings: {footerScheme: 'light'}}})
    expect(stored).toContain('a dark, glass when scrolled header and a light footer')
    expect(stored).toContain('Stored, so no theme reaches them: the header when scrolled (glass), the footer (light)')
    // The light logo without the dark one keeps a dark theme's header light, and says why.
    const noDarkLogo = chromeNote(dark, {header: {designSettings: {logoOnLight: {src: 'x'}, logoOnDark: null}}})
    expect(noDarkLogo).toContain('a light header')
    expect(noDarkLogo).toContain('needs a logo for dark grounds with no white or colored box of its own')
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

describe('Switcher, the hero photograph (Phase 17B session 6, `[R-532]`)', () => {
  const PHOTO = {src: 'https://cdn.example.com/city.jpg', width: 2400, height: 1600, hotspot: null, assetId: 'image-abc-2400x1600-jpg'}
  const scrims = {...choices, flow: 'photoScrims.mostlyDark'}
  const withPhoto = (doc: StoredDesign, c: typeof choices, heroPhoto: typeof PHOTO | null, chrome: SiteChrome | null) => {
    const plan = planPreview(doc, c, heroPhoto?.assetId ?? null)
    const shown = chrome ? {...chrome, designTokens: {...(chrome.designTokens as object), ...plan.set}} as unknown as SiteChrome : null
    return render(<Switcher grant={operator} choices={c} plan={plan} canvas={[]} chrome={shown} origin="https://example.com" hero="image" heroPhoto={heroPhoto} />).container.textContent ?? ''
  }

  it('names the need in words where the hero has no photograph, and not where it has one', () => {
    expect(withPhoto(stored, scrims, null, chromeWithTexture)).toContain('a landscape hero photograph of a place, approved with this theme')
    expect(withPhoto(stored, scrims, PHOTO, chromeWithTexture)).not.toContain('Needs this page lacks: a landscape hero photograph')
  })

  it('says so when the photograph changed since the theme was applied, and not when it is the approved one', () => {
    const applied: StoredDesign = {...stored, flow: 'photoScrims.mostlyDark', flowPhoto: 'image-old-2400x1600-jpg'}
    const siteIs = {...choices, flow: 'site'}
    const stale = {...chromeWithTexture, designTokens: {patternTexture: 'diagonalHatch', flow: 'photoScrims.mostlyDark', flowPhoto: 'image-old-2400x1600-jpg'}} as unknown as SiteChrome
    expect(withPhoto(applied, siteIs, PHOTO, stale)).toContain('The hero photograph changed since Photo scrims was applied')
    // Choosing the theme again approves the live photograph: the note goes.
    expect(withPhoto(applied, scrims, PHOTO, stale)).not.toContain('The hero photograph changed')
    const current = {...chromeWithTexture, designTokens: {patternTexture: 'diagonalHatch', flow: 'photoScrims.mostlyDark', flowPhoto: PHOTO.assetId}} as unknown as SiteChrome
    expect(withPhoto({...applied, flowPhoto: PHOTO.assetId}, siteIs, PHOTO, current)).not.toContain('The hero photograph changed')
  })
})

describe('Switcher, the theme photographs (Phase 17E, `[R-574]`)', () => {
  const HERO = {src: 'https://cdn.example.com/city.jpg', width: 2400, height: 1600, hotspot: null, assetId: 'image-hero-2400x1600-jpg'}
  const scrims = {...choices, flow: 'photoScrims.mostlyDark'}
  const raw = (n: string, over: Record<string, unknown> = {}) => ({asset: {_ref: `image-${n}-2400x1600-jpg`}, width: 2400, height: 1600, isOpaque: true, assetId: `image-${n}-2400x1600-jpg`, ...over})
  const tokens = {patternTexture: 'diagonalHatch', themePhotos: [raw('a'), raw('b'), raw('a'), raw('small', {width: 1200, height: 800})], flowPhotos: ['image-a-2400x1600-jpg']}
  const draw = (heroPhoto: typeof HERO | null, c = scrims, canvas: unknown[] = [], over: Record<string, unknown> = {}) => {
    const doc: StoredDesign = {...stored, ...tokens}
    const plan = planPreview(doc, c, heroPhoto?.assetId ?? null)
    const chrome = {...chromeWithTexture, designTokens: {...tokens, ...plan.set, ...over}} as unknown as SiteChrome
    const entries = setPhotoEntries(tokens, heroPhoto?.assetId)
    return render(<Switcher grant={operator} choices={c} plan={plan} canvas={canvas as never} chrome={chrome} origin="https://example.com" hero="image" heroPhoto={heroPhoto} photoSet={entries} closeShown />).container
  }
  // Text bands a mostly dark page fills, each a run of its own between ribbons.
  const text = (k: string) => ({_type: 'contentSectionInline', _key: k, layout: 'twoColumnText', heading: `Band ${k}`, body: [{_type: 'block', _key: `${k}b`, children: [{_type: 'span', _key: `${k}s`, text: 'Words.'}]}]})
  const ribbon = (k: string) => ({_type: 'contentSectionInline', _key: k, layout: 'ribbon', heading: `Line ${k}`})
  const long = [text('a'), ribbon('r1'), text('b'), ribbon('r2'), text('c'), ribbon('r3'), text('d')]

  it('lists every photograph with a thumbnail and says why one does not show, or waits for approval', () => {
    const c = draw(HERO)
    const text = c.textContent ?? ''
    expect(c.querySelectorAll('.sw-photo img')).toHaveLength(4)
    expect(text).toContain('Theme photographs')
    expect(text).toContain('not yet approved: it shows once this theme is applied')
    expect(text).toContain('not shown: the same photograph is in the set twice')
    expect(text).toContain('not shown: under 1,600 pixels wide')
    // The close renders and takes the first photograph; the canvas is empty, so nothing else is placed.
    expect(text).toContain('This page shows 1 of the 2 photographs it can use')
  })

  it('shows each photograph whole as cropped, with a link to it at full size', () => {
    const img = draw(HERO).querySelector('.sw-photo img')!
    const thumb = new URL(img.getAttribute('src')!)
    expect([thumb.searchParams.get('w'), thumb.searchParams.get('h'), thumb.searchParams.get('fit')]).toEqual(['240', null, 'max'])
    const link = img.closest('a')!
    expect(new URL(link.getAttribute('href')!).searchParams.get('w')).toBe('1600')
    expect([link.getAttribute('target'), link.getAttribute('rel')]).toEqual(['_blank', 'noopener noreferrer'])
  })

  it('says how many places on the page stay plain when the set is shorter', () => {
    const t = draw(HERO, scrims, long).textContent ?? ''
    expect(t).toContain('This page shows 2 of the 2 photographs it can use, the first behind the closing call to action. 1 more place on this page could take a photograph and stays plain until the set has more.')
    expect(t).not.toContain('waits for a longer page')
  })

  it('places nothing beside a hero photograph that waits for approval, and says so', () => {
    const t = draw(HERO, scrims, long, {flowPhoto: 'image-older-2400x1600-jpg'}).textContent ?? ''
    expect(t).toContain('The set shows only beside the approved hero photograph, which waits for Photo scrims to be applied.')
    expect(t).not.toContain('shown on this page')
  })

  it('says the set needs a hero photograph where the homepage has none, and lists nothing under another theme', () => {
    expect(draw(null).textContent).toContain('draws its set only with a hero photograph of a place')
    expect(draw(HERO, {...choices, flow: 'cutBlocks.mostlyDark'}).querySelector('.sw-photos')).toBeNull()
  })
})

// Phase 17C session 2b (`[R-534]`): the eight offered, a retired one named and never offered, a
// style set the eye has not passed says so.
describe('the style-set row after the roster of eight', () => {
  it('offers the eight and never a retired id, and marks a style set the eye has not passed', () => {
    const c = draw(operator, stored, choices)
    const links = [...c.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    for (const t of STYLE_SETS) expect(links).toContain(`/site-preview/${t.id}/navy-brass/site/design`)
    for (const t of RETIRED_STYLE_SETS) expect(links).not.toContain(`/site-preview/${t.id}/navy-brass/site/design`)
    const unjudged = STYLE_SETS.filter((t) => !t.passed).length
    const labels = [...c.querySelectorAll('.sw-row')][1].textContent ?? ''
    expect((labels.match(/\(not yet judged\)/g) ?? []).length).toBe(unjudged)
  })

  it('names a retired style set the site wears, with "(retired)", beside "as the site is"', () => {
    const canvasless = {...stored, ...RETIRED_STYLE_SETS[0].settings, ...RETIRED_STYLE_SETS[0].picks} as typeof stored
    const c = draw(operator, canvasless, {...choices, styleSet: 'site'})
    expect(c.textContent).toContain(`As the site is: ${RETIRED_STYLE_SETS[0].name} (retired)`)
  })

  it('mints no Apply for a retired style set: the typed address renders it, but it is offered nowhere (pre-PR pass F1)', () => {
    const c = draw(operator, stored, {...choices, styleSet: RETIRED_STYLE_SETS[0].id})
    expect(hrefs(c).some((h) => h.includes('#/design'))).toBe(false)
    expect(c.textContent).toContain('no longer offered')
  })
})

// Phase 17C session 3 (`[R-537]`): the meeting's preselection, three first with the reason, the rest behind "All".
describe('the meeting’s preselection', () => {
  const suggest = {
    styleSet: {ids: ['iron', 'flint', 'graphite'], why: 'A fight tone: capitals first.'},
    palette: {ids: ['black-gold', 'navy-brass', 'navy-ice'], why: 'The study’s three commonest pairs.'},
  }
  const rowOf = (el: Element, head: string) => [...el.querySelectorAll('.sw-row')].find((r) => r.querySelector('.sw-head')?.textContent === head)!
  const firstLinks = (row: Element) => [...row.children].filter((c) => c.tagName === 'A').map((a) => a.textContent)

  it('shows the suggested three first with the reason, and the rest behind All', () => {
    const c = draw({...operator, suggest})
    const styles = rowOf(c, 'Style set')
    expect(firstLinks(styles)).toEqual([expect.stringContaining('As the site is'), 'Iron', 'Flint', 'Graphite'])
    const all = styles.querySelector('details.sw-all')!
    expect(all.querySelector('summary')!.textContent).toBe(`All (${STYLE_SETS.length - 3} more)`)
    expect(all.querySelectorAll('a')).toHaveLength(STYLE_SETS.length - 3)
    expect(firstLinks(rowOf(c, 'Palette')).slice(1)).toEqual(['Black & Gold', 'Navy & Brass', 'Navy & Ice'])
    expect(c.textContent).toContain('Suggested first: A fight tone: capitals first.')
    // Every choice is still one click away.
    const links = hrefs(c)
    for (const t of STYLE_SETS) expect(links).toContain(`/site-preview/${t.id}/navy-brass/site/design`)
  })

  it('opens All when the active choice is among the rest', () => {
    const c = draw({...operator, suggest}, stored, {...choices, styleSet: 'birch'})
    expect(rowOf(c, 'Style set').querySelector('details.sw-all')!.hasAttribute('open')).toBe(true)
  })

  it('drops an id this roster does not offer, retired or unknown, and shows the whole row with none left', () => {
    const c = draw({...operator, suggest: {styleSet: {ids: ['canyon', 'iron', 'nope'], why: 'x'}}})
    expect(firstLinks(rowOf(c, 'Style set')).slice(1)).toEqual(['Iron'])
    const none = draw({...operator, suggest: {styleSet: {ids: ['canyon', 'nope'], why: 'x'}}})
    expect(rowOf(none, 'Style set').querySelector('details')).toBeNull()
    expect(none.textContent).not.toContain('Suggested first')
  })

  it('shows the whole roster without a suggestion, as before', () => {
    const c = draw(operator)
    expect(c.querySelector('details.sw-all')).toBeNull()
    expect(firstLinks(rowOf(c, 'Style set'))).toHaveLength(STYLE_SETS.length + 1)
  })

  it('a client sees one line, whatever its grant carried', () => {
    const c = draw({...client, suggest} as PreviewGrant)
    expect(c.querySelectorAll('.sw-row')).toHaveLength(0)
    expect(c.textContent).not.toContain('Suggested first')
  })
})

// Phase 18 session E (monorepo `[R-619]`, `[R-620]`): the palette built from the firm's own colors first in the palette
// row, and the theme's three first in the theme row, each with its reason; the rest one click away.
describe('the firm’s own look in the meeting', () => {
  const brandPalette = {darkGround: '#0c5c63', accent: '#e86a24', lightGround: '#f7f2e8', why: 'Built from the firm’s own teal and orange.'}
  // Three passed steps: an unpassed one is dropped from the three (`[R-517]`), as Quiet is since the roster eye of 2026-10-03.
  const suggestTheme = {ids: ['softWash.mostlyLight', 'editorial.mostlyLight', 'alternating.balanced'], why: 'Warm and calm: Soft wash first.'}
  const rowOf = (el: Element, head: string) => [...el.querySelectorAll('.sw-row')].find((r) => r.querySelector('.sw-head')?.textContent === head)!
  const firstLinks = (row: Element) => [...row.children].filter((c) => c.tagName === 'A').map((a) => a.textContent)

  it('shows Your colors first in the palette row, with its reason, linking the brand address', () => {
    const c = draw({...operator, brandPalette})
    const row = rowOf(c, 'Palette')
    expect(firstLinks(row)[1]).toBe('Your colors')
    expect(hrefs(row)).toContain('/site-preview/graphite/brand/site/design')
    expect(c.textContent).toContain('Your colors: Built from the firm’s own teal and orange.')
    expect(firstLinks(rowOf(draw(operator), 'Palette'))).not.toContain('Your colors')
  })

  it('names Your colors as the palette shown, and a client link sent it carries its roles', () => {
    const c4 = {...choices, palette: 'brand'}
    const c = render(<Switcher grant={{...operator, brandPalette}} choices={c4} plan={planPreview(stored, c4, null, brandPalette)} canvas={[]} chrome={null} origin="https://example.com" />).container
    expect(c.textContent).toContain('Your colors')
    const share = [...c.querySelectorAll('input, a')].map((el) => el.getAttribute('value') ?? el.getAttribute('href') ?? '').find((v) => v.includes('/site-preview/enter?t='))!
    const payload = verifyToken(share.split('?t=')[1], SECRET) as {palette?: string; brandPalette?: unknown}
    expect(payload.palette).toBe('brand')
    expect(payload.brandPalette).toEqual(brandPalette)
  })

  it('shows the theme’s three first, each its exact step, with the reason, and the families behind All', () => {
    const c = draw({...operator, suggestTheme})
    const row = rowOf(c, ROW_THEME_HEAD)
    const first = firstLinks(row)
    expect(first[0]).toContain('As the site is')
    expect(first.slice(1, 4)).toEqual(['Soft wash, mostly light', 'Editorial', 'Alternating'])
    expect(firstLinks(rowOf(draw({...operator, suggestTheme: {...suggestTheme, ids: [...suggestTheme.ids, 'quiet.mostlyLight']}}), ROW_THEME_HEAD)).slice(1, 5)).toEqual(['Soft wash, mostly light', 'Editorial', 'Alternating'])
    expect(hrefs(row)).toContain('/site-preview/graphite/navy-brass/softWash.mostlyLight/design')
    expect(row.querySelector('details.sw-all summary')!.textContent).toBe(`All (${FAMILIES.length} more)`)
    expect(c.textContent).toContain('Suggested first: Warm and calm: Soft wash first.')
    // Without a suggestion, the families as before.
    expect(rowOf(draw(operator), ROW_THEME_HEAD).querySelector('details.sw-all')).toBeNull()
  })
})

// Phase 18 session E's break pass (ADV-18E-D): an inherited hero follows the theme (`themedHero`), so a theme's needs are
// read against the hero as THAT theme draws it, not the previewed one: previewing Soft wash, Type on black still has the
// dark hero it needs, since choosing it draws the hero dark.
describe('a theme’s needs read the hero as that theme draws it', () => {
  it('previewing Soft wash, Type on black is not told it lacks a dark hero', () => {
    const c4 = {...choices, flow: 'softWash.mostlyLight'}
    const heroUnder = (f: {family: string}) => (f.family === 'softWash' ? 'wash' : 'dark') as 'wash' | 'dark'
    const c = render(<Switcher grant={operator} choices={c4} plan={planPreview(stored, c4)} canvas={[]} chrome={null} origin="https://example.com" hero="wash" heroUnder={heroUnder} />).container
    const black = [...c.querySelectorAll('a.sw-family')].find((a) => a.textContent?.startsWith('Type on black'))!
    expect(black.textContent).not.toContain('a dark or photo hero')
  })
})
