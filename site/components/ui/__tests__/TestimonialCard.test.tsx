import {describe, it, expect, vi} from 'vitest'
import {render, screen} from '@testing-library/react'

// Multi-child composition pattern: independently mock each composed primitive
// to capture the props TestimonialCard forwards to it. StarRating and next/
// image are not the contract under test — TestimonialCard's *forwarding* and
// *conditional rendering* are.
//
// StarRating mock encodes the props it receives in data-* attributes so the
// test can assert what TestimonialCard passed without rendering the real
// child component. Same shape as next/link mock from Button.test.tsx.

vi.mock('@/components/ui/StarRating', () => ({
  StarRating: vi.fn(({count, size}) => (
    <div data-testid="stars" data-count={count} data-size={size} />
  )),
}))

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, width, height, className}) => (
    // The mock returns a plain <img>; the real next/image is exactly what we're
    // isolating away from this test, so the lint rule's recommendation doesn't apply.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="avatar"
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  )),
}))

import {TestimonialCard} from '../TestimonialCard'
import type {TestimonialData} from '../TestimonialCard'

const BASE: TestimonialCard_Data = {
  _id: 't1',
  quote: 'Excellent service throughout my case.',
  name: 'Jane Doe',
}
type TestimonialCard_Data = TestimonialData  // alias for clarity inside the file

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('TestimonialCard — render shape', () => {
  it('renders an <article> as the root', () => {
    const {container} = render(<TestimonialCard t={BASE} />)
    const root = container.firstChild as HTMLElement
    expect(root.tagName).toBe('ARTICLE')
  })

  it('wraps the quote text in a <blockquote> > <p>', () => {
    const {container} = render(<TestimonialCard t={BASE} />)
    const blockquote = container.querySelector('blockquote')
    expect(blockquote).not.toBeNull()
    const p = blockquote?.querySelector('p')
    expect(p?.textContent).toBe('Excellent service throughout my case.')
  })

  it('renders the byline (name) inside a <footer>', () => {
    const {container} = render(<TestimonialCard t={BASE} />)
    const footer = container.querySelector('footer')
    expect(footer).not.toBeNull()
    expect(footer?.textContent).toContain('Jane Doe')
  })
})

// ─── Composition — StarRating (conditional + prop forwarding) ─────────────────
//
// Locked pattern for child-primitive composition: mock the child to capture
// its props as data-* attributes, then assert against those attributes
// instead of rendering the real implementation. Isolates TestimonialCard's
// forwarding contract from StarRating's rendering contract (each owns its
// own test file).

describe('TestimonialCard — StarRating composition', () => {
  it('renders <StarRating> when numberOfStars is a positive number', () => {
    render(<TestimonialCard t={{...BASE, numberOfStars: 5}} />)
    expect(screen.getByTestId('stars')).not.toBeNull()
  })

  it('forwards numberOfStars as count and hardcodes size="sm"', () => {
    render(<TestimonialCard t={{...BASE, numberOfStars: 4}} />)
    const stars = screen.getByTestId('stars')
    expect(stars.getAttribute('data-count')).toBe('4')
    expect(stars.getAttribute('data-size')).toBe('sm')
  })

  it('omits <StarRating> when numberOfStars is null', () => {
    render(<TestimonialCard t={{...BASE, numberOfStars: null}} />)
    expect(screen.queryByTestId('stars')).toBeNull()
  })

  it('omits <StarRating> when numberOfStars is 0 (falsy guard)', () => {
    render(<TestimonialCard t={{...BASE, numberOfStars: 0}} />)
    expect(screen.queryByTestId('stars')).toBeNull()
  })

  it('omits <StarRating> when numberOfStars is undefined', () => {
    render(<TestimonialCard t={BASE} />)
    expect(screen.queryByTestId('stars')).toBeNull()
  })
})

// ─── Composition — avatar (conditional + alt fallback) ────────────────────────

describe('TestimonialCard — avatar composition', () => {
  it('renders <Image> when avatar.src is present', () => {
    render(
      <TestimonialCard
        t={{...BASE, avatar: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}, alt: 'Jane portrait'}}}
      />,
    )
    const img = screen.getByTestId('avatar') as HTMLImageElement
    expect(img.getAttribute('src')).toContain('cdn.sanity.io')
  })

  it('uses avatar.alt when provided', () => {
    render(
      <TestimonialCard
        t={{...BASE, avatar: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}, alt: 'Jane portrait'}}}
      />,
    )
    expect(screen.getByTestId('avatar').getAttribute('alt')).toBe('Jane portrait')
  })

  it('falls back to t.name as alt when avatar.alt is missing', () => {
    render(
      <TestimonialCard t={{...BASE, avatar: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}}}} />,
    )
    expect(screen.getByTestId('avatar').getAttribute('alt')).toBe('Jane Doe')
  })

  it('forwards 80×80 (2× of the 40px display) dimensions to <Image>', () => {
    render(<TestimonialCard t={{...BASE, avatar: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}}}} />)
    const img = screen.getByTestId('avatar')
    expect(img.getAttribute('width')).toBe('80')
    expect(img.getAttribute('height')).toBe('80')
  })

  it('omits <Image> when avatar is null', () => {
    render(<TestimonialCard t={{...BASE, avatar: null}} />)
    expect(screen.queryByTestId('avatar')).toBeNull()
  })

  it('omits <Image> when avatar.src is missing (defensive)', () => {
    render(<TestimonialCard t={{...BASE, avatar: null}} />)
    expect(screen.queryByTestId('avatar')).toBeNull()
  })
})

// ─── Conditional caseType ─────────────────────────────────────────────────────

describe('TestimonialCard — caseType', () => {
  it('renders caseType below the name when provided', () => {
    const {container} = render(
      <TestimonialCard t={{...BASE, caseType: 'Family Law'}} />,
    )
    const footer = container.querySelector('footer') as HTMLElement
    expect(footer.textContent).toContain('Family Law')
  })

  it('omits caseType when null', () => {
    const {container} = render(<TestimonialCard t={{...BASE, caseType: null}} />)
    const footer = container.querySelector('footer') as HTMLElement
    // Only the name <p> renders, no second <p> for caseType.
    expect(footer.querySelectorAll('p').length).toBe(1)
  })
})

// ─── Cascade-aware contract ───────────────────────────────────────────────────

describe('TestimonialCard — cascade-aware contract', () => {
  it('uses cascade-aware tokens for chrome and text', () => {
    const {container} = render(
      <TestimonialCard t={{...BASE, caseType: 'Family Law'}} />,
    )
    const article = container.firstChild as HTMLElement
    expect(article.className).toContain('border-border')
    expect(article.className).toContain('bg-background')
    const quote = container.querySelector('blockquote p') as HTMLElement
    expect(quote.className).toContain('text-foreground-muted')
    const footer = container.querySelector('footer') as HTMLElement
    const name = footer.querySelector('p:first-child') as HTMLElement
    expect(name.className).toContain('text-foreground')
  })

  it('does not emit anchored aliases or hex literals', () => {
    const {container} = render(
      <TestimonialCard
        t={{
          ...BASE,
          numberOfStars: 5,
          caseType: 'Family Law',
          avatar: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}, alt: 'a'},
        }}
      />,
    )
    const html = (container.firstChild as HTMLElement).outerHTML
    expect(html).not.toMatch(/\btext-foreground-on-light\b/)
    expect(html).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
