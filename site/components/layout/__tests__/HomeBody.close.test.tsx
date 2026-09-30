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

import {HomeBody, closeShownOf} from '../HomeBody'
import {PALETTE_PRESETS, presetInputs} from '@/lib/palettes'

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
    // Alternating keeps its dark footer, so its close is never dark (`[R-597]`, `[R-603]`): on the grey placeholder, with
    // no accent to fill, the light step (`closeOf`).
    expect(close({...GRAPHITE_SIX, flow: 'alternating.balanced'}).className.split(' ')).toContain('bg-muted')
  })

  it('never takes the footer\u2019s color: each theme\u2019s ending as its table says, on a real palette (Phase 18 session B)', () => {
    const navyBrass = presetInputs(PALETTE_PRESETS.find((p) => p.id === 'navy-brass')!)
    const cls = (d: Record<string, unknown>) => close({...navyBrass, ...d}).className.split(' ')
    // Quiet ends on a light footer, so its dark close stands.
    expect(cls({flow: 'quiet.mostlyLight'})).toContain('bg-brand-dark')
    // Soft wash's wash would sit 6.5 from its light footer: it closes dark.
    expect(cls({flow: 'softWash.mostlyLight'})).toContain('bg-brand-dark')
    // Alternating keeps its dark footer; under a light band (here the empty canvas's light hero ground) it closes on the accent.
    expect(cls({flow: 'alternating.balanced'})).toContain('bg-accent-fill')
  })
})

describe('whether the close is shown, with the homepage override', () => {
  const site = {heading: 'Talk to us today', layout: 'centered'}

  it('is shown when the override fills everything but the heading, as GROQ answers it', () => {
    expect(closeShownOf(site, {hideCtaForm: false, ctaOverride: {tagline: null, heading: null, description: 'One call.', buttons: null}})).toBe(true)
  })

  it('is hidden by the page, and absent with no heading anywhere', () => {
    expect(closeShownOf(site, {hideCtaForm: true, ctaOverride: null})).toBe(false)
    expect(closeShownOf({layout: 'centered'}, {hideCtaForm: false, ctaOverride: {heading: '  '}})).toBe(false)
  })
})

// The pre-report break pass (Phase 18 session B): a close on the accent fill drew its buttons in the light context, whose
// primary fill is the action color, which is the accent on every preset: the button vanished into the band. On the fill
// the buttons take the saturated context, the pair `validateWcag` guarantees (accent-fg on accent-fill).
describe('a close on the accent keeps its buttons visible', () => {
  it('draws its buttons in the saturated context, never the action color the band is filled with', () => {
    const navyBrass = presetInputs(PALETTE_PRESETS.find((p) => p.id === 'navy-brass')!)
    const chrome = {designTokens: {...navyBrass, flow: 'alternating.balanced'}, globalCta: {heading: 'Talk to us today', layout: 'centered', buttons: [{title: 'Book a call', url: '/contact/', variant: 'primary'}, {title: 'Call us', url: 'tel:5550100', variant: 'secondary'}]}, header: {siteSettings: {firmName: 'Example Law Firm'}}}
    const {container} = render(<HomeBody chrome={chrome as never} all={{page: {}} as never} />)
    const sections = [...container.querySelectorAll('section')]
    const close = sections[sections.length - 1]
    expect(close.className.split(' ')).toContain('bg-accent-fill')
    const buttons = [...close.querySelectorAll('a')].map((a) => a.className.split(' '))
    expect(buttons.length).toBe(2)
    for (const b of buttons) expect(b).not.toContain('bg-action')
    expect(buttons[0]).toContain('bg-accent-fg')
  })
})

describe('the homepage close reads the footer the shell renders, a stored scheme winning', () => {
  it('under Quiet, a stored dark footer turns the dark close to the accent; a stored light one keeps it dark', () => {
    const navyBrass = presetInputs(PALETTE_PRESETS.find((p) => p.id === 'navy-brass')!)
    const closeUnder = (footerScheme: string) => {
      const chrome = {designTokens: {...navyBrass, flow: 'quiet.mostlyLight'}, globalCta: {heading: 'Talk to us today', layout: 'centered'}, header: {siteSettings: {firmName: 'Example Law Firm'}}, footer: {footerSettings: {footerScheme}}}
      const sections = [...render(<HomeBody chrome={chrome as never} all={{page: {}} as never} />).container.querySelectorAll('section')]
      return sections[sections.length - 1].className.split(' ')
    }
    expect(closeUnder('dark')).toContain('bg-accent-fill')
    expect(closeUnder('light')).toContain('bg-brand-dark')
  })
})
