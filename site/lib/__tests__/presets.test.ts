import {describe, expect, it} from 'vitest'
import {FONT_PRESETS} from '../../fonts/presets'
import {CORNER_FAMILIES} from '../corners'
import {PALETTE_PRESETS} from '../palettes'
import {THEMES, THEME_DEFAULTS, THEME_FIELDS} from '../themes'

// studio/presets.json (Phase 16B amendment 4): the themes, the corner families, the
// palettes and the font pairings as data, for the readers that cannot import
// TypeScript. The monorepo's Python reads it through the Studio snapshot archive
// (`BE/_shared/presets.py`): the fixture's theme is confirmed by a read-only match
// after the write, and the Phase 17 planner writes a theme's values from it. It is
// generated from the site's own modules, never edited by hand: this test fails
// when it is stale, and `npx vitest run -u lib/__tests__/presets.test.ts`
// regenerates it.

function presets() {
  return {
    generatedBy: 'site/lib/__tests__/presets.test.ts (npx vitest run -u lib/__tests__/presets.test.ts)',
    themeFields: THEME_FIELDS,
    themeDefaults: THEME_DEFAULTS,
    themes: THEMES.map((t) => ({id: t.id, name: t.name, feel: t.feel, settings: t.settings, previous: t.previous, suggestedPalettes: t.suggestedPalettes})),
    cornerFamilies: CORNER_FAMILIES.map((f) => ({id: f.id, name: f.name, uiRadius: f.uiRadius, buttonShape: f.buttonShape})),
    palettes: PALETTE_PRESETS.map((p) => ({id: p.id, name: p.name, darkGround: p.darkGround, lightGround: p.lightGround ?? null, accent: p.accent, action: p.action ?? null})),
    fontPairings: FONT_PRESETS.map((f) => ({id: f.id, name: f.name, heading: f.heading.family, body: f.body.family, headingItalic: f.heading.italic})),
  }
}

describe('studio/presets.json', () => {
  it('is generated from the site modules and is current', async () => {
    await expect(JSON.stringify(presets(), null, 2) + '\n').toMatchFileSnapshot('../../../studio/presets.json')
  })
})
