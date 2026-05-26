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
  image: {src: '/cta-bg.jpg', alt: 'Office', width: 1920, height: 1080},
}

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
    expect(img.getAttribute('src')).toBe('/cta-bg.jpg')
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
