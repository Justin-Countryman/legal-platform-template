import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {getPresetById} from '../../fonts/presets'
import {matchCornerFamily} from '../corners'
import {PALETTE_PRESETS} from '../palettes'
import {HEADING_LINES} from '../headingLines'
import {
  PICK_DEFAULTS, SIGNATURE_HIGH, STYLE_SETS, STYLE_SET_DEFAULTS, STYLE_SET_FIELDS, STYLE_SET_PICKS, drawableWeight, isPlatformDefault,
  matchStyleSet, readPick, readStyleSetField, signatureDifferences, signatureOf, swappedPicks, styleSetPatch, updatePatch,
  usesCustomFonts,
  type StyleSet, type StyleSetDoc, type StyleSetSettings,
} from '../styleSets'

// Style sets are presets (Phase 16B, [R-469], [R-477], [R-478]): they write settings,
// and the Studio names the one whose values the stored settings equal. These tests
// hold the nine to the schema the Studio actually offers (the generated field map,
// an artifact, not the source), to the corner families, to the fonts, and to the
// matching and the patch the Studio picker runs.
//
// Phase 17B ([R-510], [R-513]): a style set is the atoms and molecules; the six page-level
// fields (the divider and its carry, the texture's ground, the ghost, the overlap,
// the gradient) are the flow layer's (`lib/flows.ts`) and are hidden in the schema
// for one pin: a style set neither writes nor is matched by them, and the tests
// below hold that too.

const fieldMap = JSON.parse(readFileSync(resolve(__dirname, '../../../studio/field-map.json'), 'utf8'))
const designRows: Array<{path: string; options?: {list?: Array<string | number>}; initialValue?: unknown; hidden?: boolean | string}> = fieldMap.types.designSettings.fields
const optionsOf = (field: string) => designRows.find((r) => r.path === field)?.options?.list

// A stored document equal to a style set's settings, the way the picker writes it.
const stored = (s: StyleSetSettings): StyleSetDoc => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== null))

describe('the style sets', () => {
  it('ships ten, Granite among them ([R-478], [R-504])', () => {
    expect(STYLE_SETS.map((t) => t.id)).toEqual(['canyon', 'graphite', 'walnut', 'dune', 'flint', 'marble', 'linen', 'valley', 'granite', 'quartz'])
  })

  it.each(STYLE_SETS.map((t) => [t.name, t] as [string, StyleSet]))('%s names every field, its picks and an identity', (_, styleSet) => {
    expect(Object.keys(styleSet.settings).sort()).toEqual([...STYLE_SET_FIELDS].sort())
    expect(Object.keys(styleSet.picks).sort()).toEqual([...STYLE_SET_PICKS].sort())
    expect(styleSet.feel.length).toBeGreaterThan(10)
    expect(styleSet.identity.sentence.length).toBeGreaterThan(20)
    expect(styleSet.identity.recognizers.length).toBeGreaterThanOrEqual(2)
    expect(styleSet.identity.recognizers.length).toBeLessThanOrEqual(3)
  })

  // Phase 16C ([R-484], [R-485]): the heading line is a pick, so it is held to its
  // library, not to the matched settings. The divider was a pick too until Phase 17B
  // made it the theme's ([R-513]).
  it.each(STYLE_SETS.map((t) => [t.name, t] as [string, StyleSet]))('%s picks from the library, and the Studio offers the pick', (_, styleSet) => {
    const {headingRule} = styleSet.picks
    if (headingRule) {
      expect(HEADING_LINES).toContain(headingRule)
      expect(optionsOf('headingRule')).toContain(headingRule)
    }
  })

  // Phase 17B ([R-510]): 17 matched fields and one pick; the six page-level fields are
  // the flow layer's, hidden in the schema, and no style set names or writes them.
  it('has 17 matched fields and one pick, and names none of the six the theme layer took', () => {
    expect(STYLE_SET_FIELDS).toHaveLength(17)
    expect(STYLE_SET_PICKS).toEqual(['headingRule'])
    const moved = ['sectionJoin', 'dividerCarry', 'patternGround', 'brandGhost', 'sectionOverlap', 'sectionGradient']
    for (const field of moved) {
      expect(STYLE_SET_FIELDS).not.toContain(field)
      expect(STYLE_SET_PICKS).not.toContain(field)
      expect(designRows.find((r) => r.path === field)?.hidden, `${field} is hidden at this pin`).toBe(true)
      for (const styleSet of STYLE_SETS) {
        expect(styleSet.settings, `${styleSet.id}.settings`).not.toHaveProperty(field)
        expect(styleSet.picks, `${styleSet.id}.picks`).not.toHaveProperty(field)
        const {set, unset} = styleSetPatch(styleSet)
        expect(set, `${styleSet.id} writes ${field}`).not.toHaveProperty(field)
        expect(unset, `${styleSet.id} clears ${field}`).not.toContain(field)
      }
    }
    // The whole patch is 18 keys (17 matched fields and the one pick), 16 on a site with
    // its own uploaded fonts.
    for (const styleSet of STYLE_SETS) {
      const {set, unset} = styleSetPatch(styleSet)
      expect(Object.keys(set).length + unset.length, styleSet.id).toBe(18)
    }
  })

  // A `previous` entry that equals the current settings would name a version that is
  // not one: four became duplicates when the six left (ADV-17B-C F1) and were pruned.
  it('no earlier version of a style set equals its current settings', () => {
    for (const styleSet of STYLE_SETS) {
      for (const [i, version] of styleSet.previous.entries()) {
        const asCurrent = {...STYLE_SET_DEFAULTS, ...version.settings}
        expect(STYLE_SET_FIELDS.every((f) => asCurrent[f] === styleSet.settings[f]), `${styleSet.id} previous ${i + 1} equals current`).toBe(false)
      }
    }
  })

  it.each(STYLE_SETS.map((t) => [t.name, t] as [string, StyleSet]))('%s writes only values the Studio offers', (_, styleSet) => {
    for (const field of STYLE_SET_FIELDS) {
      const value = styleSet.settings[field]
      if (value === null) continue
      const list = optionsOf(field)
      expect(list, `${field} has an option list in the schema`).toBeDefined()
      expect(list, `${styleSet.id}.${field} = ${String(value)}`).toContain(value)
    }
  })

  it('every style set field is a Design Settings field with no seed except the eight the build has always written', () => {
    const seeded = STYLE_SET_FIELDS.filter((f) => designRows.find((r) => r.path === f)?.initialValue !== undefined)
    expect(seeded.sort()).toEqual(['buttonAnimation', 'buttonShape', 'elevationStyle', 'marketingScale', 'motionTempo', 'taglineStyle', 'tertiaryStyle', 'uiRadius'])
    for (const f of STYLE_SET_FIELDS) expect(designRows.some((r) => r.path === f), f).toBe(true)
  })

  it.each(STYLE_SETS.map((t) => [t.name, t] as [string, StyleSet]))('%s keeps cards and buttons in one corner family ([R-473])', (_, styleSet) => {
    expect(matchCornerFamily(styleSet.settings.uiRadius as string, styleSet.settings.buttonShape as string)).not.toBeNull()
  })

  it.each(STYLE_SETS.map((t) => [t.name, t] as [string, StyleSet]))('%s names a real pairing, and italic words only where the heading has an italic face', (_, styleSet) => {
    const fonts = getPresetById(Number(styleSet.settings.fontPairingPreset))
    expect(fonts).toBeDefined()
    if (styleSet.settings.headingEmphasisStyle === 'italic') expect(fonts!.heading.italic, styleSet.id).toBe(true)
  })

  it('suggests only palettes that exist, and never writes a color', () => {
    const ids = new Set(PALETTE_PRESETS.map((p) => p.id))
    for (const styleSet of STYLE_SETS) {
      for (const id of styleSet.suggestedPalettes) expect(ids.has(id), `${styleSet.id} suggests ${id}`).toBe(true)
      expect(Object.keys(styleSet.settings).some((k) => /color|ground$|accent|action/i.test(k))).toBe(false)
    }
  })

  // ─── Uniqueness is a test ([R-487], Phase 16C amendment 1) ──────────────────
  //
  // Measured on the MATCHED settings only, because a style set's name survives any pick
  // being swapped ([R-485]), and on what a visitor can tell apart: the heading's voice
  // (its face's class with the weight that face can draw), the case, the corner family
  // (Soft and Round are one at a glance) and the surface device, plus seven lower
  // dimensions. Two high and five in all is the closest pair that ships, so a tenth
  // style set that crowds a ninth fails here rather than shipping.
  it('every pair of style sets differs in at least two of the four a visitor names first, and five in all', () => {
    for (const a of STYLE_SETS) {
      for (const b of STYLE_SETS) {
        if (a.id >= b.id) continue
        const {high, all} = signatureDifferences(a, b)
        expect(high.length, `${a.id} and ${b.id} (high: ${high.join(', ') || 'none'})`).toBeGreaterThanOrEqual(2)
        expect(all.length, `${a.id} and ${b.id} (${all.join(', ')})`).toBeGreaterThanOrEqual(5)
      }
    }
  })

  it('each style set’s recognisers belong to no other style set, and are things a visitor sees', () => {
    for (const styleSet of STYLE_SETS) {
      const others = STYLE_SETS.filter((t) => t !== styleSet)
      const sig = signatureOf(styleSet)
      const clash = others.find((other) => styleSet.identity.recognizers.every((d) => signatureOf(other)[d] === sig[d]))
      expect(clash?.id, `${styleSet.id} shares its recognisers with ${clash?.id}`).toBeUndefined()
      // At least one of them is a dimension a visitor names first.
      expect(styleSet.identity.recognizers.some((d) => (SIGNATURE_HIGH as readonly string[]).includes(d)), styleSet.id).toBe(true)
    }
  })

  // [R-487], amendment 24: a style set may only name a weight its heading face can draw.
  it('names a weight its pairing can actually draw, and leaves the rest to the face', () => {
    for (const styleSet of STYLE_SETS) {
      const wanted = String(styleSet.settings.headingWeight)
      const drawn = drawableWeight(styleSet.settings.fontPairingPreset as number, wanted)
      // A style set that NAMES a weight must have a face that draws it. A style set that leaves
      // the default takes whatever its face has: pairings 2 and 13 have no bold, and with
      // font synthesis off they render their real regular (ADV-P16C-A measured the fake).
      if (wanted !== STYLE_SET_DEFAULTS.headingWeight) expect(drawn, styleSet.id).toBe(wanted)
      expect(['bold', 'regular']).toContain(drawn)
    }
  })

  // Phase 17C (ADV-17C2A-2): the page matches faces by family name, so a mono pairing's heading
  // draws its body's regular. The matcher reads that too, or a site set to regular on 14, 17
  // or 18 would be called bold while the page draws regular.
  it("reads a mono pairing's regular as regular, and a bold-only heading of its own family as bold", () => {
    for (const pairing of [14, 17, 18]) expect(drawableWeight(pairing, 'regular'), `pairing ${pairing}`).toBe('regular')
    expect(drawableWeight(11, 'regular')).toBe('bold')
    expect(drawableWeight(2, 'bold')).toBe('regular')
  })
})

describe('matching by value ([R-477])', () => {
  it('names each style set from its own stored settings', () => {
    for (const styleSet of STYLE_SETS) expect(matchStyleSet(stored(styleSet.settings))).toMatchObject({styleSet, current: true})
  })

  it('reads an absent field as its default, so a style set that leaves a field unset still matches', () => {
    const graphite = STYLE_SETS.find((t) => t.id === 'graphite')!
    const doc = {...stored(graphite.settings), cardHover: graphite.settings.cardHover}
    expect(matchStyleSet(doc)?.styleSet.id).toBe('graphite')
    const canyon = STYLE_SETS.find((t) => t.id === 'canyon')!
    expect(canyon.settings.patternTexture).toBeNull()
    expect(matchStyleSet({...stored(canyon.settings), patternTexture: ''})?.styleSet.id).toBe('canyon')
  })

  it('reads what the site reads: an unknown value is the default', () => {
    expect(readStyleSetField({elevationStyle: '9'}, 'elevationStyle')).toBe('0')
    expect(readStyleSetField({fontPairingPreset: 3}, 'fontPairingPreset')).toBeNull()
  })

  // Phase 17B: a document that still stores the six (every client built before the pin
  // does) matches its style set exactly as before; the match never reads them.
  it('ignores the six hidden fields a stored document still carries', () => {
    const graphite = STYLE_SETS.find((t) => t.id === 'graphite')!
    const legacy: StyleSetDoc = {...stored(graphite.settings), ...graphite.picks, ...({sectionJoin: 'angled', dividerCarry: ['cards'], patternGround: 'dark',
      brandGhost: 'on', sectionOverlap: 'photo', sectionGradient: 'deep'} as Record<string, unknown>)}
    expect(matchStyleSet(legacy)).toMatchObject({styleSet: graphite, current: true})
    expect(swappedPicks(legacy, matchStyleSet(legacy)!)).toEqual([])
    expect(isPlatformDefault({fontPairingPreset: 1, ...({sectionJoin: 'peak', sectionGradient: 'deep'} as Record<string, unknown>)})).toBe(true)
  })

  it('says Custom after one change, and names nothing it is not', () => {
    const walnut = STYLE_SETS.find((t) => t.id === 'walnut')!
    expect(matchStyleSet({...stored(walnut.settings), motionTempo: 'snappy'})).toBeNull()
    expect(matchStyleSet({})).toBeNull()
  })

  it('knows what the build writes as the platform default, and that it is no style set', () => {
    const build = {fontPairingPreset: 1, marketingScale: 'default', taglineStyle: 'plain', uiRadius: 'rounded', buttonShape: 'rounded',
      buttonAnimation: 'none', tertiaryStyle: 'plain', elevationStyle: '0', motionTempo: 'relaxed'}
    expect(isPlatformDefault(build)).toBe(true)
    expect(isPlatformDefault({})).toBe(true)
    expect(matchStyleSet(build)).toBeNull()
    expect(isPlatformDefault({...build, headingCase: 'upper'})).toBe(false)
    // A pick is not a matched setting, so it does not make a site "Custom" ([R-485]).
    expect(isPlatformDefault({...build, headingRule: 'leadDot'})).toBe(true)
  })

  it('names an earlier version of a style set, so a retune never reads as an edit', () => {
    const walnut = STYLE_SETS.find((t) => t.id === 'walnut')!
    const retuned: StyleSet = {
      ...walnut,
      settings: {...walnut.settings, motionTempo: 'balanced'},
      previous: [{settings: walnut.settings, picks: walnut.picks}],
    }
    const original = [...STYLE_SETS]
    ;(STYLE_SETS as StyleSet[]).splice(STYLE_SETS.indexOf(walnut), 1, retuned)
    try {
      expect(matchStyleSet(stored(walnut.settings))).toMatchObject({styleSet: retuned, current: false})
    } finally {
      ;(STYLE_SETS as StyleSet[]).splice(0, STYLE_SETS.length, ...original)
    }
  })
})

describe('the patch the Studio picker runs', () => {
  it('sets every value a style set names and unsets every field it leaves to the default, in one patch', () => {
    for (const styleSet of STYLE_SETS) {
      const {set, unset} = styleSetPatch(styleSet)
      // The patch covers the matched settings AND the picks: picking a style set sets its
      // defaults ([R-485]), and Python replays these same cases (presets.json).
      expect([...Object.keys(set), ...unset].sort()).toEqual([...STYLE_SET_FIELDS, ...STYLE_SET_PICKS].sort())
      for (const f of unset) {
        if ((STYLE_SET_FIELDS as readonly string[]).includes(f)) expect(styleSet.settings[f as keyof StyleSetSettings]).toBeNull()
        else expect(styleSet.picks[f as keyof typeof styleSet.picks]).toBeNull()
      }
    }
  })

  it('a swapped heading line keeps the style set’s name, and the Studio says it was swapped ([R-485])', () => {
    const graphite = STYLE_SETS.find((t) => t.id === 'graphite')!
    const swappedDoc = {...stored(graphite.settings), ...graphite.picks, headingRule: 'hatched'}
    const match = matchStyleSet(swappedDoc)
    expect(match).toMatchObject({styleSet: graphite, current: true})
    expect(swappedPicks(swappedDoc, match!)).toEqual([{field: 'headingRule', site: 'hatched', styleSet: 'line'}])
    // And a site wearing exactly the style set's pick has nothing to report.
    expect(swappedPicks({...stored(graphite.settings), ...graphite.picks}, match!)).toEqual([])
  })

  it('applying a style set’s update keeps a pick the site swapped on purpose', () => {
    const linen = STYLE_SETS.find((t) => t.id === 'linen')!
    const old = linen.previous[0]
    const site = {...old.settings, ...old.picks, headingRule: 'hatched'} as StyleSetDoc
    const match = matchStyleSet(site)!
    expect(match).toMatchObject({styleSet: linen, current: false})
    const {set, unset} = updatePatch(site, match)
    expect({...set, ...Object.fromEntries(unset.map((k) => [k, null]))}).toMatchObject({headingWeight: 'regular'})
    expect('headingRule' in set).toBe(false)
    expect(unset).not.toContain('headingRule')
  })

  it('reads a stored pick the way the site does: unknown and none are no pick', () => {
    expect(readPick({headingRule: 'hatched'}, 'headingRule')).toBe('hatched')
    expect(readPick({headingRule: 'none'}, 'headingRule')).toBeNull()
    expect(readPick({headingRule: 'squiggle'}, 'headingRule')).toBeNull()
    expect(readPick({}, 'headingRule')).toBeNull()
  })

  it('applied over any document, it leaves one the style set matches', () => {
    const before: StyleSetDoc = {uiRadius: 'soft', buttonShape: 'stadium', elevationStyle: '2', fontPairingPreset: 2, patternTexture: 'scallop'}
    for (const styleSet of STYLE_SETS) {
      const {set, unset} = styleSetPatch(styleSet, before)
      const after: StyleSetDoc = {...before, ...set}
      for (const f of unset) delete (after as Record<string, unknown>)[f]
      expect(matchStyleSet(after)?.styleSet.id).toBe(styleSet.id)
    }
  })

  it('leaves the pairing alone only on a site whose own uploaded fonts are what renders', () => {
    const uploads = {customFonts: {headingFont: {regular: {asset: {_ref: 'file-x'}}}}}
    expect(usesCustomFonts(uploads)).toBe(true)
    expect(usesCustomFonts({...uploads, fontPairingPreset: 1})).toBe(false)
    const styleSet = STYLE_SETS[0]
    expect(Object.keys(styleSetPatch(styleSet, uploads).set)).not.toContain('fontPairingPreset')
    expect(styleSetPatch(styleSet, uploads).unset).not.toContain('fontPairingPreset')
    expect(styleSetPatch(styleSet, {...uploads, fontPairingPreset: 1}).set.fontPairingPreset).toBe(styleSet.settings.fontPairingPreset)
    const {set, unset} = styleSetPatch(styleSet, uploads)
    const after: StyleSetDoc = {...uploads, ...set}
    for (const f of unset) delete (after as Record<string, unknown>)[f]
    expect(matchStyleSet(after)?.styleSet.id).toBe(styleSet.id)
  })

  it('the defaults are what each reader falls back to', () => {
    expect(STYLE_SET_DEFAULTS.uiRadius).toBe('rounded')
    expect(STYLE_SET_DEFAULTS.buttonShape).toBe('rounded')
    expect(STYLE_SET_DEFAULTS.elevationStyle).toBe('0')
    expect(STYLE_SET_DEFAULTS.motionTempo).toBe('relaxed')
    expect(STYLE_SET_DEFAULTS.attorneyCardStyle).toBe('classic')
    expect(PICK_DEFAULTS).toEqual({headingRule: null})
  })
})

// ─── Every style set at the last pin still reads as itself ───────────────────────
//
// Phase 16C designed this and built only the monorepo half: the template carried no
// frozen copy and no reference to a pin (ADV-16D-C measured it; §16.5 amendment 27).
// It cannot be `git show <sha>:studio/presets.json` in CI, because template CI clones
// one commit deep. So the pin's presets are a committed fixture, and this is what
// stops a style set change stranding every site that already wears it as "Custom".
describe('a site built at an earlier pin still matches its style set', () => {
  // A frozen file is the record of what its pin shipped, and keeps that pin's key for the roster:
  // `themes` before Phase 17C, `styleSets` after (`[R-535]`). One accessor reads both, so nothing
  // else in this suite names the old key.
  type FrozenStyleSet = {id: string; settings: Record<string, unknown>}
  const frozen = (pin: string): FrozenStyleSet[] => {
    const file = JSON.parse(readFileSync(resolve(__dirname, `fixtures/presets-${pin}.json`), 'utf8')) as Record<string, FrozenStyleSet[] | undefined>
    // eslint-disable-next-line no-restricted-syntax -- a frozen pin's own key, from before the rename
    return file.styleSets ?? file['themes'] ?? []
  }
  // One file per pin at which a matched value moved. `bd74cdd` is Phase 16C's;
  // `22da44f` is Phase 16D's revision, frozen by 16E because it put the raised photo on
  // three style sets ([R-500]); `3979e37` is 16E's, frozen by 16F because it is the first
  // pin before the roster grew — a TENTH style set is the first thing in this workstream
  // that could take another style set's name at a pin, and this is what proves none does.
  // `a164ce0` is 17A's, frozen by 17B before four matched fields and two picks left
  // the style sets ([R-510]): a frozen file carries the six, and the match ignores them.
  const PINS = ['bd74cdd', '22da44f', '3979e37', 'a164ce0'] as const

  it.each(PINS)('reads every style set at %s as that style set, current or earlier', (pin) => {
    const pinned = frozen(pin)
    // A pin holds the roster AS IT WAS, which is not today's length once a style set is
    // added. What must hold is that every style set frozen there still reads as itself.
    expect(pinned.length).toBeLessThanOrEqual(STYLE_SETS.length)
    expect(new Set(pinned.map((t) => t.id)).size).toBe(pinned.length)
    for (const old of pinned) {
      const match = matchStyleSet(old.settings as StyleSetDoc)
      expect(match?.styleSet.id, `a site wearing ${old.id} at ${pin}`).toBe(old.id)
    }
  })

  // Which style sets have been retuned SINCE each pin, which is not the same set at each:
  // Walnut and Marble took the drop cap in Phase 16D, so they are earlier versions as
  // of `bd74cdd` and current as of `22da44f`. Canyon, Graphite and Marble took the
  // raised photo in 16E and Canyon the gradient in 16F, but those fields left the
  // matched set in Phase 17B ([R-510]), so a site frozen before them reads as CURRENT
  // again: the retune was in a field a style set no longer owns. Measured on the four
  // frozen files when the six left (four `previous` entries became duplicates and were
  // pruned). Granite is new at `a164ce0` and cannot be retuned.
  const RETUNED_SINCE: Record<(typeof PINS)[number], Set<string>> = {
    bd74cdd: new Set(['walnut', 'marble']),
    '22da44f': new Set<string>(),
    '3979e37': new Set<string>(),
    a164ce0: new Set<string>(),
  }

  it.each(PINS)('names the style sets retuned since %s as earlier versions, and the rest as current', (pin) => {
    const retuned = RETUNED_SINCE[pin]
    for (const old of frozen(pin)) {
      const match = matchStyleSet(old.settings as StyleSetDoc)
      expect(match?.current, `${old.id} at ${pin}`).toBe(!retuned.has(old.id))
    }
  })
})
