import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// THE LIGHT HERO TAKES THE THEME'S WARM GROUND (Phase 18 session B, item 5; `[R-603]`).
//
// Justin, of Soft wash on a throwaway: "I would expect the hero to be the warm color bg and not the grey". A light
// homepage hero painted `bg-hero-tint`, the ground at L -0.015 (ΔE2000 1.0 from the page on every preset), which on a
// white page is a grey step and never Soft wash's cream. Under a theme that paints washes it paints the wash, the text
// half of a full-bleed split included; and in the stretch of bands under it the alternation counts from the top, so a
// wash never touches a wash, with any double light it forces at the foot, never under the hero.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))
// The skeletons load through next/dynamic, which draws nothing under test: the homepage case reads what HomeBody hands the
// hero, and the band's paint is read from the skeleton itself below.
vi.mock('@/components/layout/homeHero', () => ({
  HomepageHero: ({lightGround}: {lightGround?: string}) => <section data-light-ground={lightGround} />,
}))

import {heroGround, heroPaint} from '@/lib/heroGround'
import {flowById} from '@/lib/flows'
import {assignGrounds} from '@/components/sections/sectionFrame'
import {HomeBody} from '@/components/layout/HomeBody'
import {Overlay} from '@/components/layout/homeHero/skeletons/Overlay'
import {resolveHeroConfig} from '@/components/layout/homeHero/config'

const softWash = flowById('softWash.mostlyLight')!
const quiet = flowById('quiet.mostlyLight')!
const lightHero = (over: Record<string, unknown> = {}) => ({heading: 'Estate planning', schemeOverride: 'light', layout: 'overlay', backdrop: 'none', ...over}) as never

describe('the hero’s paint and ground', () => {
  it('a light hero paints the wash under a theme that paints washes, the tint under every other', () => {
    expect(heroPaint(lightHero(), softWash)).toBe('wash')
    expect(heroGround(lightHero(), softWash)).toBe('wash')
    expect(heroPaint(lightHero(), quiet)).toBeNull()
    expect(heroGround(lightHero(), quiet)).toBe('tint')
    expect(heroGround(lightHero(), null)).toBe('tint')
  })

  it('a dark hero, a photograph behind the hero or a section background paints no wash', () => {
    expect(heroPaint(lightHero({schemeOverride: 'dark'}), softWash)).toBeNull()
    expect(heroPaint(lightHero({backdrop: 'image', backgroundImage: {src: 'x.jpg'}}), softWash)).toBeNull()
    expect(heroPaint(lightHero({sectionBackgroundImage: {src: 'x.png'}}), softWash)).toBeNull()
  })
})

type Survivor = Parameters<typeof assignGrounds>[0][number]
const band = (): Survivor => ({appearance: null, host: 'statement'} as unknown as Survivor)

describe('a wash never touches a wash', () => {
  it('holds for 1 to 12 light bands, a wash or tint hero, and a wash, dark or no close; the band under a wash hero is light', () => {
    for (let n = 1; n <= 12; n++) {
      for (const hero of ['wash', null] as const) {
        for (const close of ['wash', 'dark', null] as const) {
          const paints = assignGrounds(Array.from({length: n}, () => band()), softWash, {heroPaint: hero} as never, {close})
          const grounds = [hero, ...paints.map((p) => p?.ground ?? 'light'), close]
          for (let i = 1; i < grounds.length; i++) {
            expect(!(grounds[i - 1] === 'wash' && grounds[i] === 'wash'), `n=${n} hero=${hero} close=${close}: ${grounds.join(',')}`).toBe(true)
          }
          if (hero === 'wash') expect(paints[0]?.ground, `n=${n} close=${close}`).toBe('light')
          // A double light, where one is forced, is at the foot of the stretch.
          const lights = grounds.slice(1, -1).map((g) => g === 'light')
          for (let i = 1; i < lights.length - 1; i++) expect(lights[i - 1] && lights[i], `n=${n} hero=${hero} close=${close}: ${grounds.join(',')}`).toBe(false)
        }
      }
    }
  })

  it('without a wash hero the pass counts from the foot, exactly as before', () => {
    const paints = assignGrounds([0, 1, 2, 3].map(() => band()), softWash, null, {close: 'wash'})
    expect(paints.map((p) => p?.ground)).toEqual(['wash', 'light', 'wash', 'light'])
  })
})

describe('the homepage paints it', () => {
  const chrome = (flow: string) => ({designTokens: {flow}, globalCta: null, header: {siteSettings: {firmName: 'Example Law Firm'}}})
  const handed = (flow: string) => {
    const all = {page: {hero: {heading: 'Estate planning, made plain'}}, heroDesign: {schemeOverride: 'light', skeleton: 'overlay', backdrop: 'none'}}
    const {container} = render(<HomeBody chrome={chrome(flow) as never} all={all as never} />)
    return container.querySelector('section')?.getAttribute('data-light-ground')
  }

  it('hands the light hero the wash under Soft wash and the tint under Quiet', () => {
    expect(handed('softWash.mostlyLight')).toBe('wash')
    expect(handed('quiet.mostlyLight')).toBe('tint')
  })

  it('the band paints the ground it is handed', () => {
    const surface = (lightGround: 'wash' | 'tint') => ({scheme: 'light', isDark: false, lightGround, bgImage: null, hasImage: false, fit: 'cover', foreground: null, hasForeground: false, scrimOpacity: 80, scrimStyle: 'flat', scrimColor: 'auto', scrimDirection: 'auto', sectionBg: null, hasSectionBg: false, sectionBgFit: 'cover'})
    const config = resolveHeroConfig({heading: 'E', skeleton: 'overlay', backdrop: 'none', schemeOverride: 'light'} as never)
    const band = (g: 'wash' | 'tint') => render(<Overlay config={config} content={{heading: 'E', ctas: [], galleryImages: []} as never} surface={surface(g) as never} sectionBackground={null} />).container.querySelector('section')!.className.split(' ')
    expect(band('wash')).toContain('bg-wash')
    expect(band('wash')).not.toContain('bg-hero-tint')
    expect(band('tint')).toContain('bg-hero-tint')
  })
})
