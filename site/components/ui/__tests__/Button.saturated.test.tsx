import {__unstable__loadDesignSystem} from '@tailwindcss/node'
import {render, screen} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import {beforeAll, describe, expect, it} from 'vitest'

import {findUnknown, readPlainCssClasses} from '../../../scripts/check-unknown-utility-classes.mjs'
import {Button} from '../Button'

// ─── The saturated button context ─────────────────────────────────────────────
//
// Phase 15 (WS-V1-PHASE15-DESIGN §7 amendment 13). A content section set to the
// `saturated` surface paints `bg-accent-fill` and passes `context="saturated"`.
//
// THE PAIR. The band guarantees exactly one pair, `accent-fg on accent-fill`
// (`validateWcag`, swept for any input by `colourGuarantee.test.ts`). The primary
// button is that pair reversed, which has the same ratio, so the band and its
// button are guaranteed together. The action colour is never used here: an
// operator who sets no action gets the accent, which would vanish into the fill.
//
// WHY A SEPARATE FILE from `Button.test.tsx`: it also asks Tailwind whether every
// class the new context emits exists, which needs the design system loaded, and
// `Button.test.tsx` is a plain jsdom file. The two Phase 13 precedents for the
// oracle are `sectionSurface.test.ts` and `imageTreatment.test.ts`.

const SITE_ROOT = path.resolve(__dirname, '../../..')

let designSystem: {candidatesToCss: (names: string[]) => (string | null)[]}
let plainCss: Set<string>

beforeAll(async () => {
  designSystem = await __unstable__loadDesignSystem(fs.readFileSync(path.join(SITE_ROOT, 'app/globals.css'), 'utf8'), {
    base: SITE_ROOT,
  })
  plainCss = readPlainCssClasses(SITE_ROOT)
})

const classesOf = (element: HTMLElement) => element.className.split(/\s+/).filter(Boolean)

describe('Button, saturated context', () => {
  it('primary is the band’s own pair reversed, and never the action colour', () => {
    render(<Button variant="primary" context="saturated">Talk with us</Button>)
    const className = screen.getByRole('button').className
    expect(className).toContain('bg-accent-fg')
    expect(className).toContain('text-accent-fill')
    expect(className).not.toContain('bg-action')
    expect(className).not.toContain('text-action-fg')
  })

  it('secondary draws its outline in the current text colour, which the band sets to accent-fg', () => {
    render(<Button variant="secondary" context="saturated">How we work</Button>)
    const className = screen.getByRole('button').className
    expect(className).toContain('border-current')
    expect(className).toContain('text-foreground')
    expect(className).toContain('hover:bg-accent-fg')
    expect(className).toContain('hover:text-accent-fill')
    expect(className).not.toContain('hover:bg-action')
  })

  it.each(['primary', 'secondary', 'tertiary'] as const)(
    '%s focuses with a two-colour ring: the mark on accent-fg, the gap on the fill (WCAG technique C40)',
    (variant) => {
      render(<Button variant={variant} context="saturated">Read more</Button>)
      const className = screen.getByRole('button').className
      expect(className).toContain('focus-visible:ring-accent-fg')
      expect(className).toContain('focus-visible:ring-offset-accent-fill')
    },
  )

  it('every class the saturated context emits is a class Tailwind emits', () => {
    const names = new Set<string>()
    for (const variant of ['primary', 'secondary', 'tertiary'] as const) {
      for (const size of ['small', 'compact', 'normal'] as const) {
        const {unmount} = render(<Button variant={variant} context="saturated" size={size}>Label</Button>)
        for (const name of classesOf(screen.getByRole('button'))) names.add(name)
        unmount()
      }
    }
    expect(findUnknown([...names], designSystem, plainCss)).toEqual([])
  })

  it('the oracle is live: a class that does not exist is reported', () => {
    expect(findUnknown(['bg-accent-fill', 'bg-accent-fill-not-a-class'], designSystem, plainCss))
      .toEqual(['bg-accent-fill-not-a-class'])
  })
})
