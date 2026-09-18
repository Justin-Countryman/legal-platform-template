import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'

vi.mock('next/link', () => {
  const Link = forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => (
    <a ref={ref} href={href} {...rest}>{children}</a>
  ))
  Link.displayName = 'Link'
  return {default: Link}
})

import {SiloSpotlight, SiloFeature, SiloTileLayout, SiloInline, SiloSplit} from '@/components/sections/silo/SiloLayouts'
import {SILO_HOVER_EFFECTS, siloHover} from '@/lib/siloHover'
import {RESOLVED_TREATMENTS, treatmentClasses} from '@/lib/imageTreatment'
import {CardLink} from '@/components/ui/CardLink'

// ─── The color role map, rendered (Phase 16A, [R-471]) ────────────────────────
//
// `platform/color-roles` holds every className literal to the role map: states take
// `cue`, static decorations take `decor`, and only Button paints with the button
// color. A class that lives in a `.ts` map reaches `className` without passing
// through a JSX literal, so lint cannot see it. This renders the components whose
// classes come from maps (the practice-area hover effects, the image treatments)
// with every option on, and holds the RENDERED markup to the same rule.

const RAW = /^(?:[a-z0-9-]+:)*(?:bg|from|to|via|border(?:-[trblxyse]{1,2})?|ring|outline|shadow|fill|stroke|divide|decoration)-(?:action|accent)(?:-hover)?(?:\/\d+)?$/

const raw = (root: Element) =>
  [...root.querySelectorAll('[class]')].flatMap((el) =>
    (el.getAttribute('class') ?? '').split(/\s+/).filter((t) => RAW.test(t)).map((t) => `<${el.tagName.toLowerCase()}> ${t}`),
  )

const ICON = {asset: {_ref: 'image-test-200x200-png', _type: 'reference'}}
const ITEMS = [
  {_key: 'a', label: 'Family Law', href: '/family-law/', description: 'Divorce.', image: ICON, icon: ICON},
  {_key: 'b', label: 'Estate Planning', href: '/estate/', description: 'Wills.', icon: ICON},
]
const EVERY_EFFECT = SILO_HOVER_EFFECTS.filter((e) => e !== 'none')

describe('item 323 widened by [R-471]: no rendered element paints a raw role', () => {
  it.each([
    ['Spotlight', SiloSpotlight], ['Feature', SiloFeature], ['Tile', SiloTileLayout], ['Inline', SiloInline], ['Split', SiloSplit],
  ] as const)('practice areas, %s, with every hover effect on', (_name, Layout) => {
    const {container} = render(<Layout items={ITEMS as never} ariaLabel="Areas" hoverEffects={EVERY_EFFECT} showArrow iconPosition="auto" />)
    expect(raw(container)).toEqual([])
  })

  it('every hover effect class, as the map returns it', () => {
    const classes = Object.values(siloHover(EVERY_EFFECT)).join(' ').split(/\s+/).filter(Boolean)
    expect(classes.filter((t) => RAW.test(t))).toEqual([])
    // The two effects that paint color paint a state, so they read cue.
    expect(classes).toEqual(expect.arrayContaining(['group-hover:border-cue']))
  })

  it.each(RESOLVED_TREATMENTS)('the %s image treatment', (treatment) => {
    const {wrapper, image} = treatmentClasses(treatment)
    expect(`${wrapper} ${image}`.split(/\s+/).filter((t) => RAW.test(t))).toEqual([])
  })

  it('a card link: its hover border is a state', () => {
    const {container} = render(<CardLink href="/x/">Card</CardLink>)
    expect(raw(container)).toEqual([])
    expect((container.querySelector('a')!.getAttribute('class') ?? '').split(/\s+/)).toContain('hover:border-cue')
  })
})
