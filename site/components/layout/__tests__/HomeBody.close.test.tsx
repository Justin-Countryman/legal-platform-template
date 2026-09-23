import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

// ─── The close takes the theme's ground (Phase 17B, record §2.3 step 6) ───────
//
// `HomepageCta` is a bookend with a code default of `muted`; the theme now says what
// it paints (`dark.close`). Under the platform default (Quiet) that is dark, which is
// the one thing the default theme changes on a fresh canvas; under the compat bridge
// (a client storing the six retired fields) it stays muted, as it was. The CI stub
// has no `globalCta` document and so draws no close at all, which is why
// `compare-builds.mjs` on the stub shows zero and this test holds the difference.

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode; className?: string}>(
    ({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>,
  ),
}))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({src, alt, className}: {src: string; alt?: string; className?: string}) => <img src={src} alt={alt ?? ''} className={className} />,
}))

import {HomeBody} from '../HomeBody'

const GRAPHITE_SIX = {sectionJoin: 'angled', dividerCarry: ['cards'], patternTexture: 'diagonalHatch', patternGround: 'dark', sectionOverlap: 'photo', brandGhost: 'none'}

function close(designTokens: Record<string, unknown>) {
  const chrome = {designTokens, globalCta: {heading: 'Talk to us today', layout: 'centered'}, header: {siteSettings: {firmName: 'Example Law Firm'}}}
  const {container} = render(<HomeBody chrome={chrome as never} all={{page: {}} as never} />)
  const sections = [...container.querySelectorAll('section')]
  return sections[sections.length - 1]
}

describe('the closing call to action under the theme', () => {
  it('is dark under the platform default, which is what a fresh canvas changes', () => {
    const el = close({})
    expect(el.textContent).toContain('Talk to us today')
    expect(el.className.split(' ')).toContain('bg-brand-dark')
    expect(el.getAttribute('data-ring-context')).toBe('dark')
  })

  it('stays muted under the compat bridge, as a stored client renders it today', () => {
    const el = close(GRAPHITE_SIX)
    expect(el.className.split(' ')).toContain('bg-muted')
    expect(el.getAttribute('data-ring-context')).toBeNull()
  })

  it('follows a stored theme, and the stored theme wins over the six', () => {
    expect(close({...GRAPHITE_SIX, flow: 'alternating.balanced'}).className.split(' ')).toContain('bg-brand-dark')
  })
})
