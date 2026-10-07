import {describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import {SectionHeader} from '../SectionHeader'
import {HeadingUnit} from '../HeadingUnit'
import {Tagline} from '../Tagline'
import {HeroTextBlock} from '@/components/layout/homeHero/shared'

// THE LEAD-IN LINE (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 12, `[R-641]`): the line above a section heading or
// the homepage headline, larger and in the heading face (lewinlawfirm's lead-ins, stuartmckenzie's kicker), under the
// shell's `data-lead-in`; about thirty other taglines (headers, footers, profile pages) keep the tagline style (ADV-PP-B).
// The rule finds its lines by what follows them, so no component's markup changed.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const TARGET = '.tagline:is(:has(+ .section-heading), :has(+ [data-hero-heading]))'

describe('the lead-in line', () => {
  it('is drawn larger, in the heading face, with no rule, under the shell attribute; the kicker italic in the heading ink', () => {
    const rule = (sel: string) => new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}').exec(CSS)?.[1] ?? ''
    expect(rule(`[data-lead-in] ${TARGET}`)).toContain('font-family: var(--font-heading)')
    expect(rule(`[data-lead-in] ${TARGET}::before`)).toContain('display: none')
    const kicker = rule(`[data-lead-in="kicker"] ${TARGET}`)
    expect(kicker).toContain('font-style: italic')
    expect(kicker).toContain('color: var(--color-heading)')
  })

  it('reaches the line above a section header’s heading, a content section’s heading and the homepage headline', () => {
    const lines = [
      render(<SectionHeader tagline="Practice areas" heading="How we can help" />).container,
      render(<HeadingUnit tagline="Why us" heading="Why work with us" scale="marketing" />).container,
      render(<HeroTextBlock eyebrow="Cincinnati" heading="Serious counsel" description={null} ctas={[]} isDark={false} align="start" />).container,
    ].map((c) => c.querySelector('.tagline')!)
    for (const line of lines) expect(line.matches(TARGET), line.textContent!).toBe(true)
  })

  it('leaves a tagline that no heading follows as it is', () => {
    const {container} = render(<div><Tagline as="p">Office hours</Tagline><p>Monday to Friday</p></div>)
    expect(container.querySelector('.tagline')!.matches(TARGET)).toBe(false)
  })
})
