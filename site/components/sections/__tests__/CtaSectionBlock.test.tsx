import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// Same multi-child mocking posture as InternalHero.test.tsx: passthrough
// next/image + ButtonGroup so layout + className assertions exercise the
// real CtaSectionBlock branching (centered / split / background / textOnly)
// without coupling to the optimization layer.

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, fill, className}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="cta-bg"
      src={src}
      alt={alt ?? ''}
      data-fill={fill ? 'true' : 'false'}
      className={className}
    />
  )),
}))

vi.mock('@/components/ui/ButtonGroup', () => ({
  ButtonGroup: vi.fn(({items, align, context, className}) => (
    <div
      data-testid="button-group"
      data-align={align ?? ''}
      data-context={context ?? ''}
      data-classname={className ?? ''}
      data-item-count={items?.length ?? 0}
    />
  )),
  toCtaItems: vi.fn((buttons) => buttons),
}))

import {CtaSectionBlock, type CtaSectionBlockData} from '../CtaSectionBlock'

const BACKGROUND_DATA: CtaSectionBlockData = {
  _type: 'ctaSection',
  layout: 'background',
  heading: 'Talk to an attorney today',
  description: 'Schedule a consultation.',
  buttons: [{title: 'Contact us', url: '/contact', variant: 'primary'}],
  image: {asset: {_ref: 'image-test-200x200-jpg', _type: 'reference'}, alt: 'Office'},
}

const TEXT_ONLY_DATA: CtaSectionBlockData = {
  _type: 'ctaSection',
  layout: 'textOnly',
  tagline: 'Schedule a consultation',
  heading: 'Talk with an attorney',
  description: 'A 30-minute conversation about your goals.',
  buttons: [{title: 'Contact us', url: '/contact', variant: 'primary'}],
}

// ─── TextOnlyCta — SectionHeader consumption with noTrailingGap ───────────────
//
// TextOnlyCta splits the header across grid columns: tagline + h2 LEFT,
// description + buttons RIGHT, under `md:grid-cols-2 md:items-center`. It was
// hand-rolled for exactly that reason — the canonical `mb-5` would have become
// left-column height and shifted the row's vertical centering. It now consumes
// the primitive and opts out of the gap by name. See
// `skill-component-patterns → SectionHeader` and BI/OUTSTANDING.md item 16.

describe('CtaSectionBlock — TextOnlyCta header', () => {
  it('renders the header through SectionHeader (Tagline primitive, not a hand-rolled span)', () => {
    const {container} = render(<CtaSectionBlock data={TEXT_ONLY_DATA} />)
    const tagline = container.querySelector('.tagline') as HTMLElement
    expect(tagline).not.toBeNull()
    expect(tagline.tagName).toBe('P')
    expect(tagline.textContent).toBe('Schedule a consultation')
  })

  it('renders the h2 at the lg tier with NO trailing margin', () => {
    const {container} = render(<CtaSectionBlock data={TEXT_ONLY_DATA} />)
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.textContent).toBe('Talk with an attorney')
    expect(h2.className).toBe('text-3xl font-bold text-foreground md:text-4xl lg:text-5xl')
    expect(h2.className).not.toContain('mb-')
  })

  it('keeps the description and buttons in the right column, outside the header', () => {
    const {container, getByTestId} = render(<CtaSectionBlock data={TEXT_ONLY_DATA} />)
    const grid = container.querySelector('.container') as HTMLElement
    expect(grid.className).toContain('md:items-center')
    // Two grid children: the SectionHeader wrapper, then the description column.
    expect(grid.children.length).toBe(2)
    expect(grid.children[0].querySelector('h2')).not.toBeNull()
    expect(grid.children[1].querySelector('h2')).toBeNull()
    const desc = grid.children[1].querySelector('p') as HTMLElement
    expect(desc.textContent).toBe('A 30-minute conversation about your goals.')
    expect(grid.children[1].contains(getByTestId('button-group'))).toBe(true)
  })

  it('is the layout fallback when layout is absent or unrecognized', () => {
    const {container} = render(
      <CtaSectionBlock data={{...TEXT_ONLY_DATA, layout: null}} />,
    )
    const h2 = container.querySelector('h2') as HTMLElement
    expect(h2.className).not.toContain('mb-')
  })
})

// ─── BackgroundCta scrim — the canonical image-scrim composition ──────────────
//
// BackgroundCta is the platform's second image+scrim composition (alongside
// InternalHero). The scrim opacity is locked to the canonical image-scrim
// value `bg-brand-dark/80` — same value asserted on InternalHero's overlay
// at __tests__/InternalHero.test.tsx so both sites stay in lock-step. See
// `skill-color-system → Pattern 2 — Static opacity overlays` for the
// composition-aware doctrine (image-scrim /80 vs modal /40 vs hover-wash /8).

describe('CtaSectionBlock — BackgroundCta scrim composition', () => {
  it('renders the <Image> background when image.src is present', () => {
    const {getByTestId} = render(<CtaSectionBlock data={BACKGROUND_DATA} />)
    const img = getByTestId('cta-bg') as HTMLImageElement
    expect(img.getAttribute('src')).toContain('cdn.sanity.io')
    expect(img.getAttribute('data-fill')).toBe('true')
  })

  it('renders the canonical image scrim overlay at bg-brand-dark/80', () => {
    const {container} = render(<CtaSectionBlock data={BACKGROUND_DATA} />)
    const overlay = container.querySelector('.bg-brand-dark\\/80') as HTMLElement
    expect(overlay).not.toBeNull()
    expect(overlay.getAttribute('aria-hidden')).toBe('true')
    expect(overlay.className).toContain('absolute')
    expect(overlay.className).toContain('inset-0')
  })

  it('omits the <Image> + overlay when image is null', () => {
    const {queryByTestId, container} = render(
      <CtaSectionBlock data={{...BACKGROUND_DATA, image: null}} />,
    )
    expect(queryByTestId('cta-bg')).toBeNull()
    expect(container.querySelector('.bg-brand-dark\\/80')).toBeNull()
  })

  it('carries data-ring-context="dark" on the <section> regardless of image presence', () => {
    const {container: withImg} = render(<CtaSectionBlock data={BACKGROUND_DATA} />)
    const {container: noImg} = render(
      <CtaSectionBlock data={{...BACKGROUND_DATA, image: null}} />,
    )
    expect((withImg.firstChild as HTMLElement).getAttribute('data-ring-context')).toBe('dark')
    expect((noImg.firstChild as HTMLElement).getAttribute('data-ring-context')).toBe('dark')
  })
})
