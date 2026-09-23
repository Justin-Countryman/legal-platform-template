import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {
  CLOSES, DARKNESS, DARK_BUDGETS, DARK_PAINTS, DARK_RHYTHMS, DEFAULT_FLOW, DIVIDER_ATS, FAMILIES, FLOWS, GHOSTS, HAIRLINES, HIDDEN_FIELDS,
  HOSTS, LIGHT_PAINTS, NEEDS, STEP_HOSTS, bridgeOf, closeSurface, darkBudget, flowById, flowOf, hostOf, impliedNeeds, saturatedFillOk,
  storesHiddenFields, unmetNeeds, CHROME_SCHEMES, STEP_CHROME, chromeSchemes, darkHeaderReady,
} from '../flows'
import {DIVIDERS, CARRY_PIECES} from '../dividers'
import {OVERLAPS} from '../overlaps'
import {PALETTE_PRESETS, presetInputs} from '../palettes'
import {THEME_FIELDS, THEME_PICKS} from '../themes'
import {ROWS_BY_ROLE} from './fixtures/composerRoles'

// The theme roster (Phase 17B, [R-509]): a theme is data in a closed vocabulary,
// generated from families whose steps the eye has passed. Every generated theme
// names every word with a legal value; the Python mirror in `studio/presets.json`
// carries the same roster (`presets.test.ts`).

const fieldMap = JSON.parse(readFileSync(resolve(__dirname, '../../../studio/field-map.json'), 'utf8'))
const designRows: Array<{path: string; options?: {list?: Array<string | number>}; hidden?: boolean | string}> = fieldMap.types.designSettings.fields

describe('the families and the roster', () => {
  it('every family names legal steps and a default among them', () => {
    for (const f of FAMILIES) {
      expect(f.steps.length, f.id).toBeGreaterThan(0)
      for (const s of f.steps) expect(DARKNESS).toContain(s)
      expect(f.steps, `${f.id} default`).toContain(f.defaultStep)
      expect(new Set(f.steps).size).toBe(f.steps.length)
    }
  })

  it('a family passes only steps it ships, and each roster entry carries its family’s verdict ([R-517])', () => {
    for (const f of FAMILIES) {
      for (const s of f.passed) expect(f.steps, `${f.id} passed a step it does not ship`).toContain(s)
    }
    for (const flow of FLOWS) {
      const family = FAMILIES.find((f) => f.id === flow.family)!
      expect(flow.passed).toBe(family.passed.includes(flow.step))
    }
  })

  it('the eye pass of 2026-09-23 passed four of the five steps; Alternating at mostly dark waits on a rule', () => {
    expect(FLOWS.filter((f) => f.passed).map((f) => f.id)).toEqual(['quiet.mostlyLight', 'alternating.balanced', 'cutBlocks.balanced', 'cutBlocks.mostlyDark'])
    expect(flowById('alternating.mostlyDark')!.passed).toBe(false)
  })

  it('generates one theme per family per step, with unique ids of the form family.step', () => {
    const ids = FLOWS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(FAMILIES.flatMap((f) => f.steps.map((s) => `${f.id}.${s}`)))
    for (const flow of FLOWS) {
      expect(flow.family).toBe(flow.id.split('.')[0])
      expect(flow.step).toBe(flow.id.split('.')[1])
      expect(flow.sentence.length).toBeGreaterThan(20)
    }
  })

  it('ships the three families of session 2: Quiet, Alternating and Cut blocks', () => {
    expect(FAMILIES.map((f) => f.id)).toEqual(['quiet', 'alternating', 'cutBlocks'])
    expect(FLOWS.map((f) => f.id)).toEqual(['quiet.mostlyLight', 'alternating.balanced', 'alternating.mostlyDark', 'cutBlocks.balanced', 'cutBlocks.mostlyDark'])
  })

  it.each(FLOWS.map((f) => [f.id, f] as const))('%s names every vocabulary field with a legal value', (_, flow) => {
    expect(DARK_BUDGETS).toContain(flow.dark.budget)
    expect(DARK_RHYTHMS).toContain(flow.dark.rhythm)
    expect(DARK_PAINTS).toContain(flow.dark.paint)
    expect(CLOSES).toContain(flow.dark.close)
    for (const h of flow.dark.hosts) expect(HOSTS).toContain(h)
    expect(new Set(flow.dark.hosts).size).toBe(flow.dark.hosts.length)
    expect(LIGHT_PAINTS).toContain(flow.light.paint)
    expect(DIVIDERS).toContain(flow.divider.shape)
    expect(DIVIDER_ATS).toContain(flow.divider.at)
    for (const c of flow.divider.carry) expect(CARRY_PIECES).toContain(c)
    expect(HAIRLINES).toContain(flow.divider.hairline)
    expect(GHOSTS).toContain(flow.ghost)
    expect(OVERLAPS).toContain(flow.overlap)
    for (const n of flow.needs) expect(NEEDS).toContain(n)
    // The Studio offers every shape a theme may name.
    expect(designRows.find((r) => r.path === 'sectionJoin')?.options?.list).toContain(flow.divider.shape)
  })

  it.each(FLOWS.map((f) => [f.id, f] as const))('%s: its needs match its paints and hosts, and the mark stays off ([R-488])', (_, flow) => {
    for (const need of impliedNeeds(flow)) expect(flow.needs, `${flow.id} needs ${need}`).toContain(need)
    for (const need of flow.needs) {
      if ((HOSTS as readonly string[]).includes(need)) expect(flow.dark.hosts).toContain(need)
    }
    expect(flow.divider.carry).not.toContain('mark')
    // A carried piece needs a shape to carry ([R-483]).
    if (flow.divider.carry.length) expect(flow.divider.shape).not.toBe('straight')
  })

  it('the default is a roster id, and the Studio offers every id', () => {
    expect(flowById(DEFAULT_FLOW)).not.toBeNull()
    expect(DEFAULT_FLOW).toBe('quiet.mostlyLight')
    const offered = designRows.find((r) => r.path === 'flow')?.options?.list
    expect(offered).toEqual(FLOWS.map((f) => f.id))
    expect(flowById('nope')).toBeNull()
    expect(flowById(undefined)).toBeNull()
  })

  it('the step table is the record’s §2.5: the budget, the hosts in the evidence order, the rhythm', () => {
    expect(STEP_HOSTS.mostlyLight).toEqual([])
    expect(STEP_HOSTS.balanced).toEqual(['ribbon', 'testimonials', 'attorneys', 'caseResults', 'areas', 'split', 'narrative'])
    expect(STEP_HOSTS.balanced).not.toContain('statement')
    expect(STEP_HOSTS.mostlyDark).toEqual(['ribbon', 'narrative', 'areas', 'testimonials', 'statement', 'attorneys', 'caseResults', 'split', 'badges'])
    expect(STEP_HOSTS.allDark).toEqual(HOSTS)
    expect([13, 6, 1].map((n) => darkBudget('third', n))).toEqual([5, 2, 1])
    expect([13, 6, 4].map((n) => darkBudget('threeQuarters', n))).toEqual([9, 4, 3])
    // A darker step never darkens less than a lighter one, on a page of any size (ADV-17B-2 F10).
    for (let n = 1; n <= 20; n++) {
      expect(darkBudget('threeQuarters', n), `n=${n}`).toBeGreaterThanOrEqual(darkBudget('third', n))
      expect(darkBudget('all', n)).toBeGreaterThanOrEqual(darkBudget('threeQuarters', n))
    }
    expect(darkBudget('threeQuarters', 1)).toBe(1)
    expect(darkBudget('none', 13)).toBe(0)
    expect(darkBudget('all', 13)).toBe(13)
  })
})

describe('hosts', () => {
  it('every composer role maps to a host by its stable key, whatever its type says', () => {
    // The composer writes both the differentiators and the narrative as a two-column
    // content section; only the key tells them apart (ADV-17B-A F4).
    const expected: Record<string, string> = {
      differentiators: 'differentiators', caseResults: 'caseResults', areasOfLaw: 'areas',
      narrative: 'narrative', attorneys: 'attorneys', badges: 'badges',
    }
    expect(Object.keys(ROWS_BY_ROLE).sort()).toEqual(Object.keys(expected).sort())
    for (const [role, row] of Object.entries(ROWS_BY_ROLE)) {
      expect(hostOf({_type: row.type, _key: row.key, layout: row.layout}), role).toBe(expected[role])
    }
    expect(hostOf({_type: 'contentSectionInline', _key: 'hp-differentiatorBlock', layout: 'twoColumnText'})).toBe('differentiators')
    expect(hostOf({_type: 'contentSectionInline', _key: 'hp-narrativeBlock', layout: 'twoColumnText'})).toBe('narrative')
  })

  it('a hand-added band is named by its type, and a content section by its layout', () => {
    expect(hostOf({_type: 'contentSectionInline', _key: 'x', layout: 'ribbon'})).toBe('ribbon')
    expect(hostOf({_type: 'contentSectionInline', _key: 'x', layout: 'statement'})).toBe('statement')
    expect(hostOf({_type: 'contentSectionInline', _key: 'x', layout: 'statRow'})).toBe('statRow')
    expect(hostOf({_type: 'contentSectionInline', _key: 'x', layout: 'twoColumnText'})).toBe('narrative')
    expect(hostOf({_type: 'contentSectionInline', _key: 'x', layout: 'split'})).toBe('split')
    // No layout stored: the component renders split.
    expect(hostOf({_type: 'contentSectionInline', _key: 'x'})).toBe('split')
    expect(hostOf({_type: 'testimonialsGridInline', _key: 'x'})).toBe('testimonials')
    expect(hostOf({_type: 'featuredTestimonialInline', _key: 'x'})).toBe('testimonials')
    expect(hostOf({_type: 'videoSectionInline', _key: 'x'})).toBe('video')
    expect(hostOf({_type: 'reviewsSectionInline', _key: 'x'})).toBe('reviews')
    expect(hostOf({_type: 'somethingElse', _key: 'x'})).toBeNull()
    expect(hostOf(null)).toBeNull()
  })
})

describe('the compat bridge, for one pin', () => {
  it('a stored flow wins; else the six retired fields bridge; else the platform default', () => {
    expect(flowOf({flow: 'alternating.mostlyDark', sectionJoin: 'peak'}).id).toBe('alternating.mostlyDark')
    expect(flowOf({flow: 'not-a-theme', sectionJoin: 'peak'}).id).toBe('stored.bridge')
    expect(flowOf({}).id).toBe(DEFAULT_FLOW)
    expect(flowOf(null).id).toBe(DEFAULT_FLOW)
    expect(flowOf({fontPairingPreset: 4, headingRule: 'line'}).id).toBe(DEFAULT_FLOW)
  })

  it('fires on any of the six being present, even at a value that names no device', () => {
    // A style set applied before this pin wrote `brandGhost: none` and the like; a fresh
    // build never writes them, so presence marks a stored client, and propagation must
    // change nothing on one until Apply.
    expect(storesHiddenFields({brandGhost: 'none'})).toBe(true)
    expect(storesHiddenFields({dividerCarry: []})).toBe(true)
    expect(storesHiddenFields({sectionJoin: null, patternGround: undefined})).toBe(false)
    expect(storesHiddenFields({})).toBe(false)
    const asDune = flowOf({brandGhost: 'none', sectionOverlap: 'none', sectionGradient: 'none', patternGround: 'light'})
    expect(asDune.id).toBe('stored.bridge')
    expect(asDune.dark.close).toBe('muted')
    expect(asDune.divider.shape).toBe('straight')
    expect(HIDDEN_FIELDS).toEqual(['sectionJoin', 'dividerCarry', 'patternGround', 'brandGhost', 'sectionOverlap', 'sectionGradient'])
  })

  it('reads each field the way the site read it, and darkens nothing', () => {
    const b = bridgeOf({sectionJoin: 'angled', dividerCarry: ['cards', 'nonsense'], patternGround: 'dark', patternTexture: 'diagonalHatch',
      brandGhost: 'on', sectionOverlap: 'photo', sectionGradient: 'deep'})
    expect(b.divider).toEqual({shape: 'angled', at: 'intoDark', carry: ['cards'], hairline: 'none'})
    expect(b.ghost).toBe('once')
    expect(b.overlap).toBe('photo')
    expect(b.dark).toEqual({budget: 'none', hosts: [], rhythm: 'bookends', paint: 'gradient', close: 'muted'})
    expect(b.light.paint).toBe('plain')
    // Unknown values read as nothing, as the site read them.
    const none = bridgeOf({sectionJoin: 'squiggle', sectionOverlap: 'yes', brandGhost: 'true', sectionGradient: 'shallow'})
    expect(none.divider.shape).toBe('straight')
    expect(none.overlap).toBe('none')
    expect(none.ghost).toBe('none')
    expect(none.dark.paint).toBe('plain')
  })

  it('maps a dark texture ground to the plain dark paint, because today it textured no stored dark band', () => {
    // `patternGround: dark` flipped a stored Pattern band onto the dark ground and touched
    // nothing else; a theme's `pattern` paint textures every dark band, which would change
    // a stored client's page under the bridge. A stored Pattern band is light under every
    // theme since amendment 5.
    expect(bridgeOf({patternGround: 'dark', patternTexture: 'scallop'}).dark.paint).toBe('plain')
  })
})

describe('needs and gates', () => {
  it('names what a canvas lacks: two photo bands for a photo theme, one band per host, the texture, the initials', () => {
    const photo = {...flowById('quiet.mostlyLight')!, needs: ['photos', 'texture', 'initials', 'ribbon'] as const}
    expect(unmetNeeds(photo, {hosts: ['areas'], photos: 1, texture: false, initials: false})).toEqual(['photos', 'texture', 'initials', 'ribbon'])
    expect(unmetNeeds(photo, {hosts: ['ribbon'], photos: 2, texture: true, initials: true})).toEqual([])
    expect(unmetNeeds(flowById('cutBlocks.balanced')!, {hosts: [], photos: 0, texture: false, initials: false})).toEqual(['texture'])
    expect(unmetNeeds(flowById('cutBlocks.balanced')!, {hosts: [], photos: 0, texture: true, initials: false})).toEqual([])
  })

  it('the saturated fill is gated on the palette: every shipped preset passes, the grey placeholder does not', () => {
    expect(saturatedFillOk({})).toBe(false)
    expect(saturatedFillOk(null)).toBe(false)
    for (const p of PALETTE_PRESETS) expect(saturatedFillOk(presetInputs(p)), p.id).toBe(true)
    // A grey accent has no chroma.
    expect(saturatedFillOk({darkGround: '#1c2b4a', lightGround: '#ffffff', accent: '#777777'})).toBe(false)
  })

  it('the close falls back to dark where the fill is refused', () => {
    const q = flowById('quiet.mostlyLight')!
    expect(closeSurface(q, false)).toBe('dark')
    expect(closeSurface({...q, dark: {...q.dark, close: 'saturated'}}, false)).toBe('dark')
    expect(closeSurface({...q, dark: {...q.dark, close: 'saturated'}}, true)).toBe('saturated')
    expect(closeSurface({...q, dark: {...q.dark, close: 'muted'}}, true)).toBe('muted')
    expect(closeSurface(null, true)).toBe('muted')
  })
})

describe('the move (Phase 17B, [R-510])', () => {
  it('the six hidden fields are in no style set and hidden in the schema, and flow is offered unseeded', () => {
    for (const f of HIDDEN_FIELDS) {
      expect(THEME_FIELDS).not.toContain(f)
      expect(THEME_PICKS).not.toContain(f)
      expect(designRows.find((r) => r.path === f)?.hidden, f).toBe(true)
    }
    const flowRow = designRows.find((r) => r.path === 'flow') as {initialValue?: unknown} | undefined
    expect(flowRow).toBeDefined()
    expect(flowRow?.initialValue).toBeUndefined()
  })
})

describe('the header and the footer (Phase 17B session 4, [R-518])', () => {
  const byId = (id: string) => FLOWS.find((f) => f.id === id)!
  const LIGHT_LOGO = {src: '/on-light.png'}
  const DARK_LOGO = {src: '/on-dark.png'}

  it('every theme names a header and a footer from the closed vocabulary, light or dark only, never transparent or glass', () => {
    for (const f of FLOWS) {
      expect(CHROME_SCHEMES).toContain(f.chrome.header)
      expect(CHROME_SCHEMES).toContain(f.chrome.footer)
    }
    expect([...CHROME_SCHEMES]).toEqual(['light', 'dark'])
  })

  it('the step decides: the lighter steps keep the white bar and dark footer; the darker steps darken the bar', () => {
    expect(STEP_CHROME).toEqual({
      mostlyLight: {header: 'light', footer: 'dark'},
      balanced: {header: 'light', footer: 'dark'},
      mostlyDark: {header: 'dark', footer: 'dark'},
      allDark: {header: 'dark', footer: 'dark'},
    })
    for (const f of FLOWS) expect(f.chrome).toEqual(STEP_CHROME[f.step])
  })

  it('the bridge and the platform default give what every client renders today: a light header, a dark footer', () => {
    expect(bridgeOf({sectionJoin: 'angled'}).chrome).toEqual({header: 'light', footer: 'dark'})
    expect(flowOf(null).chrome).toEqual({header: 'light', footer: 'dark'})
    expect(flowById(DEFAULT_FLOW)!.chrome).toEqual({header: 'light', footer: 'dark'})
  })

  it('a stored scheme wins, per field; the theme fills what is absent', () => {
    const dark = byId('cutBlocks.mostlyDark')
    const logos = {onLight: LIGHT_LOGO, onDark: DARK_LOGO}
    expect(chromeSchemes(dark, null, null, logos)).toEqual({top: 'dark', scrolled: 'dark', footer: 'dark', darkLogoMissing: false})
    expect(chromeSchemes(dark, {defaultScheme: 'light'}, null, logos)).toMatchObject({top: 'light', scrolled: 'dark'})
    expect(chromeSchemes(dark, {scrolledScheme: 'glass'}, {footerScheme: 'light'}, logos)).toMatchObject({top: 'dark', scrolled: 'glass', footer: 'light'})
    const quiet = byId('quiet.mostlyLight')
    expect(chromeSchemes(quiet, {defaultScheme: 'transparent-dark'}, null, logos)).toMatchObject({top: 'transparent-dark', scrolled: 'light'})
    // An unknown stored footer value is not a scheme: the theme's.
    expect(chromeSchemes(quiet, null, {footerScheme: 'blue'}, logos).footer).toBe('dark')
  })

  it('the theme never yields a transparent value, merged header or not', () => {
    for (const f of FLOWS) {
      const s = chromeSchemes(f, {}, {}, null)
      expect(s.top.startsWith('transparent')).toBe(false)
      expect(s.scrolled.startsWith('transparent')).toBe(false)
    }
  })

  it('a dark header needs the logo for dark grounds: the light logo without the dark one keeps the header light and says so', () => {
    const dark = byId('cutBlocks.mostlyDark')
    expect(darkHeaderReady({onLight: LIGHT_LOGO, onDark: null})).toBe(false)
    expect(darkHeaderReady({onLight: LIGHT_LOGO, onDark: DARK_LOGO})).toBe(true)
    // No logo at all prints the firm's name, which reads on either ground.
    expect(darkHeaderReady({onLight: null, onDark: null})).toBe(true)
    // A logo field with alt text and no image is no logo (the query answers {src: null}).
    expect(darkHeaderReady({onLight: LIGHT_LOGO, onDark: {src: null}})).toBe(false)
    expect(darkHeaderReady({onLight: {src: null}, onDark: null})).toBe(true)
    expect(chromeSchemes(dark, null, null, {onLight: LIGHT_LOGO, onDark: null})).toEqual({top: 'light', scrolled: 'light', footer: 'dark', darkLogoMissing: true})
    // A stored dark header is the operator's: it stands, logo or not.
    expect(chromeSchemes(dark, {defaultScheme: 'dark'}, null, {onLight: LIGHT_LOGO, onDark: null}).top).toBe('dark')
  })
})
