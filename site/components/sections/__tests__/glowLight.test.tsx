import {describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import {SectionShell} from '@/components/sections/SectionShell'
import {NO_SEAM, type SiteLook} from '@/components/sections/sectionFrame'
import {HeroBand} from '@/components/layout/homeHero/shared'
import {effectiveFlow} from '@/lib/backgrounds'
import {flowById} from '@/lib/flows'

// THE GLOW AS A LIGHT, AS DRAWN (monorepo WS-PREMIUM-PACKAGE-DESIGN §9.3, `[R-646]`). The walk's light and veil reach the
// band and the hero as classes; a see-through card on a lit band stands on it, a light island keeps its own.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const flow = effectiveFlow(flowById('typeOnBlack.allDark')!, 'glow.corner')
const site: SiteLook = {imageFrame: null, cardHover: null, attorneyCardStyle: null, flow, patternTexture: null, saturated: true, glow: true, ghost: null}
const band = (run: NonNullable<typeof NO_SEAM.run>) =>
  render(<SectionShell appearance={null} seam={{...NO_SEAM, site, fade: 'glow', run, paint: {ground: 'dark', texture: false}}}>x</SectionShell>).container.querySelector('section')!
const classes = (el: Element) => el.className.split(' ')

describe('the glow’s light, as the shell draws it', () => {
  it('a band carries its light, its side, its edge and its veil; the rest of the run the veil alone', () => {
    const lit = classes(band({index: 2, length: 3, light: 'right', edge: true, veil: 'bottom'}))
    expect(lit).toEqual(expect.arrayContaining(['band-glow', 'glow-corner', 'glow-light-right', 'glow-light-edge', 'glow-veil-bottom']))
    const other = classes(band({index: 1, length: 3, veil: 'flat'}))
    expect(other).toContain('glow-veil-flat')
    expect(other.some((c) => c.startsWith('glow-light'))).toBe(false)
  })

  it('the hero carries its light below the header, as a section does', () => {
    const surface = {isDark: true, hasImage: false, lightGround: 'tint'} as unknown as Parameters<typeof HeroBand>[0]['surface']
    const hero = render(<HeroBand surface={surface} fullViewport={false} glow={{index: 0, length: 3, kind: 'glow', shape: 'center', light: 'center', veil: 'flat'}}>x</HeroBand>).container.querySelector('section')!
    expect(classes(hero)).toEqual(expect.arrayContaining(['band-glow', 'glow-center', 'glow-light-hero', 'glow-light-center', 'glow-veil-flat']))
  })

  it('a see-through card on a lit band stands on it; a light island and a photo card keep their own', () => {
    const SEL = ':is(.glow-light-left, .glow-light-right, .glow-light-center) [data-card]:not([data-ring-context="light"]):not(:has(img))'
    expect(CSS).toContain(`${SEL} {\n  background-color: var(--color-glow-surface, var(--color-brand-dark));\n  box-shadow: 0 18px 40px -24px rgb(0 0 0 / 0.55);`)
    const {container} = render(
      <section className="band-glow glow-corner glow-light-right">
        <div data-card="">See-through</div>
        <div data-card="" data-ring-context="light">Light island</div>
        <div data-card="">
          {/* eslint-disable-next-line @next/next/no-img-element -- a selector test: any photo card */}
          <img alt="" src="/x.jpg" />
        </div>
      </section>,
    )
    const [seeThrough, island, photo] = [...container.querySelectorAll('[data-card]')]
    expect(seeThrough.matches(SEL)).toBe(true)
    expect(island.matches(SEL)).toBe(false)
    expect(photo.matches(SEL)).toBe(false)
  })
})
