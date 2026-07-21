import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, className}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="badge-img" src={src} alt={alt ?? ''} className={className} />
  )),
}))

import {BadgesBlock, type BadgeImage, type BadgesBlockData} from '../BadgesBlock'

const badge = (n: number): BadgeImage => ({
  src: `https://cdn.example.com/badge-${n}.png`,
  alt: `Badge ${n}`,
  width: 400,
  height: 400,
})

const badgesBlock = (key: string, badges: BadgeImage[] = [badge(1), badge(2)]): BadgesBlockData => ({
  _type: 'badgesBlock',
  _key: key,
  heading: 'Recognised by our peers',
  description: 'A short description.',
  badges,
})

describe('BadgesBlock', () => {
  it('renders the heading at the MARKETING scale, not the interior section scale', () => {
    // Regression guard for a real mistake made while building this block: the
    // first draft routed the heading through <SectionHeader>, which maps to the
    // interior 3-tier rhythm and never emits the marketing scale. That would
    // make designSettings.marketingScale silently do nothing on the homepage.
    const {container} = render(<BadgesBlock data={badgesBlock('a')} />)
    const h2 = container.querySelector('h2')
    expect(h2?.className).toContain('marketing-h2')
    expect(h2?.className).not.toMatch(/\btext-3xl\b/)
  })

  it('renders one image per badge, with alt text carried through', () => {
    const {getAllByTestId} = render(<BadgesBlock data={badgesBlock('a')} />)
    const imgs = getAllByTestId('badge-img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0].getAttribute('alt')).toBe('Badge 1')
  })

  it('renders NOTHING when every badge lacks an image, rather than a heading over a void', () => {
    const {container} = render(
      <BadgesBlock data={badgesBlock('a', [{src: null, alt: null, width: null, height: null}])} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when the badge list is empty', () => {
    const {container} = render(<BadgesBlock data={badgesBlock('a', [])} />)
    expect(container.innerHTML).toBe('')
  })
})
