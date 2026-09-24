import {describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'

// ─── One download: the hero and its windows resolve one candidate ─────────────
//
// Phase 17B session 6 (`[R-530]`; ADV-17B6-2 F4). The Photo scrims theme draws windows of the hero's
// own photograph in dark bands; the page downloads the photograph once only if every window's image
// resolves the exact candidate the hero's does: the same src, the same src set, the same sizes, the
// same loader and quality. This test renders the REAL Overlay hero with the REAL `next/image` (no
// mock) beside a real window, so a change to either side's image settings turns it red instead of
// silently doubling every visitor's download.

import {Overlay} from '../skeletons/Overlay'
import {SectionShell} from '@/components/sections/SectionShell'
import type {HeroConfig, ResolvedHomeContent} from '../types'
import type {ResolvedHeroSurface} from '@/lib/heroSurface'
import {NO_SEAM} from '@/components/sections/sectionFrame'

const SRC = 'https://cdn.sanity.io/images/TEMPLATE_SANITY_PROJECT_ID/production/abc-2400x1600.jpg'
const surface: ResolvedHeroSurface = {
  scheme: 'dark', isDark: true, bgImage: {src: SRC, alt: '', width: 2400, height: 1600}, hasImage: true, fit: 'cover',
  foreground: null, hasForeground: false, scrimOpacity: 80, scrimStyle: 'flat', scrimColor: 'auto', scrimDirection: 'auto',
  sectionBg: null, hasSectionBg: false, sectionBgFit: 'cover',
}
const config: HeroConfig = {
  skeleton: 'overlay', heightMode: 'content', contentAlign: 'left', backdrop: 'image', foreground: false, scrimStyle: 'flat',
  scrimColor: 'auto', scrimDirection: 'auto', splitMedia: 'image', splitImageStyle: 'contained', splitImageRatio: 'landscape',
  textTreatment: 'inline', mediaSide: 'right', motion: 'none',
}
const content: ResolvedHomeContent = {eyebrow: null, heading: 'Counsel you can call', description: null, ctas: [], galleryImages: [], videoUrl: null}

describe('the hero and a window of it resolve one image candidate', () => {
  it('the same src, src set and sizes, and neither image lazy', () => {
    const hero = render(<Overlay config={config} content={content} surface={surface} sectionBackground={null} />).container.querySelector('img')!
    const site = {imageFrame: null, cardHover: null, attorneyCardStyle: null, heroPhoto: {src: SRC, width: 2400, height: 1600, hotspot: null, assetId: 'image-abc-2400x1600-jpg'}}
    const band = render(
      <SectionShell appearance={{surface: 'image'}} seam={{...NO_SEAM, site, paint: {ground: 'image', texture: false, window: {x: 1, y: 1}}}}>
        <p>A band</p>
      </SectionShell>,
    ).container
    const win = band.querySelector('[data-photo-window] img')!
    expect(hero.getAttribute('srcset')).toBeTruthy()
    expect(win.getAttribute('srcset')).toBe(hero.getAttribute('srcset'))
    expect(win.getAttribute('src')).toBe(hero.getAttribute('src'))
    expect(win.getAttribute('sizes')).toBe(hero.getAttribute('sizes'))
    // Neither is lazy: a lazy copy is fetched a second time by WebKit (ADV-17B6-B, measured).
    expect(hero.getAttribute('loading')).not.toBe('lazy')
    expect(win.getAttribute('loading')).toBe('eager')
  })
})
