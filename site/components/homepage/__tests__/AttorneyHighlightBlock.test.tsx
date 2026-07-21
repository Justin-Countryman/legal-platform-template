import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="attorney-photo" src={src} alt={alt ?? ''} />
  )),
}))

import {
  AttorneyHighlightBlock,
  attorneyGridForCount,
  type AttorneyCard,
  type AttorneyHighlightBlockData,
} from '../AttorneyHighlightBlock'

const attorney = (n: number, over: Partial<AttorneyCard> = {}): AttorneyCard => ({
  _id: `a${n}`,
  name: `Attorney ${n}`,
  jobTitle: 'Partner',
  href: `/attorneys/attorney-${n}`,
  photo: {src: `https://cdn.example.com/a${n}.jpg`, alt: `Attorney ${n}`, width: 600, height: 750},
  ...over,
})

const block = (
  attorneys: AttorneyCard[] = [attorney(1), attorney(2), attorney(3)],
  rest: Partial<AttorneyHighlightBlockData> = {},
): AttorneyHighlightBlockData => ({
  _type: 'attorneyHighlightBlock',
  _key: 'a',
  heading: 'Meet the attorneys',
  mode: 'all',
  attorneys,
  ...rest,
})

describe('AttorneyHighlightBlock', () => {
  it('renders the heading at the MARKETING scale, not the interior section scale', () => {
    const {container} = render(<AttorneyHighlightBlock data={block()} />)
    const h2 = container.querySelector('h2')
    expect(h2?.className).toContain('marketing-h2')
    expect(h2?.className).not.toMatch(/\btext-3xl\b/)
  })

  it('links every card to the full attorney profile', () => {
    // Beat 6: each card links to the full attorney page.
    const {getAllByRole} = render(<AttorneyHighlightBlock data={block()} />)
    const links = getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links[0].getAttribute('href')).toBe('/attorneys/attorney-1')
  })

  it('drops an attorney with no name or no link rather than rendering a dead card', () => {
    const {getAllByRole} = render(
      <AttorneyHighlightBlock
        data={block([attorney(1), attorney(2, {name: null}), attorney(3, {href: null})])}
      />,
    )
    expect(getAllByRole('listitem')).toHaveLength(1)
  })
})

describe('AttorneyHighlightBlock — real headshots only', () => {
  // Beat 6 forbids stock photography for attorneys. A schema cannot enforce it,
  // so a missing headshot must look like a gap rather than a design choice: no
  // silhouette, no generic avatar, no placeholder that could be mistaken for
  // one.
  it('renders a card with no image at all when the attorney has no photo', () => {
    const {queryAllByTestId, getAllByRole, getByText} = render(
      <AttorneyHighlightBlock data={block([attorney(1, {photo: null})])} />,
    )
    expect(queryAllByTestId('attorney-photo')).toHaveLength(0)
    expect(getAllByRole('listitem')).toHaveLength(1)
    expect(getByText('Attorney 1')).not.toBeNull()
  })

  it('falls back to the attorney name for alt text when the photo has none', () => {
    const {getAllByTestId} = render(
      <AttorneyHighlightBlock
        data={block([attorney(1, {photo: {src: 'https://cdn.example.com/x.jpg', alt: null}})])}
      />,
    )
    expect(getAllByTestId('attorney-photo')[0].getAttribute('alt')).toBe('Attorney 1')
  })
})

describe('AttorneyHighlightBlock — layout by firm size', () => {
  // Beat 6: solo is a single hero card, a small firm shows all attorneys,
  // larger firms wrap. The field-test corollary: the operator chooses who
  // appears, the rendering absorbs the layout consequence.
  it('gives a solo attorney a single wide card, not a lonely column', () => {
    expect(attorneyGridForCount(1)).toContain('max-w-md')
    expect(attorneyGridForCount(1)).not.toContain('lg:grid-cols-3')
  })

  it('splits two evenly', () => {
    expect(attorneyGridForCount(2)).toContain('sm:grid-cols-2')
  })

  it('wraps three or more', () => {
    expect(attorneyGridForCount(3)).toContain('lg:grid-cols-3')
    expect(attorneyGridForCount(12)).toContain('lg:grid-cols-3')
  })

  it('degrades at every count, since nothing bounds the attorney list', () => {
    for (const n of [0, 1, 2, 5, 30]) {
      expect(typeof attorneyGridForCount(n)).toBe('string')
      expect(attorneyGridForCount(n).length).toBeGreaterThan(0)
    }
  })
})

describe('AttorneyHighlightBlock — empty renders nothing', () => {
  it('renders nothing when no attorney resolves', () => {
    const {container} = render(<AttorneyHighlightBlock data={block([])} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing even when a heading is set but no attorney resolves', () => {
    // Unlike Narrative, there is no half-authored state worth showing here: the
    // block IS the people. A heading over no faces is the void the rule names.
    const {container} = render(
      <AttorneyHighlightBlock data={block([], {heading: 'Meet the attorneys'})} />,
    )
    expect(container.innerHTML).toBe('')
  })
})
