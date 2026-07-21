import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, className}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="narrative-img" src={src} alt={alt ?? ''} className={className} />
  )),
}))

import {NarrativeBlock, type NarrativeBlockData} from '../NarrativeBlock'

const para = (text: string) => ({
  _type: 'block',
  _key: `b-${text.slice(0, 4)}`,
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 's1', text, marks: []}],
})

const block = (rest: Partial<NarrativeBlockData> = {}): NarrativeBlockData => ({
  _type: 'narrativeBlock',
  _key: 'a',
  heading: 'Sixty years in one community',
  body: [para('We have practised here a long time.')],
  ...rest,
})

describe('NarrativeBlock', () => {
  it('renders the heading at the MARKETING scale, not the interior section scale', () => {
    const {container} = render(<NarrativeBlock data={block()} />)
    const h2 = container.querySelector('h2')
    expect(h2?.className).toContain('marketing-h2')
    expect(h2?.className).not.toMatch(/\btext-3xl\b/)
  })

  it('renders prose paragraphs through BlockProse', () => {
    const {getByText} = render(<NarrativeBlock data={block()} />)
    expect(getByText('We have practised here a long time.').tagName).toBe('P')
  })

  it('renders NO heading elements from the body, whatever the body contains', () => {
    // The schema forbids heading styles, and this is the guard that the
    // rendering does not reintroduce them. A block owns the only h2 in its
    // section; a second one is the heading-cascade defect BI-Library rule 2
    // names, reached through the Portable Text renderer.
    const {container} = render(
      <NarrativeBlock data={block({body: [para('One.'), para('Two.')]})} />,
    )
    expect(container.querySelectorAll('h2')).toHaveLength(1) // the block's own
    expect(container.querySelectorAll('h3, h4, h5, h6')).toHaveLength(0)
  })
})

describe('NarrativeBlock — one block, two uses', () => {
  // The practice-area narrative is a variant, not a second block. The only
  // structural difference is internalLinks, and the RENDERING absorbs it.
  it('draws no link row on a guide/about narrative', () => {
    const {container} = render(<NarrativeBlock data={block()} />)
    expect(container.querySelector('ul')).toBeNull()
  })

  it('grows a link row when practice-area links are present', () => {
    const {getAllByRole} = render(
      <NarrativeBlock
        data={block({
          internalLinks: [
            {_key: 'l1', href: '/personal-injury/', anchorText: 'personal injury claims'},
            {_key: 'l2', href: '/family-law/', anchorText: 'family law matters'},
          ],
        })}
      />,
    )
    const links = getAllByRole('link')
    expect(links).toHaveLength(2)
    // The anchor text is the SEO-bearing part and must be what renders.
    expect(links[0].textContent).toBe('personal injury claims')
    // GROQ emits a trailing slash, matching the platform's existing
    // practiceAreaNav href fragment. <Link> normalizes it away because the site
    // runs `trailingSlash: false`, so the rendered href is slashless and no 308
    // hop occurs. Asserted on what actually renders, not on what GROQ produced.
    expect(links[0].getAttribute('href')).toBe('/personal-injury')
  })

  it('drops a link whose reference resolved to no href', () => {
    const {queryAllByRole} = render(
      <NarrativeBlock
        data={block({internalLinks: [{_key: 'l1', href: null, anchorText: 'orphaned'}]})}
      />,
    )
    expect(queryAllByRole('link')).toHaveLength(0)
  })
})

describe('NarrativeBlock — optional fields and empty states', () => {
  it('renders the image only when one is present', () => {
    expect(render(<NarrativeBlock data={block()} />).queryAllByTestId('narrative-img')).toHaveLength(0)
    const withImage = render(
      <NarrativeBlock data={block({image: {src: 'https://cdn.example.com/a.jpg', alt: 'Office', width: 800, height: 600}})} />,
    )
    expect(withImage.getAllByTestId('narrative-img')[0].getAttribute('alt')).toBe('Office')
  })

  it('renders the CTA only when it has both a label and a url', () => {
    const noUrl = render(<NarrativeBlock data={block({ctaButton: {title: 'About us', url: null}})} />)
    expect(noUrl.queryByText('About us')).toBeNull()
    const full = render(<NarrativeBlock data={block({ctaButton: {title: 'About us', url: '/about/'}})} />)
    expect(full.getByText('About us')).not.toBeNull()
  })

  it('renders nothing when there is no heading, no body and no image', () => {
    const {container} = render(<NarrativeBlock data={block({heading: null, body: []})} />)
    expect(container.innerHTML).toBe('')
  })
})
