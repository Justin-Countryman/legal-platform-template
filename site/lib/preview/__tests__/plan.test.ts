import {describe, it, expect} from 'vitest'
import {RETIRED_STYLE_SETS, STYLE_SETS, matchStyleSet, styleSetPatch} from '@/lib/styleSets'
import {PALETTE_PRESETS, matchPreset} from '@/lib/palettes'
import {DEFAULT_FLOW, FLOWS, HIDDEN_FIELDS} from '@/lib/flows'
import {AS_THE_SITE_IS, OWN_BACKGROUND, OWN_LAYOUT, grantBackground, grantLayout, parseAddress, grantFlow, grantStyleSet, parseChoices, planPreview, withPreview, ownLooks, ownGrounds, previewPath, type PreviewPlan, type StoredDesign} from '../plan'

// What a preview choice changes (Phase 17A, monorepo WS-V1-PHASE17A-DESIGN §2.3).
// The preview renders this plan and Apply writes it, so "shown equals applied"
// reduces to: the plan, applied to the stored settings, IS the chosen style set and
// palette, and touches nothing else.

const applied = (doc: StoredDesign, plan: PreviewPlan): StoredDesign => {
  const out: StoredDesign = {...doc, ...plan.set}
  for (const f of plan.unset) delete out[f]
  return out
}

const plain: StoredDesign = {_id: 'designSettings', _rev: 'rev-1', fontPairingPreset: 1}
const uploads: StoredDesign = {
  _id: 'designSettings', _rev: 'rev-2',
  customFonts: {headingFont: {regular: {asset: {_ref: 'file-heading'}}}},
}
const graphite = STYLE_SETS.find((t) => t.id === 'graphite')!
const wearsGraphite: StoredDesign = {...applied(plain, planPreview(plain, {styleSet: 'graphite', palette: 'site', flow: 'site'}))}
const swapped: StoredDesign = {...wearsGraphite, headingRule: 'hatched'}

describe('planPreview', () => {
  it('on a plain site, a style set is exactly its own patch', () => {
    for (const styleSet of STYLE_SETS) {
      const plan = planPreview({}, {styleSet: styleSet.id, palette: 'site', flow: 'site'})
      expect(plan.set).toEqual(styleSetPatch(styleSet, {}).set)
      expect(plan.unset).toEqual([])
    }
  })

  it('every style set by every palette, applied, is what the Studio names it, on a plain site and an uploaded-font one', () => {
    for (const doc of [plain, uploads, swapped]) {
      for (const styleSet of STYLE_SETS) {
        for (const palette of PALETTE_PRESETS) {
          const after = applied(doc, planPreview(doc, {styleSet: styleSet.id, palette: palette.id, flow: 'site'}))
          expect(matchStyleSet(after)?.styleSet.id).toBe(styleSet.id)
          expect(matchStyleSet(after)?.current).toBe(true)
          expect(matchPreset(after)?.id).toBe(palette.id)
        }
      }
    }
  })

  it('never changes the pairing or the heading weight of a site that renders its own uploaded fonts', () => {
    for (const styleSet of STYLE_SETS) {
      const plan = planPreview(uploads, {styleSet: styleSet.id, palette: 'site', flow: 'site'})
      expect(Object.keys(plan.set)).not.toContain('fontPairingPreset')
      expect(Object.keys(plan.set)).not.toContain('headingWeight')
      expect(plan.unset).not.toContain('fontPairingPreset')
    }
  })

  it('writes only what changes: the style set a site already wears is no change, and a swapped pick survives', () => {
    expect(planPreview(wearsGraphite, {styleSet: 'graphite', palette: 'site', flow: 'site'})).toMatchObject({set: {}, unset: []})
    expect(planPreview(swapped, {styleSet: 'graphite', palette: 'site', flow: 'site'})).toMatchObject({set: {}, unset: []})
    // Another style set replaces the pick with its own.
    expect(planPreview(swapped, {styleSet: 'marble', palette: 'site', flow: 'site'}).unset).toContain('headingRule')
  })

  it('touches only style-set, pick, color and theme fields, and clears only the six retired ones', () => {
    const allowed = new Set([
      ...Object.keys(graphite.settings), 'headingRule',
      'darkGround', 'lightGround', 'accent', 'action', 'flow', 'flowPhoto',
    ])
    const clearable = new Set([...allowed, ...HIDDEN_FIELDS])
    for (const styleSet of STYLE_SETS) {
      for (const palette of PALETTE_PRESETS) {
        for (const flow of [...FLOWS.map((f) => f.id), 'site']) {
          const plan = planPreview({...plain, logoOnLight: {x: 1}, lightGround: '#ffffff', action: '#123456', sectionJoin: 'angled'}, {styleSet: styleSet.id, palette: palette.id, flow})
          for (const f of Object.keys(plan.set)) expect(allowed.has(f), f).toBe(true)
          for (const f of plan.unset) expect(clearable.has(f), f).toBe(true)
        }
      }
    }
  })

  it('a theme that draws the hero’s photograph is approved with the photograph shown; any other theme clears it ([R-532])', () => {
    const photo = 'image-abc-2400x1600-jpg'
    const scrims = {styleSet: 'site', palette: 'site', flow: 'photoScrims.mostlyDark'}
    expect(planPreview(plain, scrims, photo).set).toEqual({flow: 'photoScrims.mostlyDark', flowPhoto: photo})
    const approved = {...plain, flow: 'photoScrims.mostlyDark', flowPhoto: photo}
    // The same photograph again is no change; a new one is approved by choosing the theme again.
    expect(planPreview(approved, scrims, photo)).toMatchObject({set: {}, unset: []})
    expect(planPreview(approved, scrims, 'image-new-2400x1600-jpg').set).toEqual({flowPhoto: 'image-new-2400x1600-jpg'})
    // Another theme clears it; "as the site is" contributes nothing, even with a new photograph.
    expect(planPreview(approved, {...scrims, flow: 'cutBlocks.mostlyDark'}, photo)).toMatchObject({set: {flow: 'cutBlocks.mostlyDark'}, unset: ['flowPhoto']})
    expect(planPreview(approved, {...scrims, flow: 'site'}, 'image-new-2400x1600-jpg')).toMatchObject({set: {}, unset: []})
    // No qualifying photograph: nothing is approved, and a stale approval is cleared.
    expect(planPreview(plain, scrims, null).set).toEqual({flow: 'photoScrims.mostlyDark'})
    expect(planPreview(approved, scrims, null).unset).toEqual(['flowPhoto'])
    // What the preview renders is what Apply writes: the plan applied carries the approval.
    expect(withPreview({designTokens: {...plain}}, planPreview(plain, scrims, photo)).designTokens).toMatchObject({flowPhoto: photo})
  })

  it('a palette writes its four roles and clears an absent one, case-blind', () => {
    const navy = PALETTE_PRESETS.find((p) => p.id === 'navy-brass')!
    const plan = planPreview({...plain, action: '#123456'}, {styleSet: 'site', palette: 'navy-brass', flow: 'site'})
    expect(plan.set).toEqual({darkGround: navy.darkGround, lightGround: navy.lightGround, accent: navy.accent})
    expect(plan.unset).toEqual(['action'])
    const already = {...plain, darkGround: navy.darkGround.toUpperCase(), lightGround: navy.lightGround, accent: navy.accent}
    expect(planPreview(already, {styleSet: 'site', palette: 'navy-brass', flow: 'site'})).toMatchObject({set: {}, unset: []})
  })

  it('"as the site is" and an unknown id change nothing', () => {
    for (const choice of [{styleSet: 'site', palette: 'site', flow: 'site'}, {styleSet: 'nope', palette: 'nope', flow: 'nope'}]) {
      expect(planPreview(plain, choice)).toMatchObject({set: {}, unset: [], styleSet: null, palette: null, flow: null})
    }
  })

  it('carries the revision it was computed on, and names what the site wears now', () => {
    const plan = planPreview(wearsGraphite, {styleSet: 'marble', palette: 'site', flow: 'site'})
    expect(plan.rev).toBe('rev-1')
    expect(plan.wears.styleSet?.styleSet.id).toBe('graphite')
    expect(plan.wears.flow.id).toBe(DEFAULT_FLOW)
  })

  // ── The theme's block (Phase 17B session 3, record §2.10) ──
  it('a chosen theme that differs from the stored one sets `flow` and clears every retired field the document stores', () => {
    const legacy: StoredDesign = {...wearsGraphite, sectionJoin: 'angled', dividerCarry: ['cards'], patternGround: 'dark', brandGhost: 'none'}
    const plan = planPreview(legacy, {styleSet: 'site', palette: 'site', flow: 'alternating.balanced'})
    expect(plan.set).toEqual({flow: 'alternating.balanced'})
    expect(plan.unset).toEqual(['sectionJoin', 'dividerCarry', 'patternGround', 'brandGhost'])
    expect(plan.flow?.id).toBe('alternating.balanced')
    // The site renders the bridge over the six today; the plan names it.
    expect(plan.wears.flow.id).toBe('stored.bridge')
    // Applied, the document wears the theme and the bridge has nothing to read.
    const after = applied(legacy, plan)
    expect(after.flow).toBe('alternating.balanced')
    for (const f of HIDDEN_FIELDS) expect(after).not.toHaveProperty(f)
  })

  it('the theme the site already stores is no change, and "as the site is" contributes nothing even where the six are stored', () => {
    const stored: StoredDesign = {...plain, flow: 'cutBlocks.mostlyDark'}
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'cutBlocks.mostlyDark'})).toMatchObject({set: {}, unset: []})
    expect(planPreview({...plain, sectionJoin: 'peak'}, {styleSet: 'site', palette: 'site', flow: 'site'})).toMatchObject({set: {}, unset: []})
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site'}).wears.flow.id).toBe('cutBlocks.mostlyDark')
  })

  it('choosing the theme the site already stores still clears the six it carries, so an operator can reach zero (ADV-17B-3 F3)', () => {
    const stored: StoredDesign = {...plain, flow: 'quiet.mostlyLight', sectionJoin: 'angled', brandGhost: 'on', sectionGradient: 'deep'}
    const plan = planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'quiet.mostlyLight'})
    expect(plan.set).toEqual({})
    expect(plan.unset).toEqual(['sectionJoin', 'brandGhost', 'sectionGradient'])
  })

  it('a style set and a theme chosen together write the style set’s 18 keys and the theme’s one, and the six retired fields are cleared once', () => {
    const legacy: StoredDesign = {...plain, sectionJoin: 'angled', sectionOverlap: 'photo'}
    const plan = planPreview(legacy, {styleSet: 'graphite', palette: 'site', flow: 'quiet.mostlyLight'})
    expect(plan.set.flow).toBe('quiet.mostlyLight')
    expect(plan.unset.filter((f) => f === 'sectionJoin')).toHaveLength(1)
    expect(plan.unset).toEqual(expect.arrayContaining(['sectionJoin', 'sectionOverlap']))
    for (const f of HIDDEN_FIELDS) expect(Object.keys(plan.set)).not.toContain(f)
  })
})

describe('withPreview', () => {
  it('sets and clears on the projected settings, leaves the rest of the chrome, and mutates nothing', () => {
    const chrome = {header: {x: 1}, designTokens: {uiRadius: 'rounded', action: '#123456', headingFont: {regular: 'https://cdn/x.woff2'}}}
    const plan = {set: {uiRadius: 'sharp', darkGround: '#111111'}, unset: ['action']}
    const out = withPreview(chrome, plan)
    expect(out.designTokens).toEqual({uiRadius: 'sharp', darkGround: '#111111', headingFont: {regular: 'https://cdn/x.woff2'}})
    expect(out.header).toBe(chrome.header)
    expect(chrome.designTokens.uiRadius).toBe('rounded')
    expect(withPreview(null, plan)).toBeNull()
  })
})

describe('parseChoices and previewPath', () => {
  it('reads the three path segments and refuses anything else', () => {
    expect(parseChoices('graphite', 'navy-brass', 'site', 'grey')).toEqual({styleSet: 'graphite', palette: 'navy-brass', flow: 'site', background: 'site', layout: 'site', view: 'grey'})
    expect(parseChoices('site', 'site', 'site', 'design')).not.toBeNull()
    for (const flow of FLOWS) expect(parseChoices('site', 'site', flow.id, 'design')?.flow).toBe(flow.id)
    expect(parseChoices('nope', 'site', 'site', 'design')).toBeNull()
    expect(parseChoices('site', 'nope', 'site', 'design')).toBeNull()
    expect(parseChoices('site', 'site', 'nope', 'design')).toBeNull()
    expect(parseChoices('site', 'site', 'stored.bridge', 'design')).toBeNull()
    expect(parseChoices('site', 'site', 'site', 'print')).toBeNull()
    expect(previewPath({styleSet: 'graphite', palette: 'site', flow: 'alternating.balanced', view: 'design'})).toBe('/site-preview/graphite/site/alternating.balanced/design')
  })
})

describe('ownGrounds', () => {
  it('names the bands whose stored surface or inset no theme reaches, from the projected appearance', () => {
    const grounds = ownGrounds([
      {_type: 'contentSectionInline', _key: 'a', appearance: {surface: 'dark', inset: null}},
      {_type: 'contentSectionInline', _key: 'b', appearance: {surface: null, inset: true}},
      {_type: 'practiceAreaNavInline', _key: 'c', appearance: {surface: 'light'}},
      {_type: 'attorneySectionInline', _key: 'd', appearance: {surface: null, inset: null}},
      {_type: 'badgesSectionInline', _key: 'e'},
    ])
    expect(grounds).toEqual([
      {key: 'a', section: 'Content section', what: 'surface'},
      {key: 'b', section: 'Content section', what: 'inset'},
      {key: 'c', section: 'Areas of law', what: 'surface'},
    ])
    expect(ownGrounds(null)).toEqual([])
  })
})

describe('ownLooks', () => {
  it('names the bands whose own value wins over the style set, by the readers\' own rules', () => {
    const looks = ownLooks([
      {_type: 'attorneySectionInline', _key: 'a', cardStyle: 'portrait'},
      {_type: 'attorneySectionInline', _key: 'b', cardStyle: 'inherit'},
      {_type: 'practiceAreaNavInline', _key: 'c', hoverEffects: ['lift']},
      {_type: 'practiceAreaNavInline', _key: 'd', hoverEffects: []},
      {_type: 'contentSectionInline', _key: 'e', imageTreatment: 'framed'},
      {_type: 'contentSectionInline', _key: 'f', imageTreatment: 'inherit'},
    ])
    expect(looks.map((l) => l.key)).toEqual(['a', 'c', 'e'])
  })
})

describe('grantFlow (Phase 17B session 5, [R-523])', () => {
  it('reads an absent or retired theme as the site is, and leaves every other id to the address check', () => {
    expect(grantFlow(undefined)).toBe(AS_THE_SITE_IS)
    expect(grantFlow(null)).toBe(AS_THE_SITE_IS)
    expect(grantFlow('alternating.mostlyDark')).toBe(AS_THE_SITE_IS)
    expect(grantFlow('cutBlocks.mostlyDark')).toBe('cutBlocks.mostlyDark')
    // An id no pin ever shipped is not rescued: the address refuses it, as before.
    expect(grantFlow('nope')).toBe('nope')
    expect(parseChoices('site', 'site', grantFlow('nope'), 'design')).toBeNull()
  })
})

// Phase 17C session 2b (`[R-534]`): a retired style set is named where a site wears it, never
// offered by the address, and a client link that names one enters as the site is (ADV-17C-C).
describe('a retired style set', () => {
  it('renders from a typed address (a live site may wear one), and a grant naming one reads as the site is', () => {
    for (const t of RETIRED_STYLE_SETS) {
      expect(parseChoices(t.id, 'site', 'site', 'design')?.styleSet).toBe(t.id)
      expect(planPreview({}, {styleSet: t.id, palette: 'site', flow: 'site'}).set).toEqual(styleSetPatch(t, {}).set)
      expect(grantStyleSet(t.id)).toBe(AS_THE_SITE_IS)
    }
    expect(parseChoices('no-such-style-set', 'site', 'site', 'design')).toBeNull()
    for (const t of STYLE_SETS) {
      expect(parseChoices(t.id, 'site', 'site', 'design')?.styleSet).toBe(t.id)
      expect(grantStyleSet(t.id)).toBe(t.id)
    }
    expect(grantStyleSet(null)).toBe(AS_THE_SITE_IS)
    expect(grantStyleSet(undefined)).toBe(AS_THE_SITE_IS)
    expect(grantStyleSet('no-such-style-set')).toBe('no-such-style-set')
  })

  it('a site wearing one is named as wearing it, retired, and "as the site is" changes nothing', () => {
    const canyon = RETIRED_STYLE_SETS.find((t) => t.id === 'canyon')!
    const stored: StoredDesign = {_id: 'designSettings', _rev: 'rev-9', ...canyon.settings, ...canyon.picks} as StoredDesign
    const plan = planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site'})
    expect(plan.wears.styleSet).toMatchObject({styleSet: canyon, current: true, retired: '[R-534]'})
    expect(plan.set).toEqual({})
    expect(plan.unset).toEqual([])
  })
})

// Phase 18 session E (monorepo `[R-620]`): the palette built from the firm's own colors, `brand` in the address, its
// roles from the grant; Apply writes them as a preset's.
describe('the palette built from the firm’s own colors', () => {
  const brand = {darkGround: '#0c5c63', accent: '#e86a24', lightGround: '#f7f2e8', why: 'The firm’s own colors.'}

  it('is an address the preview reads', () => {
    expect(parseChoices('graphite', 'brand', 'site', 'design')).toEqual({styleSet: 'graphite', palette: 'brand', flow: 'site', background: 'site', layout: 'site', view: 'design'})
  })

  it('writes its roles as a preset would, and names itself', () => {
    const plan = planPreview({_id: 'designSettings', _rev: 'r1', darkGround: '#111111', accent: '#c5a253', action: '#123456'}, {styleSet: 'site', palette: 'brand', flow: 'site'}, null, brand)
    expect(plan.set).toMatchObject({darkGround: '#0c5c63', accent: '#e86a24', lightGround: '#f7f2e8'})
    expect(plan.unset).toContain('action')
    expect(plan.palette).toMatchObject({id: 'brand', name: 'Your colors'})
  })

  it('changes nothing without its roles', () => {
    const plan = planPreview({_id: 'designSettings', _rev: 'r1'}, {styleSet: 'site', palette: 'brand', flow: 'site'}, null, null)
    expect(plan.palette).toBeNull()
    expect(plan.set).toEqual({})
  })
})

// ─── The background row (the Background theme, monorepo WS-V1-BACKGROUND-THEME-DESIGN §4, §7) ─────────────────
describe('the background', () => {
  const HERO = 'image-hero-2400x1600-jpg'
  const SET = [{asset: {_ref: 'image-a-2400x1600-jpg'}, width: 2400, height: 1600}, {asset: {_ref: 'image-b-2400x1600-jpg'}, width: 2400, height: 1600}]
  const KEYS = ['image-a-2400x1600-jpg', 'image-b-2400x1600-jpg']
  const site: StoredDesign = {_id: 'designSettings', _rev: 'r', flow: 'cutBlocks.mostlyDark', themePhotos: SET}

  it('a chosen background sets the one field; the one stored is no change; the theme’s own clears it; as the site is contributes nothing', () => {
    expect(planPreview(plain, {styleSet: 'site', palette: 'site', flow: 'site', background: 'pattern.touch'})).toMatchObject({set: {background: 'pattern.touch'}, unset: []})
    const stored: StoredDesign = {...plain, background: 'pattern.touch'}
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site', background: 'pattern.touch'})).toMatchObject({set: {}, unset: []})
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site', background: OWN_BACKGROUND})).toMatchObject({set: {}, unset: ['background'], background: OWN_BACKGROUND, inForce: null})
    expect(planPreview(plain, {styleSet: 'site', palette: 'site', flow: 'site', background: OWN_BACKGROUND})).toMatchObject({set: {}, unset: []})
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site', background: AS_THE_SITE_IS})).toMatchObject({set: {}, unset: [], background: null, inForce: 'pattern.touch'})
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site'})).toMatchObject({set: {}, unset: [], inForce: 'pattern.touch'})
  })

  it('names what the site wears and the rules the page will render: the chosen or stored theme under the chosen or stored background', () => {
    const stored: StoredDesign = {...plain, flow: 'quiet.mostlyLight', background: 'glow'}
    const kept = planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'cutBlocks.balanced', background: 'site'})
    expect(kept.wears.background?.id).toBe('glow')
    expect(kept.shown).toMatchObject({id: 'cutBlocks.balanced', on: {dark: 'glow'}})
    const own = planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'cutBlocks.balanced', background: OWN_BACKGROUND})
    expect(own.shown.on.dark).toBe('pattern')
  })

  // The approvals follow the pair (ADV-BG-A): four cases.
  it('photographs chosen as the background alone are approved with the photograph shown', () => {
    const plan = planPreview(site, {styleSet: 'site', palette: 'site', flow: 'site', background: 'span'}, HERO)
    expect(plan.set).toEqual({background: 'span', flowPhoto: HERO, flowPhotos: KEYS})
  })

  it('a theme changed under a kept background of photographs keeps its approvals', () => {
    const approved: StoredDesign = {...site, background: 'fade', flowPhoto: HERO, flowPhotos: KEYS}
    const plan = planPreview(approved, {styleSet: 'site', palette: 'site', flow: 'typeOnBlack.allDark', background: 'site'}, HERO)
    expect(plan.set).toEqual({flow: 'typeOnBlack.allDark'})
    expect(plan.unset).toEqual([])
  })

  it('a theme and a background chosen together approve for the pair, and a plain background over Photo scrims clears them', () => {
    expect(planPreview(site, {styleSet: 'site', palette: 'site', flow: 'quiet.mostlyLight', background: 'windows'}, HERO).set).toEqual({flow: 'quiet.mostlyLight', background: 'windows', flowPhoto: HERO, flowPhotos: KEYS})
    const scrims: StoredDesign = {...site, flow: 'photoScrims.mostlyDark', flowPhoto: HERO, flowPhotos: KEYS}
    const plan = planPreview(scrims, {styleSet: 'site', palette: 'site', flow: 'site', background: 'plain'}, HERO)
    expect(plan.set).toEqual({background: 'plain'})
    expect(plan.unset).toEqual(['flowPhoto', 'flowPhotos'])
  })

  it('the theme’s own under Photo scrims approves its photographs again', () => {
    const stored: StoredDesign = {...site, flow: 'photoScrims.mostlyDark', background: 'plain'}
    const plan = planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site', background: OWN_BACKGROUND}, HERO)
    expect(plan.set).toEqual({flowPhoto: HERO, flowPhotos: KEYS})
    expect(plan.unset).toEqual(['background'])
  })

  it('the address is one run of segments: the last is the view, the rows fill from the left, a row it does not reach is as the site is', () => {
    expect(parseAddress(['graphite', 'navy-brass', 'design'])).toEqual({styleSet: 'graphite', palette: 'navy-brass', flow: 'site', background: 'site', layout: 'site', view: 'design'})
    expect(parseAddress(['site', 'site', 'quiet.mostlyLight', 'grey'])).toEqual({styleSet: 'site', palette: 'site', flow: 'quiet.mostlyLight', background: 'site', layout: 'site', view: 'grey'})
    expect(parseAddress(['site', 'site', 'quiet.mostlyLight', 'pattern.touch', 'design'])).toMatchObject({flow: 'quiet.mostlyLight', background: 'pattern.touch'})
    expect(parseAddress(['site', 'site', 'site', 'own', 'design'])).toMatchObject({background: 'own'})
    for (const bad of [[], ['site', 'design'], ['site', 'site', 'site', 'nope', 'design'], ['site', 'site', 'site', 'plain', 'extra', 'design'], ['site', 'site', 'site', 'plain'], ['site', 'site', 'site', 'plain', 'panels', 'extra', 'design']]) expect(parseAddress(bad), bad.join('/')).toBeNull()
    expect(parseAddress(null)).toBeNull()
  })

  it('the path carries the background only where one is chosen, so an address minted before the row is still its page’s', () => {
    expect(previewPath({styleSet: 'site', palette: 'site', flow: 'site', view: 'design'})).toBe('/site-preview/site/site/site/design')
    expect(previewPath({styleSet: 'site', palette: 'site', flow: 'site', background: 'site', view: 'design'})).toBe('/site-preview/site/site/site/design')
    const chosen = {styleSet: 'dune', palette: 'navy-brass', flow: 'softWash.balanced', background: 'fade', view: 'design'} as const
    expect(previewPath(chosen)).toBe('/site-preview/dune/navy-brass/softWash.balanced/fade/design')
    expect(parseAddress(previewPath(chosen).split('/').slice(2))).toEqual({...chosen, layout: 'site'})
  })

  it('a grant minted before the row reads as the site is', () => {
    expect(grantBackground(undefined)).toBe(AS_THE_SITE_IS)
    expect(grantBackground(null)).toBe(AS_THE_SITE_IS)
    expect(grantBackground('fade')).toBe('fade')
  })
})

describe('the details (monorepo `[R-641]`, `lib/details.ts`)', () => {
  const navy: StoredDesign = {darkGround: '#14213d', accent: '#c9a227', action: '#1f7a8c', headingInk: 'action', saturatedFrom: 'action', accentOnDark: 'raw', buttonOnDark: 'accent'}

  it('a palette that changes a role clears the palette details, never the element detail, and sets none', () => {
    const plan = planPreview(navy, {styleSet: 'site', palette: PALETTE_PRESETS[0].id, flow: 'site'})
    expect(plan.unset).toEqual(expect.arrayContaining(['headingInk', 'saturatedFrom', 'accentOnDark']))
    expect(plan.unset).not.toContain('buttonOnDark')
    for (const f of ['headingInk', 'saturatedFrom', 'accentOnDark', 'buttonOnDark']) expect(plan.set, f).not.toHaveProperty(f)
  })

  it('a style set, a theme or the site’s own palette keeps every detail', () => {
    for (const styleSet of ['graphite', 'site']) {
      const plan = planPreview(navy, {styleSet, palette: 'site', flow: 'site'})
      for (const f of ['headingInk', 'saturatedFrom', 'accentOnDark', 'buttonOnDark']) {
        expect(plan.unset, f).not.toContain(f)
        expect(plan.set, f).not.toHaveProperty(f)
      }
    }
  })
})

// ─── The layout row (the Layout theme, monorepo WS-V1-LAYOUT-OPTIONS-DESIGN §1.4, ADV-LO amendment 13) ─────────────────
describe('the layout', () => {
  const plain: StoredDesign = {_id: 'designSettings', _rev: 'r1'}

  it('is the fifth segment: a roster id, the theme\u2019s own or as the site is; an address minted before it opens the same page', () => {
    expect(parseAddress(['site', 'site', 'gradientBloom.mostlyDark', 'glow.corner', 'panels', 'design'])).toEqual(
      {styleSet: 'site', palette: 'site', flow: 'gradientBloom.mostlyDark', background: 'glow.corner', layout: 'panels', view: 'design'})
    expect(parseAddress(['site', 'site', 'site', 'site', 'own', 'grey'])).toMatchObject({background: 'site', layout: 'own'})
    expect(parseAddress(['site', 'site', 'site', 'plain', 'design'])).toMatchObject({layout: 'site'})
    for (const bad of [['site', 'site', 'site', 'site', 'floating', 'design'], ['site', 'site', 'site', 'site', 'edgeToEdge', 'design'], ['site', 'site', 'site', 'site', 'contained', 'x', 'design']]) {
      expect(parseAddress(bad), bad.join('/')).toBeNull()
    }
  })

  it('the path writes the background\u2019s slot out where only a layout is chosen, and round-trips', () => {
    const onlyLayout = {styleSet: 'site', palette: 'navy-brass', flow: 'site', background: 'site', layout: 'panels', view: 'design'} as const
    expect(previewPath(onlyLayout)).toBe('/site-preview/site/navy-brass/site/site/panels/design')
    expect(parseAddress(previewPath(onlyLayout).split('/').slice(2))).toEqual(onlyLayout)
    const both = {styleSet: 'graphite', palette: 'site', flow: 'typeOnBlack.allDark', background: 'fade', layout: 'contained', view: 'grey'} as const
    expect(previewPath(both)).toBe('/site-preview/graphite/site/typeOnBlack.allDark/fade/contained/grey')
    expect(parseAddress(previewPath(both).split('/').slice(2))).toEqual(both)
    // No layout chosen: the address of the page before the row, unchanged.
    expect(previewPath({styleSet: 'site', palette: 'site', flow: 'site', background: 'site', layout: 'site', view: 'design'})).toBe('/site-preview/site/site/site/design')
    expect(previewPath({styleSet: 'site', palette: 'site', flow: 'site', background: 'fade', layout: 'site', view: 'design'})).toBe('/site-preview/site/site/site/fade/design')
  })

  it('a chosen layout sets the one field; the one stored is no change; the theme\u2019s own clears it; as the site is contributes nothing', () => {
    expect(planPreview(plain, {styleSet: 'site', palette: 'site', flow: 'site', layout: 'panels'})).toMatchObject({set: {pageLayout: 'panels'}, unset: [], layoutInForce: 'panels'})
    const stored: StoredDesign = {...plain, pageLayout: 'panels'}
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site', layout: 'panels'})).toMatchObject({set: {}, unset: []})
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site', layout: OWN_LAYOUT})).toMatchObject({set: {}, unset: ['pageLayout'], layout: OWN_LAYOUT, layoutInForce: null})
    expect(planPreview(plain, {styleSet: 'site', palette: 'site', flow: 'site', layout: OWN_LAYOUT})).toMatchObject({set: {}, unset: []})
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site', layout: AS_THE_SITE_IS})).toMatchObject({set: {}, unset: [], layout: null, layoutInForce: 'panels'})
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site'}).wears.layout?.id).toBe('panels')
  })

  it('the page renders the chosen or stored theme under the chosen or stored background and layout, and the layout approves nothing', () => {
    const stored: StoredDesign = {...plain, flow: 'quiet.mostlyLight', background: 'glow', pageLayout: 'contained'}
    const plan = planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'gradientBloom.mostlyDark', background: 'glow.corner', layout: 'panels'})
    expect(plan.shown.id).toBe('gradientBloom.mostlyDark')
    expect(plan.shown.on.glowShape).toBe('corner')
    expect(plan.shown.layout?.id).toBe('panels')
    expect(Object.keys(plan.set).sort()).toEqual(['background', 'flow', 'pageLayout'])
    expect(planPreview(stored, {styleSet: 'site', palette: 'site', flow: 'site'}).shown.layout?.id).toBe('contained')
    // withPreview carries it to the page the layout and the shell read.
    expect((withPreview({designTokens: {pageLayout: 'contained'}}, plan) as {designTokens: Record<string, unknown>}).designTokens.pageLayout).toBe('panels')
  })

  it('a grant minted before the row reads as the site is', () => {
    expect(grantLayout(undefined)).toBe(AS_THE_SITE_IS)
    expect(grantLayout(null)).toBe(AS_THE_SITE_IS)
    expect(grantLayout('panels')).toBe('panels')
  })
})
