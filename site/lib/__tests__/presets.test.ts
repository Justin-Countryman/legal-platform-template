import {describe, expect, it} from 'vitest'
import {FONT_PRESETS, headingWeights} from '../../fonts/presets'
import {CORNER_FAMILIES} from '../corners'
import {PALETTE_PRESETS} from '../palettes'
import {
  PICK_DEFAULTS, STYLE_SETS, STYLE_SET_DEFAULTS, STYLE_SET_FIELDS, STYLE_SET_PICKS, isPlatformDefault, matchStyleSet, styleSetPatch,
  type StyleSetDoc,
} from '../styleSets'
import {PREVIEW_TOKEN_VECTOR, signToken} from '../preview/session'
import {DARKNESS, DEFAULT_FLOW, FAMILIES, FLOWS, HIDDEN_FIELDS, HOSTS} from '../flows'

// studio/presets.json (Phase 16B amendment 4, widened in 16C): the style sets with their
// picks, the corner families, the palettes and the font pairings as data, for the readers
// that cannot import TypeScript. The monorepo's Python reads it through the Studio
// snapshot archive (`BE/_shared/presets.py`): the fixture's style set is confirmed by a
// read-only match after the write, and the Phase 17 planner writes a style set's values from
// it. It is generated from the site's own modules, never edited by hand: this test fails
// when it is stale, and `npx vitest run -u lib/__tests__/presets.test.ts` regenerates it.
//
// `matchCases` is the part that keeps the two languages honest (Phase 16C amendment 5).
// Python's matching used to be a claim in a docstring, checked only against itself: with
// the picks moved out of the match, the Python patch (`style_set_patch` now) silently stopped writing them and every
// Python test stayed green (ADV-P16C-C measured it). So TypeScript now COMPUTES a list of
// (document, expected match, expected patch) cases here, and `BE/_shared/__tests__/
// test_presets.py` replays them. A difference between the two readers is a red test.

function doc(fields: Record<string, unknown>): StyleSetDoc {
  return fields as StyleSetDoc
}

function matchCase(label: string, d: StyleSetDoc) {
  const match = matchStyleSet(d)
  const {set, unset} = styleSetPatch(STYLE_SETS[0], d)
  return {
    label,
    doc: d as Record<string, unknown>,
    match: match ? {id: match.styleSet.id, current: match.current} : null,
    platformDefault: isPlatformDefault(d),
    // The patch of the first style set against this document, so the two languages agree on
    // what a style set writes as well as on what it matches.
    firstStyleSetPatch: {set, unset: [...unset].sort()},
  }
}

function cases() {
  const out = [
    matchCase('the platform default: what the build writes', doc({fontPairingPreset: 1})),
    matchCase('nothing stored at all', doc({})),
    matchCase('a site that has changed one matched setting', doc({...STYLE_SETS[1].settings, motionTempo: 'snappy'})),
    matchCase('uploaded fonts with no pairing', doc({
      ...STYLE_SETS[2].settings,
      fontPairingPreset: null,
      customFonts: {headingFont: {regular: {asset: {_ref: 'file-abc'}}}},
    })),
    // Phase 17B: a document that still stores the six hidden fields matches as before.
    matchCase('the six hidden fields stored beside a theme', doc({...STYLE_SETS[1].settings, sectionJoin: 'angled', dividerCarry: ['cards'],
      patternGround: 'dark', brandGhost: 'on', sectionOverlap: 'photo', sectionGradient: 'deep'})),
  ]
  for (const styleSet of STYLE_SETS) {
    out.push(matchCase(`${styleSet.id}, as applied`, doc({...styleSet.settings, ...styleSet.picks})))
    // A swapped heading line keeps the style set's name ([R-485]).
    out.push(matchCase(`${styleSet.id}, with the heading line swapped`, doc({...styleSet.settings, headingRule: 'hatched'})))
    for (const [i, version] of styleSet.previous.entries()) {
      out.push(matchCase(`${styleSet.id}, earlier version ${i + 1}`, doc({...version.settings})))
    }
  }
  return out
}

function presets() {
  return {
    generatedBy: 'site/lib/__tests__/presets.test.ts (npx vitest run -u lib/__tests__/presets.test.ts)',
    // Phase 17C (`[R-535]`): version 2 names the style set's keys for the style set, and drops the
    // old ones (themeFields, themeDefaults, themePicks, themes, matchCases[].canyonPatch), so a
    // reader still asking for them fails loudly. `BE/_shared/presets.py` requires version 2.
    version: 2,
    styleSetFields: STYLE_SET_FIELDS,
    styleSetDefaults: STYLE_SET_DEFAULTS,
    styleSetPicks: STYLE_SET_PICKS,
    pickDefaults: PICK_DEFAULTS,
    styleSets: STYLE_SETS.map((t) => ({
      id: t.id,
      name: t.name,
      feel: t.feel,
      identity: t.identity,
      settings: t.settings,
      picks: t.picks,
      previous: t.previous,
      suggestedPalettes: t.suggestedPalettes,
    })),
    cornerFamilies: CORNER_FAMILIES.map((f) => ({id: f.id, name: f.name, uiRadius: f.uiRadius, buttonShape: f.buttonShape})),
    palettes: PALETTE_PRESETS.map((p) => ({id: p.id, name: p.name, darkGround: p.darkGround, lightGround: p.lightGround ?? null, accent: p.accent, action: p.action ?? null})),
    fontPairings: FONT_PRESETS.map((f) => ({
      id: f.id,
      name: f.name,
      heading: f.heading.family,
      body: f.body.family,
      headingItalic: f.heading.italic,
      // What the face can draw, so Python reads a weight the way the site renders it, and
      // its voice, so it can measure how far apart two style sets are (Phase 16C).
      headingWeights: headingWeights(f),
      headingVoice: f.heading.voice,
    })),
    matchCases: cases(),
    // Phase 17A: the preview's signed-link format, as one fixed case. The Site Builder
    // App mints the operator's link and `apply_design.py` verifies an Apply link in
    // Python; `test_presets.py` signs this payload and must produce this token.
    previewTokenVector: {
      ...PREVIEW_TOKEN_VECTOR,
      token: signToken(PREVIEW_TOKEN_VECTOR.payload, PREVIEW_TOKEN_VECTOR.secret),
    },
    // Phase 17B: the theme roster (`lib/flows.ts`), flattened, and its families, so the
    // build's picker and Apply's allow-list read the same ids the site renders; the
    // default an absent `flow` renders, pinned equal in both suites; the six fields
    // hidden for one pin, which Apply may clear and never set.
    darkness: DARKNESS,
    hosts: HOSTS,
    families: FAMILIES.map((f) => ({id: f.id, name: f.name, sentence: f.sentence, steps: f.steps, defaultStep: f.defaultStep, passed: f.passed})),
    flows: FLOWS,
    defaultFlow: DEFAULT_FLOW,
    hiddenFields: HIDDEN_FIELDS,
  }
}

describe('studio/presets.json', () => {
  it('is generated from the site modules and is current', async () => {
    await expect(JSON.stringify(presets(), null, 2) + '\n').toMatchFileSnapshot('../../../studio/presets.json')
  })
})
