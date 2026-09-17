import {describe, it, expect, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// ─── The homepage canvas, rendered on the shape a live client stores ──────────
//
// A golden of the markup `HomepageCanvas` produces for a migrated canvas: the
// three homepage members the canvas migration wrote on the fixture client
// (`practiceAreaNavInline` all top-level areas, `contentSectionInline` a
// two-column list, `attorneySectionInline` all attorneys, no photos), in their
// stored order, projected through `HOME_QUERY`'s own `CANVAS_FRAGMENT` under
// groq-js over that dataset's published documents on 2026-09-17. Names, slugs
// and places are replaced with invented ones, because the template carries no
// firm identity ([R-198]); the structure and every class are the projection's.
//
// WHAT IT PINS. Verify cannot see a band (it reads H1s, <main>, placeholders,
// NAP and nav text), so "the served homepage is unchanged" is a claim only this
// test holds. Until Phase 15 it pinned the six retired block components on the
// canvas as captured before Phase 10; Phase 15 deleted them and re-projected the
// fixture through the section components (WS-V1-PHASE15-DESIGN §7 amendment 3).
//
// WHEN IT CHANGES ON PURPOSE. Update with `vitest -u` and say why in the commit.
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
import canvas from './fixtures/migrated-canvas.json'

describe('HomepageCanvas on a migrated stored canvas', () => {
  it('renders the golden markup', async () => {
    const {container} = render(
      <HomepageCanvas blocks={canvas as unknown as HomepageBlock[]} />,
    )
    // Three bands, the first without ScrollReveal.
    expect(container.querySelectorAll('section')).toHaveLength(3)
    expect(container.querySelectorAll('[data-testid="scroll-reveal"]')).toHaveLength(2)
    await expect(container.innerHTML).toMatchFileSnapshot('./__snapshots__/migrated-canvas.html')
  })
})
