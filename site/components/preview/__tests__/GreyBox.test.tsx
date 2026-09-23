import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {GreyBox} from '../GreyBox'
import canvas from '@/components/layout/__tests__/fixtures/migrated-canvas.json'

// The grey box (Phase 17A, monorepo WS-V1-PHASE17A-DESIGN §2.4): the homepage's real
// sections, copy and order, drawn with no design. What it must never do is show a
// design (a color, the site's type, an image) or disagree with the live page about
// which bands exist.

const chrome = {
  nap: {firmName: 'Example Firm'},
  header: {siteSettings: {firmName: 'Example Firm'}, mainNavigation: {navItems: [{}, {}, {}]}},
  globalCta: {heading: 'Talk to us', description: 'Free first call.', buttons: [{title: 'Call now', url: '/contact'}]},
} as never

const home = (page: Record<string, unknown>, heroDesign: unknown = {layout: 'overlay'}) =>
  ({page: {hero: {heading: 'We fight for you', eyebrow: 'Example Firm', buttons: [{title: 'Book a call'}]}, ...page}, heroDesign}) as never

const photo = {asset: {url: 'https://cdn.example.com/p.jpg'}, url: 'https://cdn.example.com/p.jpg'}

/** One member of each of the nine types, each with something to show. */
const EVERY_TYPE = [
  {_type: 'practiceAreaNavInline', _key: 'pa', heading: 'Areas of law', layout: 'tile', items: [{_key: 'i1', label: 'Wills', href: '/wills', image: photo}, {_key: 'i2', label: 'Trusts', href: '/trusts'}]},
  {_type: 'attorneySectionInline', _key: 'at', heading: 'Our attorneys', layout: 'grid', attorneys: [{_id: 'a1', title: 'Pat Doe', jobTitle: 'Partner', photo}]},
  {_type: 'badgesSectionInline', _key: 'bd', heading: 'Awards', layout: 'centeredGrid', badges: [{src: 'https://cdn.example.com/b.png', alt: 'Top 100'}]},
  {_type: 'testimonialsGridInline', _key: 'tg', heading: 'Clients say', testimonials: [{_id: 't1', quote: 'They listened.', name: 'J. R.', avatar: photo}]},
  {_type: 'featuredTestimonialInline', _key: 'ft', testimonial: {_id: 't2', quote: 'Best decision.', name: 'A. B.'}},
  {_type: 'videoSectionInline', _key: 'vd', heading: 'Watch', videos: [{_id: 'v1', title: 'Our story', youTubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}]},
  {_type: 'caseResultsSectionInline', _key: 'cr', heading: 'Results', caseResults: [{_id: 'r1', amount: '$1.2M', caption: 'Settlement'}]},
  {_type: 'contentSectionInline', _key: 'cs', heading: 'Why us', layout: 'split', body: [{_type: 'block', children: [{_type: 'span', text: 'Plain words.'}]}], media: {kind: 'image', image: photo}},
  {_type: 'reviewsSectionInline', _key: 'rv', heading: 'Reviews', reviewsEmbed: '<div>widget</div>'},
]

const draw = (page: Record<string, unknown>, heroDesign?: unknown) => render(<GreyBox chrome={chrome} home={home(page, heroDesign)} />).container

describe('GreyBox', () => {
  it('draws every one of the nine section types with its label and its copy', () => {
    const c = draw({canvas: EVERY_TYPE})
    const text = c.textContent ?? ''
    for (const label of ['Areas of law', 'Attorneys', 'Badges', 'Testimonials', 'Featured testimonial', 'Video', 'Case results', 'Content section', 'Reviews']) {
      expect(text).toContain(label)
    }
    for (const copy of ['Wills', 'Trusts', 'Pat Doe', 'Top 100', 'They listened.', 'Best decision.', 'Our story', '$1.2M', 'Plain words.']) {
      expect(text).toContain(copy)
    }
    // Real counts, sized by layout.
    expect(text).toContain('2 areas of law')
    expect(text).toContain('1 attorney')
    // Nothing is "not shown": every member has content.
    expect(c.querySelectorAll('.gb-missing')).toHaveLength(0)
  })

  it('shows no design: no image, no site class, no inline color, no token', () => {
    const c = draw({canvas: EVERY_TYPE})
    expect(c.querySelectorAll('img, picture, video, iframe, svg')).toHaveLength(0)
    const classes = [...c.querySelectorAll('[class]')].flatMap((el) => el.className.split(' '))
    expect(classes.filter((cl) => !cl.startsWith('gb'))).toEqual([])
    expect(c.querySelectorAll('[style]')).toHaveLength(0)
    expect(c.innerHTML).not.toMatch(/var\(--/)
  })

  it('draws a band the live page leaves out as not shown, and an unknown type too', () => {
    const c = draw({canvas: [
      {_type: 'caseResultsSectionInline', _key: 'cr', caseResults: [{_id: 'r', amount: null, caption: null}]},
      {_type: 'someFutureInline', _key: 'x'},
    ]})
    const missing = [...c.querySelectorAll('.gb-missing')].map((el) => el.textContent)
    expect(missing).toEqual(['Case results · default layout · not shown: no content yet', 'Unknown section type · not shown: this site does not know it'])
  })

  it('names a beat only where the build recorded it', () => {
    const c = draw({canvas: [
      {...EVERY_TYPE[6], _key: 'hp-caseResultsBlock'},
      {...EVERY_TYPE[7], _key: 'a-studio-key'},
    ]})
    const labels = [...c.querySelectorAll('.gb-label')].map((el) => el.textContent)
    expect(labels).toContain('Beat 3 · social proof (as built) · Case results · default layout')
    expect(labels).toContain('Content section · split')
  })

  it('says so when the list is empty, the hero is not set up, or the close is hidden', () => {
    const c = draw({canvas: [], hideCtaForm: true}, null)
    const text = c.textContent ?? ''
    expect(text).toContain('The homepage list is empty')
    expect(text).toContain('Hero · not set up')
    expect(text).toContain('Example Firm')
    expect(text).toContain('Closing call to action · hidden on this page')
  })

  it('draws the close from the site\'s call to action, and the site\'s chrome as boxes', () => {
    const text = draw({canvas: []}).textContent ?? ''
    expect(text).toContain('Beat 9 · Closing call to action')
    expect(text).toContain('Talk to us')
    // Nothing stored: the layouts the site renders by default (Phase 17B session 4).
    expect(text).toContain('Site header · Apex on desktop, Standard on phones · 3 navigation items')
    expect(text).toContain('Site footer · Anchor')
  })

  it('labels the header and footer with the layouts the build picked, and the offices the footer shows', () => {
    const picked = {
      ...(chrome as object),
      header: {siteSettings: {firmName: 'Example Firm'}, mainNavigation: {navItems: [{}], headerLayout: 'ridge', mobileLayout: 'bar-bottom'}},
      footer: {footerSettings: {footerLayout: 'districts'}, locations: [{_id: 'a'}, {_id: 'b'}]},
    } as never
    const c = render(<GreyBox chrome={picked} home={home({canvas: []})} />).container
    const text = c.textContent ?? ''
    expect(text).toContain('Site header · Ridge on desktop, Action bar on phones · 1 navigation item')
    expect(text).toContain('Site footer · Districts · 2 offices')
  })

  it('matches its golden on the fixture client\'s canvas', async () => {
    const c = draw({canvas})
    await expect(c.innerHTML).toMatchFileSnapshot('./__snapshots__/grey-box.html')
  })
})
