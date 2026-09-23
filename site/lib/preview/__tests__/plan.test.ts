import {describe, it, expect} from 'vitest'
import {THEMES, matchTheme, themePatch} from '@/lib/themes'
import {PALETTE_PRESETS, matchPreset} from '@/lib/palettes'
import {DEFAULT_FLOW, FLOWS, HIDDEN_FIELDS} from '@/lib/flows'
import {parseChoices, planPreview, withPreview, ownLooks, ownGrounds, previewPath, type PreviewPlan, type StoredDesign} from '../plan'

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
const graphite = THEMES.find((t) => t.id === 'graphite')!
const wearsGraphite: StoredDesign = {...applied(plain, planPreview(plain, {styleSet: 'graphite', palette: 'site', flow: 'site'}))}
const swapped: StoredDesign = {...wearsGraphite, headingRule: 'hatched'}

describe('planPreview', () => {
  it('on a plain site, a style set is exactly its own patch', () => {
    for (const theme of THEMES) {
      const plan = planPreview({}, {styleSet: theme.id, palette: 'site', flow: 'site'})
      expect(plan.set).toEqual(themePatch(theme, {}).set)
      expect(plan.unset).toEqual([])
    }
  })

  it('every style set by every palette, applied, is what the Studio names it, on a plain site and an uploaded-font one', () => {
    for (const doc of [plain, uploads, swapped]) {
      for (const theme of THEMES) {
        for (const palette of PALETTE_PRESETS) {
          const after = applied(doc, planPreview(doc, {styleSet: theme.id, palette: palette.id, flow: 'site'}))
          expect(matchTheme(after)?.theme.id).toBe(theme.id)
          expect(matchTheme(after)?.current).toBe(true)
          expect(matchPreset(after)?.id).toBe(palette.id)
        }
      }
    }
  })

  it('never changes the pairing or the heading weight of a site that renders its own uploaded fonts', () => {
    for (const theme of THEMES) {
      const plan = planPreview(uploads, {styleSet: theme.id, palette: 'site', flow: 'site'})
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
      'darkGround', 'lightGround', 'accent', 'action', 'flow',
    ])
    const clearable = new Set([...allowed, ...HIDDEN_FIELDS])
    for (const theme of THEMES) {
      for (const palette of PALETTE_PRESETS) {
        for (const flow of [...FLOWS.map((f) => f.id), 'site']) {
          const plan = planPreview({...plain, logoOnLight: {x: 1}, lightGround: '#ffffff', action: '#123456', sectionJoin: 'angled'}, {styleSet: theme.id, palette: palette.id, flow})
          for (const f of Object.keys(plan.set)) expect(allowed.has(f), f).toBe(true)
          for (const f of plan.unset) expect(clearable.has(f), f).toBe(true)
        }
      }
    }
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
    expect(plan.wears.styleSet?.theme.id).toBe('graphite')
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
    expect(parseChoices('graphite', 'navy-brass', 'site', 'grey')).toEqual({styleSet: 'graphite', palette: 'navy-brass', flow: 'site', view: 'grey'})
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
