import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {fireEvent, render} from '@testing-library/react'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img data-testid="badge-img" src={src} alt={alt ?? ''} className={className} />,
}))
vi.mock('@/components/ui/SanityImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  SanityImage: ({alt, className}: {alt?: string; className?: string}) => <img data-testid="media-img" alt={alt ?? ''} className={className} />,
}))
vi.mock('@/components/media/VideoEmbed', () => ({
  VideoEmbed: ({video}: {video: {title?: string}}) => <div data-testid="video">{video.title}</div>,
}))

import {ContentSectionBlock, isContentSectionEmpty, rendersResultClaim, type ContentSectionData} from '../ContentSectionBlock'
import resultClaimCases from './fixtures/result-claim-cases.json'
import {HEADING_UNIT_TIER_CLASS} from '@/components/ui/HeadingUnit'
import {TREATMENT_CLASSES} from '@/lib/imageTreatment'

// ─── The content section ──────────────────────────────────────────────────────
//
// Phase 11 (monorepo WS-V1-PHASE11-DESIGN §2 requirement 5, §7 amendments 5, 6,
// 8, 9). Five layouts render their structure; "renders nothing" is decided per
// layout; the emphasis renders once; a proof number wins over badges; two
// buttons at most; the results disclaimer renders exactly when a result figure
// does; the marquee can be paused on the page.

const DISCLAIMER = 'Past results do not guarantee a similar outcome.'
const block = (text: string) => [{_type: 'block', _key: text.slice(0, 4), style: 'normal', markDefs: [], children: [{_type: 'span', _key: 's', text, marks: []}]}]
const image = {asset: {_ref: 'image-abc-800x600-jpg'}, alt: 'The office'}
// Each render is queried through its own container: testing-library's bound
// queries search the whole document, which holds every render in a test.
const mediaImg = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-testid="media-img"]')!
const classTokens = (el: Element) => el.className.split(/\s+/)

function renderSection(data: ContentSectionData, opts: {scale?: 'marketing' | 'interior'; tokens?: Record<string, string>} = {}) {
  return render(<ContentSectionBlock data={data} disclaimer={DISCLAIMER} napTokens={opts.tokens} scale={opts.scale ?? 'marketing'} />)
}

describe('isContentSectionEmpty, per layout', () => {
  it.each([
    ['statement with a heading only', {layout: 'statement', heading: 'Why us'}, false],
    ['statement with no heading', {layout: 'statement', body: block('Body')}, true],
    ['ribbon with a heading', {layout: 'ribbon', heading: 'One line'}, false],
    ['ribbon with no heading', {layout: 'ribbon'}, true],
    ['statRow with one tile', {layout: 'statRow', items: [{_key: 'a', title: '500+'}]}, false],
    ['statRow with blank tiles', {layout: 'statRow', heading: 'Numbers', items: [{_key: 'a', title: ' '}]}, true],
    ['twoColumnText with a heading', {layout: 'twoColumnText', heading: 'Two'}, false],
    ['twoColumnText with nothing', {layout: 'twoColumnText'}, true],
    ['split with body', {layout: 'split', body: block('Body')}, false],
    ['split with media only', {layout: 'split', media: {kind: 'photo', image}}, false],
    ['split with a heading only', {layout: 'split', heading: 'Just a heading'}, true],
    ['no layout at all is a split', {heading: 'x'}, true],
  ] as Array<[string, ContentSectionData, boolean]>)('%s', (_label, data, empty) => {
    expect(isContentSectionEmpty(data)).toBe(empty)
    if (empty) expect(renderSection(data).container.innerHTML).toBe('')
  })
})

describe('the five layouts', () => {
  it('split: media and text in two columns, media on the right by default and on the left when asked', () => {
    const data: ContentSectionData = {layout: 'split', heading: 'About us', body: block('We help.'), media: {kind: 'photo', image}}
    const right = renderSection(data).container
    expect(mediaImg(right).closest('div.md\\:order-last')).not.toBeNull()
    expect(right.querySelector('.md\\:grid-cols-2')).not.toBeNull()
    const left = renderSection({...data, mediaSide: 'left'}).container
    expect(mediaImg(left).closest('div.md\\:order-first')).not.toBeNull()
  })

  it('split with no media renders one text column', () => {
    const {container, queryByTestId} = renderSection({layout: 'split', heading: 'About', body: block('Text.')})
    expect(queryByTestId('media-img')).toBeNull()
    expect(container.querySelector('.md\\:grid-cols-2')).toBeNull()
    expect(container.querySelector('.max-w-3xl h2')).not.toBeNull()
  })

  it('twoColumnText: heading on the left, body and items on the right', () => {
    const {container} = renderSection({layout: 'twoColumnText', heading: 'Two', body: block('Right side.'), items: [{_key: 'i', title: 'Point'}]})
    expect(container.querySelector('.md\\:col-span-5 h2')?.textContent).toBe('Two')
    const right = container.querySelector('.md\\:col-span-7')!
    expect(right.textContent).toContain('Right side.')
    expect(right.querySelector('h3')?.textContent).toBe('Point')
  })

  it('statement: centred at max-w-3xl', () => {
    const {container} = renderSection({layout: 'statement', heading: 'A statement', body: block('Short.')})
    expect(container.querySelector('.mx-auto.max-w-3xl.text-center h2')?.textContent).toBe('A statement')
  })

  it('ribbon: the heading as one line at body size, not a heading element', () => {
    const {container} = renderSection({layout: 'ribbon', heading: 'Serving {{city}} since 1990', headingEmphasis: 'since 1990'}, {tokens: {city: 'Tulsa'}})
    expect(container.querySelector('h1,h2,h3')).toBeNull()
    const line = container.querySelector('p.text-lg')!
    expect(line.innerHTML).toBe('Serving Tulsa <em class="heading-emphasis">since 1990</em>')
  })

  it('statRow: the items as number and caption tiles, with the disclaimer', () => {
    const {container, getByTestId} = renderSection({
      layout: 'statRow',
      heading: 'By the numbers',
      items: [{_key: 'a', title: '$40M', body: 'recovered'}, {_key: 'b', title: '500+', body: 'families'}, {_key: 'c', title: ' ', body: ' '}],
    })
    const tiles = container.querySelectorAll('ul > li')
    expect(tiles).toHaveLength(2)
    expect(tiles[0].textContent).toBe('$40Mrecovered')
    expect(getByTestId('results-disclaimer').textContent).toBe(DISCLAIMER)
  })
})

describe('slots', () => {
  it('renders the heading at the tier the dispatcher passes', () => {
    expect(renderSection({layout: 'statement', heading: 'x'}).container.querySelector('h2')!.className).toBe(HEADING_UNIT_TIER_CLASS.marketing)
    expect(renderSection({layout: 'statement', heading: 'x'}, {scale: 'interior'}).container.querySelector('h2')!.className).toBe(HEADING_UNIT_TIER_CLASS.interior)
  })

  it('emphasises the first occurrence only, with tokens resolved', () => {
    const {container} = renderSection({layout: 'statement', heading: '{{firmName}} for {{firmName}}', headingEmphasis: '{{firmName}}'}, {tokens: {firmName: 'Acme'}})
    expect(container.querySelectorAll('em')).toHaveLength(1)
    expect(container.querySelector('h2')!.innerHTML).toBe('<em class="heading-emphasis">Acme</em> for Acme')
  })

  it('a proof number wins over badges, and renders the disclaimer', () => {
    const {getByTestId, queryAllByTestId} = renderSection({
      layout: 'statement',
      heading: 'Results',
      proof: {number: '$40M', caption: 'recovered'},
      badges: [{src: 'https://cdn.example.com/b.png', alt: 'Award'}],
    })
    expect(getByTestId('proof').textContent).toBe('$40Mrecovered')
    expect(queryAllByTestId('badge-img')).toHaveLength(0)
    expect(getByTestId('results-disclaimer').textContent).toBe(DISCLAIMER)
  })

  it('badges render as a row when there is no proof number, with no disclaimer', () => {
    const {queryAllByTestId, queryByTestId} = renderSection({layout: 'statement', heading: 'Recognised', badges: [{src: 'https://cdn.example.com/b.png', alt: 'Award'}, {src: null}]})
    expect(queryAllByTestId('badge-img')).toHaveLength(1)
    expect(queryByTestId('results-disclaimer')).toBeNull()
  })

  it('renders two buttons at most', () => {
    const buttons = [1, 2, 3].map((n) => ({title: `Button ${n}`, url: `/b${n}/`, variant: 'primary'}))
    const {container} = renderSection({layout: 'statement', heading: 'x', buttons})
    expect(container.querySelectorAll('a[href^="/b"]')).toHaveLength(2)
  })

  it('shows the phone as a tap-to-call link when asked', () => {
    const {container} = renderSection({layout: 'statement', heading: 'Call', showPhone: true}, {tokens: {primaryPhone: '763-280-5100'}})
    const tel = container.querySelector('a[href^="tel:"]')!
    expect(tel.getAttribute('href')).toBe('tel:7632805100')
    expect(tel.textContent).toBe('763-280-5100')
    expect(renderSection({layout: 'statement', heading: 'Call'}, {tokens: {primaryPhone: '763-280-5100'}}).container.querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('renders the pull quote on a split', () => {
    const {container} = renderSection({layout: 'split', body: block('Body.'), pullQuote: {text: 'We answer every call.', attribution: 'The partners'}})
    expect(container.querySelector('blockquote')?.textContent).toBe('We answer every call.')
    expect(container.querySelector('figcaption')?.textContent).toBe('The partners')
  })

  it('renders a video in the media slot', () => {
    const {getByTestId} = renderSection({layout: 'split', body: block('Body.'), media: {kind: 'video', video: {_id: 'v', title: 'Intro', youTubeUrl: 'https://www.youtube.com/watch?v=abc123xyz00'}}})
    expect(getByTestId('video').textContent).toBe('Intro')
  })

  it('applies the image treatment, and a cutout takes only slab', () => {
    const framed = renderSection({layout: 'split', body: block('b'), media: {kind: 'photo', image}, imageTreatment: 'framed'}).container
    expect(mediaImg(framed).parentElement!.className).toBe(TREATMENT_CLASSES.framed.wrapper)
    const cutoutFramed = renderSection({layout: 'split', body: block('b'), media: {kind: 'cutout', image}, imageTreatment: 'framed'}).container
    expect(mediaImg(cutoutFramed).parentElement!.className).toBe(TREATMENT_CLASSES.plain.wrapper)
    expect(classTokens(mediaImg(cutoutFramed))).toContain('object-contain')
    const cutoutSlab = renderSection({layout: 'split', body: block('b'), media: {kind: 'cutout', image}, imageTreatment: 'slab'}).container
    expect(mediaImg(cutoutSlab).parentElement!.className).toBe(TREATMENT_CLASSES.slab.wrapper)
    const inherit = renderSection({layout: 'split', body: block('b'), media: {kind: 'photo', image}, imageTreatment: 'inherit'}).container
    expect(mediaImg(inherit).parentElement!.className).toBe(TREATMENT_CLASSES.plain.wrapper)
  })
})

describe('the results disclaimer renders exactly when a result figure does', () => {
  it.each([
    ['a proof number on a split', {layout: 'split', body: block('b'), proof: {number: '$1M'}}, true],
    ['a proof number on twoColumnText', {layout: 'twoColumnText', heading: 'h', proof: {number: '$1M'}}, true],
    ['a blank proof number', {layout: 'statement', heading: 'h', proof: {number: '  ', caption: 'c'}}, false],
    ['a proof number stored on a ribbon, which renders none', {layout: 'ribbon', heading: 'h', proof: {number: '$1M'}}, false],
    ['a stat row with a tile', {layout: 'statRow', items: [{_key: 'a', body: 'years'}]}, true],
    ['items on a split, which are not tiles', {layout: 'split', items: [{_key: 'a', title: '24/7'}]}, false],
  ] as Array<[string, ContentSectionData, boolean]>)('%s', (_label, data, expected) => {
    expect(rendersResultClaim(data)).toBe(expected)
    expect(renderSection(data).queryByTestId('results-disclaimer') !== null).toBe(expected)
  })
})

describe('the results-disclaimer cases shared with the homepage composer', () => {
  // The monorepo's composer gates read the same rule in Python
  // (BE/_shared/homepage_member_table.py). Each repo asserts its own side against
  // its own copy of this case file; the monorepo compares the two copies.
  it.each(resultClaimCases.cases.map((c) => [JSON.stringify(c.data), c.data, c.claims] as const))(
    '%s', (_label, data, claims) => {
      expect(rendersResultClaim(data as ContentSectionData)).toBe(claims)
    },
  )

  it('holds all eighteen cases', () => {
    expect(resultClaimCases.cases).toHaveLength(18)
  })
})

describe('the marquee ribbon can be paused on the page (WCAG 2.2.2)', () => {
  const marquee: ContentSectionData = {layout: 'ribbon', heading: 'Serving the county since 1990', marquee: true}

  it('has a visible toggle that pauses the track', () => {
    const {getByRole, getByTestId} = renderSection(marquee)
    const button = getByRole('button', {name: 'Pause'})
    expect(button.getAttribute('aria-pressed')).toBe('false')
    // The bare token, not the hover and focus variants that also contain it.
    expect(classTokens(getByTestId('marquee-track'))).not.toContain('[animation-play-state:paused]')
    fireEvent.click(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(classTokens(getByTestId('marquee-track'))).toContain('[animation-play-state:paused]')
  })

  it('pauses on hover and focus, and stops for reduced motion', () => {
    const track = renderSection(marquee).getByTestId('marquee-track')
    expect(classTokens(track)).toEqual(expect.arrayContaining([
      'group-hover:[animation-play-state:paused]',
      'group-focus-within:[animation-play-state:paused]',
      'motion-reduce:animate-none',
    ]))
  })

  it('reads once: every duplicate copy is aria-hidden and hidden under reduced motion', () => {
    const {getByTestId} = renderSection(marquee)
    const copies = Array.from(getByTestId('marquee-track').children)
    expect(copies).toHaveLength(4)
    expect(copies.filter((c) => c.getAttribute('aria-hidden') === 'true')).toHaveLength(3)
    expect(copies[0].hasAttribute('aria-hidden')).toBe(false)
    for (const copy of copies.slice(1)) expect(classTokens(copy)).toContain('motion-reduce:hidden')
  })
})
