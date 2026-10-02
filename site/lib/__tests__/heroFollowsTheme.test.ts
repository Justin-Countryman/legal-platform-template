import {describe, expect, it} from 'vitest'
import {heroGround, heroPaint, themedHero} from '../heroGround'
import {FLOWS, HERO_GROUNDS, bridgeOf, flowById} from '../flows'
import type {HomeHeroData} from '@/components/layout/homeHero/types'

// ─── The homepage hero follows the theme where it stores no ground of its own (Phase 18 session E) ─────────────
//
// Monorepo `[R-619]`: the starting look comes from the firm and stays switchable in the preview. The build writes the
// theme and leaves the hero's ground to inherit (WS-V1-PHASE18E-DESIGN §9.2), so a warm firm the builder gives Soft wash
// opens on its warm hero, and the hero follows whatever theme the meeting picks. Only Soft wash says `light`: under every
// other theme an inherited hero renders as it did (the site's internal default, dark unless set), so no live page moves.
// A stored dark or light still wins, and a photograph still forces dark.

const hero = (over: Partial<HomeHeroData> = {}): HomeHeroData =>
  ({heading: 'Counsel you can call', skeleton: 'overlay', backdrop: 'none', ...over}) as HomeHeroData
const SOFT = flowById('softWash.mostlyLight')!
const QUIET = flowById('quiet.mostlyLight')!

describe('the hero under the theme', () => {
  it('every theme names its hero in the closed vocabulary; only Soft wash, at both steps, says light', () => {
    for (const f of FLOWS) expect(HERO_GROUNDS, f.id).toContain(f.hero)
    expect(FLOWS.filter((f) => f.hero === 'light').map((f) => f.family)).toEqual(FLOWS.filter((f) => f.family === 'softWash').map(() => 'softWash'))
    expect(bridgeOf({sectionJoin: 'angled'}).hero).toBe('site')
  })

  it('an inherited hero takes Soft wash’s light, and paints its wash', () => {
    for (const scheme of [undefined, null, 'inherit'] as const) {
      const h = themedHero(hero({schemeOverride: scheme as HomeHeroData['schemeOverride']}), SOFT)
      expect(h?.schemeOverride, String(scheme)).toBe('light')
      expect(heroGround(h, SOFT)).toBe('wash')
      expect(heroPaint(h, SOFT)).toBe('wash')
    }
  })

  it('under every other theme an inherited hero is unchanged, so no live page moves', () => {
    const h = hero({schemeOverride: 'inherit'})
    for (const f of FLOWS.filter((x) => x.hero !== 'light')) {
      expect(themedHero(h, f), f.id).toBe(h)
      expect(heroGround(themedHero(h, f), f), f.id).toBe('dark')
    }
    expect(themedHero(h, null)).toBe(h)
  })

  it('a stored dark or light hero wins, and a photograph still forces dark', () => {
    expect(heroGround(themedHero(hero({schemeOverride: 'dark'}), SOFT), SOFT)).toBe('dark')
    expect(heroGround(themedHero(hero({schemeOverride: 'light'}), QUIET), QUIET)).toBe('tint')
    const photo = {src: 'https://cdn.example.com/p.jpg', width: 2400, height: 1600, isOpaque: true}
    expect(heroGround(themedHero(hero({schemeOverride: 'inherit', backdrop: 'image', backgroundImage: photo}), SOFT), SOFT)).toBe('image')
    expect(themedHero(null, SOFT)).toBeNull()
  })
})
