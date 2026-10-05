import {describe, expect, it} from 'vitest'
import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {APPEARANCE_LAYER, DESIGN_SETTINGS_LAYER, HOMEPAGE_HERO_LAYER, LAYERS, type Claim} from '../layers'

// The partition (monorepo `[R-632]`; WS-V1-BACKGROUND-THEME-DESIGN §5, §7 item 11). Justin, 2026-10-03: "we do not want
// overlap of these theme concepts". Read from the artifact the Studio's schema is extracted to, `studio/field-map.json`:
// every design field it declares is claimed by a layer or named as none, and nothing here outlives its field.

const MAP = resolve(__dirname, '../../../studio/field-map.json')
type Row = {path: string}
const fields = (type: string): Row[] => (JSON.parse(readFileSync(MAP, 'utf8')).types[type]?.fields ?? []) as Row[]
const types = (): Record<string, {fields: Row[]}> => JSON.parse(readFileSync(MAP, 'utf8')).types

const check = (label: string, declared: string[], claims: Readonly<Record<string, Claim>>) => {
  expect([...new Set(declared)].filter((n) => !(n in claims)), `${label}: declared and claimed by no layer`).toEqual([])
  expect(Object.keys(claims).filter((n) => !declared.includes(n)), `${label}: claimed, and the schema has no such field`).toEqual([])
  for (const [name, claim] of Object.entries(claims)) {
    for (const layer of typeof claim === 'string' ? [claim] : claim) expect(['none', ...LAYERS], `${label}.${name}`).toContain(layer)
  }
}

describe.skipIf(!existsSync(MAP))('every stored design field belongs to one layer', () => {
  it('Design Settings: every top-level field claimed, none stale', () => {
    check('designSettings', fields('designSettings').map((r) => r.path.split('.')[0].split('[')[0]), DESIGN_SETTINGS_LAYER)
  })

  it('the homepage hero’s design: every field claimed, none stale', () => {
    const declared = fields('heroSettings').filter((r) => /^homepageHero\.[A-Za-z]+$/.test(r.path)).map((r) => r.path.split('.')[1])
    check('heroSettings.homepageHero', declared, HOMEPAGE_HERO_LAYER)
  })

  it('a section’s appearance: the same five fields on every section type that takes a surface, each claimed', () => {
    const names = Object.keys(APPEARANCE_LAYER)
    const declared: string[] = []
    for (const [type, {fields: rows}] of Object.entries(types())) {
      const tops = new Set(rows.map((r) => r.path.split('.')[0]))
      if (!tops.has('surface')) continue
      // Every appearance field a section type declares beside its surface is one of the five.
      for (const n of ['surface', 'spacing', 'inset', 'overlapPrevious', 'sectionBackgroundImage', 'backgroundImage']) if (tops.has(n)) declared.push(n)
      expect(tops.has('spacing'), `${type} takes a surface and no spacing`).toBe(true)
    }
    expect(declared.length).toBeGreaterThan(0)
    check('appearance', declared.filter((n) => names.includes(n) || n === 'backgroundImage'), APPEARANCE_LAYER)
  })

  it('a field under two layers is a split still owed, and there are exactly three', () => {
    const shared = Object.entries(DESIGN_SETTINGS_LAYER).filter(([, c]) => typeof c !== 'string').map(([n]) => n)
    expect(shared).toEqual(['cardHover', 'elevationStyle', 'flow'])
    for (const claims of [HOMEPAGE_HERO_LAYER, APPEARANCE_LAYER]) expect(Object.values(claims).every((c) => typeof c === 'string')).toBe(true)
  })

  it('the Background theme owns its one field, its photographs and their approvals, and nothing of the grounds', () => {
    for (const f of ['background', 'themePhotos', 'flowPhoto', 'flowPhotos']) expect(DESIGN_SETTINGS_LAYER[f]).toBe('background')
    expect(APPEARANCE_LAYER.surface).toBe('flow')
    expect(DESIGN_SETTINGS_LAYER.patternTexture).toBe('element')
  })
})
