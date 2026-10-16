import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// HOW AN IMAGE IS DESCRIBED (monorepo backlog 457, `[R-465]`). About thirty renderers wrote `alt={x ?? ''}`, so an image
// that needed a description and had none rendered as decoration and passed axe and Verify without a sound. A content image
// now renders its description, or the description the renderer already has, or an empty alt, which Verify lists for a
// person (CS/a11y-accepted.csv records one confirmed decorative, per page); a decorative image says so at its call site
// (`data-decorative`), so one that forgets to decide is listed, never silently decorative. `platform/no-silent-empty-alt`
// refuses the old fallback.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>),
}))
// next/image passes every other prop to its <img>, the decorative mark among them.
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars, jsx-a11y/alt-text -- the mock drops next/image's own props and passes the rest
  default: ({src, fill: _fill, priority: _priority, loader: _loader, placeholder: _placeholder, blurDataURL: _blur, ...rest}: Record<string, unknown>) => <img src={src as string} {...rest} />,
}))
vi.mock('next/navigation', () => ({usePathname: () => '/'}))
vi.mock('@/components/ui/ButtonGroup', () => ({ButtonGroup: () => null, toCtaItems: (b: unknown) => b}))
vi.mock('@/components/ui/DialogPanel', () => ({DialogPanel: ({trigger}: {trigger: React.ReactNode}) => <>{trigger}</>}))

import {contentAlt} from '@/lib/imageAlt'
import {SanityImage} from '../SanityImage'
import {HeroBackdrop} from '@/components/layout/HeroBackdrop'
import {HeroForeground} from '@/components/layout/HeroForeground'
import {Overlay} from '@/components/layout/homeHero/skeletons/Overlay'
import {Split} from '@/components/layout/homeHero/skeletons/Split'
import {resolveHeroConfig} from '@/components/layout/homeHero/config'
import type {HeroConfig, ResolvedHomeContent} from '@/components/layout/homeHero/types'
import type {ResolvedHeroSurface} from '@/lib/heroSurface'
import {Footer, type FooterData} from '@/components/layout/Footer'
import {BadgesSectionBlock} from '@/components/sections/BadgesSectionBlock'
import {Header} from '@/components/layout/Header'

class NoResize {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeEach(() => { vi.stubGlobal('ResizeObserver', NoResize) })
afterEach(() => { vi.unstubAllGlobals() })

const photo = (alt?: string | null) => ({src: 'https://cdn.example.com/office.jpg', alt, width: 1600, height: 900})
const sanityPhoto = (alt?: string | null) => ({asset: {_ref: 'image-a1-1600x900-jpg'}, alt}) as never
function surface(alt?: string | null, over: Partial<ResolvedHeroSurface> = {}): ResolvedHeroSurface {
  return {
    scheme: 'dark', isDark: true, bgImage: photo(alt) as never, hasImage: true, fit: 'cover', foreground: photo(alt) as never, hasForeground: true,
    scrimOpacity: 80, scrimStyle: 'flat', scrimColor: 'auto', scrimDirection: 'auto', sectionBg: null, hasSectionBg: false, sectionBgFit: 'cover', ...over,
  }
}
const content: ResolvedHomeContent = {eyebrow: null, heading: 'Counsel', description: null, ctas: [], galleryImages: [], videoUrl: null} as never
const config = (over: Partial<HeroConfig>): HeroConfig => ({...resolveHeroConfig({heading: 'Counsel'} as never), ...over})
const imgs = (el: Element) => [...el.querySelectorAll('img')]
// What Verify lists (axe_scan.mjs): an image with an empty alt and no decorative mark, outside anything hidden.
const listed = (i: Element) => i.getAttribute('alt') === '' && !i.hasAttribute('data-decorative') && !i.closest('[aria-hidden="true"]')
const marked = (el: Element) => imgs(el).map((i) => [i.getAttribute('alt'), listed(i)])

describe('contentAlt', () => {
  it('the stored description, else the first fallback with a word, else empty', () => {
    expect(contentAlt('The office')).toBe('The office')
    expect(contentAlt('  ', null, 'Marlow & Finch')).toBe('Marlow & Finch')
    expect(contentAlt(undefined, '')).toBe('')
    expect(contentAlt(null)).toBe('')
  })
})

describe('a content image with no description is listed, one with a description is not', () => {
  const cases: Array<[string, (alt?: string | null) => React.ReactElement]> = [
    ['SanityImage with no alt given', (alt) => <SanityImage image={sanityPhoto(alt)} mode="fill" />],
    ['the inner hero’s photograph', (alt) => <HeroBackdrop surface={surface(alt)} />],
    ['the hero’s cut-out figure', (alt) => <HeroForeground surface={surface(alt)} />],
    ['the Overlay hero’s backdrop', (alt) => <Overlay config={config({skeleton: 'overlay', backdrop: 'image'})} content={content} surface={surface(alt, {hasForeground: false})} />],
    ['the Split hero’s panel', (alt) => <Split config={config({skeleton: 'split', splitImageStyle: 'contained'})} content={content} surface={surface(alt, {hasForeground: false})} />],
    ['the Split hero’s full-bleed half', (alt) => <Split config={config({skeleton: 'split', splitImageStyle: 'full'})} content={content} surface={surface(alt, {hasForeground: false})} />],
    ['a badge', (alt) => <BadgesSectionBlock data={{_type: 'badgesSection', layout: 'grid', badges: [{...photo(alt)}]} as never} />],
  ]
  it.each(cases)('%s', (_name, el) => {
    const none = render(el(null)).container
    expect(marked(none)).toContainEqual(['', true])
    expect(marked(none).filter(([, m]) => !m).every(([a]) => a !== ''), 'no unmarked empty alt').toBe(true)
    const described = render(el('The office')).container
    expect(marked(described)).toContainEqual(['The office', false])
    expect(imgs(described).some(listed)).toBe(false)
  })
})

describe('a decorative image says so and is not listed', () => {
  it('a Section Background, the header’s logo inside its named link, the Split video poster inside its named button', () => {
    const section = render(<HeroBackdrop surface={surface(null, {isDark: false})} decorative />).container
    expect(marked(section)).toEqual([['', false]])
    const header = render(<Header data={{firmName: 'Marlow & Finch', logoOnLight: {src: '/on-light.png', alt: 'Marlow & Finch logo', width: 400, height: 100}, sticky: true, navItems: []} as never} />).container
    expect(imgs(header).map((i) => [i.getAttribute('alt'), i.hasAttribute('data-decorative')])).toContainEqual(['', true])
    expect(header.querySelector('a[href="/"]')!.getAttribute('aria-label')).toContain('Marlow & Finch')
    const video = render(<Split config={config({skeleton: 'split', splitMedia: 'video'})} content={{...content, videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'}} surface={surface(null, {hasForeground: false})} />).container
    expect(marked(video)).toEqual([['', false]])
    expect(video.querySelector('button')!.getAttribute('aria-label')).toBe('Play video')
  })

  it('a tiled photograph: named where described, else hidden and, if content, marked, never an image role with no name', () => {
    const tile = (alt?: string | null, decorative = false) =>
      render(<HeroBackdrop surface={surface(alt, {fit: 'tile'})} decorative={decorative} />).container.querySelector('[data-testid="hero-bg-tile"]')!
    expect([tile('Brick').getAttribute('role'), tile('Brick').getAttribute('aria-label')]).toEqual(['img', 'Brick'])
    expect([tile(null).getAttribute('role'), tile(null).getAttribute('aria-hidden'), tile(null).hasAttribute('data-alt-missing')]).toEqual([null, 'true', true])
    expect([tile('Brick', true).getAttribute('role'), tile('Brick', true).hasAttribute('data-alt-missing')]).toEqual([null, false])
  })
})

describe('a footer logo is its link’s name', () => {
  const DATA: FooterData = {firmName: 'Marlow & Finch', footerScheme: 'dark', logo: {src: '/logo.png', alt: null, width: 400, height: 100} as never}
  for (const footerLayout of ['anchor', 'beacon', 'meridian', 'pillar', 'crest', 'districts', 'switchboard'] as const) {
    it(`${footerLayout}: the firm’s name where the logo has no description; listed only where there is no name either`, () => {
      const link = (data: FooterData) => {
        const {container, unmount} = render(<Footer data={{...data, footerLayout}} />)
        const img = container.querySelector('a[href="/"] img')!
        const out = {alt: img.getAttribute('alt'), mark: listed(img), name: img.closest('a')!.getAttribute('aria-label') ?? img.getAttribute('alt')}
        unmount()
        return out
      }
      expect(link(DATA)).toEqual({alt: 'Marlow & Finch', mark: false, name: 'Marlow & Finch'})
      expect(link({...DATA, firmName: null}).mark).toBe(true)
    })
  }
})
