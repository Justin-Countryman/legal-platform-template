import {describe, expect, it, vi} from 'vitest'
import {fireEvent, render} from '@testing-library/react'

vi.mock('next/image', () => ({
  default: ({src, alt, className, 'aria-hidden': ariaHidden}: {src: string; alt: string; className?: string; 'aria-hidden'?: boolean}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} aria-hidden={ariaHidden} />
  ),
}))

import {BadgesSectionBlock} from '../BadgesSectionBlock'

// ─── The scrolling layout honours its fields (Phase 16A) ──────────────────────
// Found in the block catalog on 2026-09-18: the scrolling marquee painted its own
// `<section>`, so its Surface field did nothing (Dark rendered white) and its
// Buttons never rendered. It now sits on `SectionShell` like the other three.

const badges = [{src: 'https://cdn.example/a.png', alt: 'Award A', width: 300, height: 300}]
const buttons = [{_key: 'b', title: 'About the firm', url: '/about/', variant: 'primary'}]

describe('BadgesSectionBlock, scrolling', () => {
  it('takes the Surface it is given', () => {
    const {container} = render(
      <BadgesSectionBlock data={{layout: 'scrolling', heading: 'Awards', badges, appearance: {surface: 'dark'}} as never} />,
    )
    expect(container.querySelector('section')!.className.split(' ')).toContain('bg-brand-dark')
  })

  it('renders its buttons', () => {
    const {getByRole} = render(<BadgesSectionBlock data={{layout: 'scrolling', heading: 'Awards', badges, buttons} as never} />)
    expect(getByRole('link', {name: /About the firm/})).not.toBeNull()
  })

  it('still renders nothing with no badges', () => {
    const {container} = render(<BadgesSectionBlock data={{layout: 'scrolling', heading: 'Awards', badges: []} as never} />)
    expect(container.innerHTML).toBe('')
  })
})

// ─── The moving row meets WCAG 2.2.2 (monorepo [R-617], 2026-10-01) ──────────
// Pause, Stop, Hide (level A): a row that moves by itself for more than five
// seconds beside other content needs a control that pauses it; pausing only while
// hovered is not one (W3C, Understanding SC 2.2.2). The row followed the text
// marquee's other rules too late: hover only, no control, no reduced-motion
// fallback, a 30-second lap. It now takes the text marquee's contract.

const many = [
  {src: 'https://cdn.example/a.png', alt: 'Award A', width: 300, height: 300},
  {src: 'https://cdn.example/b.png', alt: 'Award B', width: 300, height: 300},
]

describe('BadgesSectionBlock, scrolling, WCAG 2.2.2', () => {
  it('has a visible Pause control that pauses the row', () => {
    const {getByRole, getByTestId} = render(<BadgesSectionBlock data={{layout: 'scrolling', heading: 'Awards', badges: many} as never} />)
    const pause = getByRole('button', {name: 'Pause'})
    expect(pause.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(pause)
    expect(pause.getAttribute('aria-pressed')).toBe('true')
    expect(getByTestId('marquee-track').className).toContain('[animation-play-state:paused]')
  })

  it('pauses while hovered or holding focus, and moves slowly (a 60-second lap)', () => {
    const {getByTestId} = render(<BadgesSectionBlock data={{layout: 'scrolling', heading: 'Awards', badges: many} as never} />)
    const track = getByTestId('marquee-track').className
    expect(track).toContain('group-hover:[animation-play-state:paused]')
    expect(track).toContain('group-focus-within:[animation-play-state:paused]')
    expect(track).toContain('60s')
  })

  it('stands still under reduced motion: one set of badges, wrapped, the copies hidden', () => {
    const {getByTestId, container} = render(<BadgesSectionBlock data={{layout: 'scrolling', heading: 'Awards', badges: many} as never} />)
    expect(getByTestId('marquee-track').className).toContain('motion-reduce:animate-none')
    const imgs = [...container.querySelectorAll('img')]
    expect(imgs.length).toBe(many.length * 4)
    imgs.forEach((img, i) => {
      const hidden = img.className.split(' ').includes('motion-reduce:hidden')
      expect(hidden, `badge ${i}`).toBe(i >= many.length)
      expect(img.getAttribute('aria-hidden') === 'true', `badge ${i}`).toBe(i >= many.length)
    })
  })
})
