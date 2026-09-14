import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// ─── The homepage canvas, rendered on the shape a live client stores ──────────
//
// A golden of the markup `HomepageCanvas` produces for the fixture client's
// canvas (Yanowitz, the v1 plan's scratch fixture, [R-198]), captured through
// `HOME_QUERY`'s own `CANVAS_FRAGMENT` against the public dataset on 2026-09-14,
// before any Phase 10 code landed (WS-V1-PHASE10-DESIGN §7, ADV-P10B). Three
// members: differentiatorBlock, siloNavBlock (allTopLevel, seven areas),
// attorneyHighlightBlock (all, four attorneys, no photos).
//
// WHAT IT PINS. Phase 10 expands `homePage.canvas` with the inline section types
// and keeps the six old block types rendering through their old components for
// one pin (expand, then contract). This file is the fidelity check for that
// claim: same DOM and same class lists under unchanged CSS is the same page.
// Verify cannot see a band (it reads H1s, <main>, placeholders, NAP and nav
// text), so "the served homepage is unchanged" is a claim only this test holds.
//
// WHEN IT CHANGES ON PURPOSE. Phase 12 migrates the fixture's members to the
// inline types and the diff this snapshot produces is the reviewed artifact, in
// the PR, before propagation. Update with `vitest -u` and say why in the commit.
// If a later phase changes `globals.css`, this no longer proves pixels; say so
// here.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, className}) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} className={className} />
  )),
}))
// Structure only: the real primitive animates below the fold, which jsdom cannot
// show. The marker keeps the first-band rule visible in the golden.
vi.mock('@/components/ui/ScrollReveal', () => ({
  ScrollReveal: ({children}: {children: React.ReactNode}) => (
    <div data-testid="scroll-reveal">{children}</div>
  ),
}))

import {HomepageCanvas, type HomepageBlock} from '../HomepageCanvas'
import canvas from './fixtures/yanowitz-canvas.json'

describe('HomepageCanvas on the fixture client’s stored canvas', () => {
  it('renders the golden markup', async () => {
    const {container} = render(
      <HomepageCanvas blocks={canvas as unknown as HomepageBlock[]} />,
    )
    // Three bands, the first without ScrollReveal.
    expect(container.querySelectorAll('section')).toHaveLength(3)
    expect(container.querySelectorAll('[data-testid="scroll-reveal"]')).toHaveLength(2)
    await expect(container.innerHTML).toMatchFileSnapshot('./__snapshots__/yanowitz-canvas.html')
  })
})
