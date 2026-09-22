import {describe, it, expect} from 'vitest'
import {THEMES, matchTheme, themePatch} from '@/lib/themes'
import {PALETTE_PRESETS, matchPreset} from '@/lib/palettes'
import {parseChoices, planPreview, withPreview, ownLooks, previewPath, type PreviewPlan, type StoredDesign} from '../plan'

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
const marble = THEMES.find((t) => t.id === 'marble')!
const wearsGraphite: StoredDesign = {...applied(plain, planPreview(plain, {styleSet: 'graphite', palette: 'site'}))}
const swapped: StoredDesign = {...wearsGraphite, sectionJoin: 'arc'}

describe('planPreview', () => {
  it('on a plain site, a style set is exactly its own patch', () => {
    for (const theme of THEMES) {
      const plan = planPreview({}, {styleSet: theme.id, palette: 'site'})
      expect(plan.set).toEqual(themePatch(theme, {}).set)
      expect(plan.unset).toEqual([])
    }
  })

  it('every style set by every palette, applied, is what the Studio names it, on a plain site and an uploaded-font one', () => {
    for (const doc of [plain, uploads, swapped]) {
      for (const theme of THEMES) {
        for (const palette of PALETTE_PRESETS) {
          const after = applied(doc, planPreview(doc, {styleSet: theme.id, palette: palette.id}))
          expect(matchTheme(after)?.theme.id).toBe(theme.id)
          expect(matchTheme(after)?.current).toBe(true)
          expect(matchPreset(after)?.id).toBe(palette.id)
        }
      }
    }
  })

  it('never changes the pairing or the heading weight of a site that renders its own uploaded fonts', () => {
    for (const theme of THEMES) {
      const plan = planPreview(uploads, {styleSet: theme.id, palette: 'site'})
      expect(Object.keys(plan.set)).not.toContain('fontPairingPreset')
      expect(Object.keys(plan.set)).not.toContain('headingWeight')
      expect(plan.unset).not.toContain('fontPairingPreset')
    }
  })

  it('writes only what changes: the style set a site already wears is no change, and a swapped pick survives', () => {
    expect(planPreview(wearsGraphite, {styleSet: 'graphite', palette: 'site'})).toMatchObject({set: {}, unset: []})
    expect(planPreview(swapped, {styleSet: 'graphite', palette: 'site'})).toMatchObject({set: {}, unset: []})
    // Another style set replaces the pick with its own.
    expect(planPreview(swapped, {styleSet: 'marble', palette: 'site'}).set.sectionJoin).toBe(marble.picks.sectionJoin)
  })

  it('touches only style-set, pick and color fields', () => {
    const allowed = new Set([
      ...Object.keys(graphite.settings), 'sectionJoin', 'dividerCarry', 'headingRule',
      'darkGround', 'lightGround', 'accent', 'action',
    ])
    for (const theme of THEMES) {
      for (const palette of PALETTE_PRESETS) {
        const plan = planPreview({...plain, logoOnLight: {x: 1}, lightGround: '#ffffff', action: '#123456'}, {styleSet: theme.id, palette: palette.id})
        for (const f of [...Object.keys(plan.set), ...plan.unset]) expect(allowed.has(f)).toBe(true)
      }
    }
  })

  it('a palette writes its four roles and clears an absent one, case-blind', () => {
    const navy = PALETTE_PRESETS.find((p) => p.id === 'navy-brass')!
    const plan = planPreview({...plain, action: '#123456'}, {styleSet: 'site', palette: 'navy-brass'})
    expect(plan.set).toEqual({darkGround: navy.darkGround, lightGround: navy.lightGround, accent: navy.accent})
    expect(plan.unset).toEqual(['action'])
    const already = {...plain, darkGround: navy.darkGround.toUpperCase(), lightGround: navy.lightGround, accent: navy.accent}
    expect(planPreview(already, {styleSet: 'site', palette: 'navy-brass'})).toMatchObject({set: {}, unset: []})
  })

  it('"as the site is" and an unknown id change nothing', () => {
    for (const choice of [{styleSet: 'site', palette: 'site'}, {styleSet: 'nope', palette: 'nope'}]) {
      expect(planPreview(plain, choice)).toMatchObject({set: {}, unset: [], styleSet: null, palette: null})
    }
  })

  it('carries the revision it was computed on, and names what the site wears now', () => {
    const plan = planPreview(wearsGraphite, {styleSet: 'marble', palette: 'site'})
    expect(plan.rev).toBe('rev-1')
    expect(plan.wears.styleSet?.theme.id).toBe('graphite')
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
    expect(parseChoices('graphite', 'navy-brass', 'grey')).toEqual({styleSet: 'graphite', palette: 'navy-brass', view: 'grey'})
    expect(parseChoices('site', 'site', 'design')).not.toBeNull()
    expect(parseChoices('nope', 'site', 'design')).toBeNull()
    expect(parseChoices('site', 'nope', 'design')).toBeNull()
    expect(parseChoices('site', 'site', 'print')).toBeNull()
    expect(previewPath({styleSet: 'graphite', palette: 'site', view: 'design'})).toBe('/site-preview/graphite/site/design')
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
