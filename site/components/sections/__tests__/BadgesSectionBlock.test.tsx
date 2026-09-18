import {describe, expect, it, vi} from 'vitest'
import {render} from '@testing-library/react'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt}: {src: string; alt: string}) => <img src={src} alt={alt} />,
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
