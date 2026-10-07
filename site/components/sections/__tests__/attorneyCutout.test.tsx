import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>),
}))
vi.mock('@/components/ui/SanityImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  SanityImage: ({alt, className}: {alt: string; className?: string}) => <img alt={alt} className={className} />,
}))

import {AttorneySectionBlock} from '../AttorneySectionBlock'

// THE CUT-OUT ATTORNEY CARD (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 15, `[R-641]`; all five premium references
// set their people large, four of them as cut-outs). The attorney section's `cardStyle: 'cutout'` stands each transparent
// photograph on the card's floor with no panel and an opaque name plate below; only when every photo is a cut-out
// (Sanity's `isOpaque === false`), else the whole section draws Portrait.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const person = (i: number, opaque: boolean | null) => ({_id: `a${i}`, title: `Lawyer ${i}`, slug: `attorneys/${i}`, jobTitle: 'Partner', photo: {asset: {_ref: `image-x${i}-800x1000-png`}, alt: `Lawyer ${i}`}, photoOpaque: opaque})
const draw = (people: ReturnType<typeof person>[]) => render(<AttorneySectionBlock data={{heading: 'Our attorneys', cardStyle: 'cutout', attorneys: people} as never} />).container

describe('the cut-out attorney card', () => {
  it('draws every card as a cut-out on its floor with an opaque plate when every photo is a cut-out', () => {
    const c = draw([person(1, false), person(2, false), person(3, false)])
    expect(c.querySelectorAll('.cutout-plate')).toHaveLength(3)
    for (const img of c.querySelectorAll('img')) expect(img.className.split(' ')).toEqual(expect.arrayContaining(['object-contain', 'object-bottom']))
  })

  it('draws the whole section as Portrait when one photo is not a cut-out', () => {
    for (const odd of [true, null]) {
      const c = draw([person(1, false), person(2, odd), person(3, false)])
      expect(c.querySelectorAll('.cutout-plate')).toHaveLength(0)
      expect(c.querySelectorAll('a')).toHaveLength(3)
    }
  })

  it('the plate is the dark ground in its on-dark text, the accent fill in its own text on a dark band', () => {
    expect(CSS).toMatch(/\.cutout-plate \{\s*background-color: var\(--color-brand-dark\);\s*--color-foreground: var\(--color-foreground-on-dark\);/)
    expect(CSS).toMatch(/:is\(\.bg-brand-dark, \[data-ring-context="dark"\]\) \.cutout-plate \{\s*background-color: var\(--color-accent-fill\);\s*--color-foreground: var\(--color-accent-fg\);/)
  })
})
