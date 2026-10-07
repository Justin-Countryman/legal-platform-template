import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// THE HOMEPAGE HERO'S FIGURE STANDS ON THE BAND'S BOTTOM EDGE (monorepo `[R-641]`, WS-PREMIUM-PACKAGE-DESIGN §7.2
// amendment 4). Its box was a fixed 28rem from the text container's top, so on a band taller than about 21rem (a
// full-viewport hero) the figure's feet floated above the edge, where every premium reference stands its people on it.
// The box now runs from the container's top past its foot by the band's own bottom padding, so the image's foot is the
// band's edge at any height. The interior heroes keep their fixed box.

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: vi.fn(({src, alt, className}) => <img src={src} alt={alt ?? ''} className={className} />),
}))
vi.mock('@/components/ui/ButtonGroup', () => ({ButtonGroup: vi.fn(() => null), toCtaItems: vi.fn((b) => b)}))

import {Overlay} from '../skeletons/Overlay'
import {HeroForeground} from '@/components/layout/HeroForeground'
import {HERO_FOREGROUND_FLOOR} from '@/lib/heroLayout'
import type {HeroConfig, ResolvedHomeContent} from '../types'
import type {ResolvedHeroSurface} from '@/lib/heroSurface'

const surface: ResolvedHeroSurface = {
  scheme: 'dark', isDark: true, bgImage: null, hasImage: false, fit: 'cover',
  foreground: {src: 'https://cdn.example.com/figure.png', alt: 'Attorney', width: 800, height: 1000} as never, hasForeground: true,
  scrimOpacity: 80, scrimStyle: 'flat', scrimColor: 'auto', scrimDirection: 'auto', sectionBg: null, hasSectionBg: false, sectionBgFit: 'cover',
}
const config = (heightMode: HeroConfig['heightMode']): HeroConfig => ({
  skeleton: 'overlay', heightMode, contentAlign: 'left', backdrop: 'none', foreground: true, scrimStyle: 'flat', scrimColor: 'auto',
  scrimDirection: 'auto', splitMedia: 'image', splitImageStyle: 'contained', splitImageRatio: 'landscape', textTreatment: 'inline',
  mediaSide: 'right', motion: 'none',
})
const content: ResolvedHomeContent = {eyebrow: null, heading: 'Heading', description: null, ctas: [], galleryImages: [], videoUrl: null} as never

describe('the homepage hero figure', () => {
  it.each(['fullViewport', 'content'] as const)('on a %s band, its box reaches the band’s bottom edge and has no fixed height', (mode) => {
    const {getByTestId, container} = render(<Overlay config={config(mode)} content={content} surface={surface} sectionBackground={null} />)
    const box = getByTestId('hero-foreground') as HTMLElement
    expect(box.style.bottom).toBe(`-${HERO_FOREGROUND_FLOOR}`)
    expect(box.style.height).toBe('')
    expect(box.className.split(' ')).toContain('top-0')
    // The floor is the band's own bottom padding from lg, where the figure shows: the two move together.
    const band = container.querySelector('section')!.className.split(' ')
    expect(HERO_FOREGROUND_FLOOR).toBe('5rem')
    expect(band).toContain('lg:pb-20')
    expect(box.className.split(' ')).toContain('lg:block')
    // The image's foot is the box's foot.
    expect(box.querySelector('img')!.className.split(' ')).toContain('object-right-bottom')
  })

  it('an interior hero keeps its fixed box', () => {
    const box = render(<HeroForeground surface={surface} />).getByTestId('hero-foreground') as HTMLElement
    expect(box.style.height).toBe('var(--hero-fg-h)')
    expect(box.style.bottom).toBe('')
  })
})
