import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>),
}))

import {CardLink} from '@/components/ui/CardLink'
import {TestimonialCard} from '@/components/ui/TestimonialCard'
import {CaseResultsSection} from '../CaseResultsSection'
import {PracticeAreaNavBlock} from '../PracticeAreaNavBlock'

// THE RESTING CARD EDGE (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 14, `[R-641]`; brandilaw's gold-edged results,
// stuartmckenzie's practice cards, lewinlawfirm's tiles): under the shell's `data-card-edge`, every card on the page takes
// an accent edge. The rule finds cards by `[data-card]`, which practice list rows and footer cards do not wear on the page.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const rule = (edge: string) => new RegExp(`\\[data-card-edge="${edge}"\\] main \\[data-card\\] \\{([^}]*)\\}`).exec(CSS)?.[1] ?? ''

describe('the resting card edge', () => {
  it('draws the accent edge the setting names', () => {
    expect(rule('left')).toContain('border-left: 4px solid var(--color-decor)')
    expect(rule('bottom')).toContain('border-bottom: 2px solid var(--color-decor)')
    expect(rule('outline')).toContain('border: 1px solid var(--color-decor)')
  })

  it('reaches a practice card, an attorney card, a testimonial and a result on the page, and no list row', () => {
    const SEL = '[data-card-edge="left"] main [data-card]'
    const {container} = render(
      <div data-card-edge="left"><main>
        <CardLink href="/attorneys/a/">A. Lawyer</CardLink>
        <TestimonialCard t={{_id: 't', quote: 'Kind.', name: 'A.'} as never} />
        <CaseResultsSection data={{heading: 'Results', caseResults: [{_id: 'r', amount: '$1M', caption: 'Settlement'}]} as never} disclaimer="Past results do not guarantee future outcomes." />
        <PracticeAreaNavBlock data={{heading: 'Areas', layout: 'tile', mobileDisplay: 'stacked', items: [{_key: 'a', label: 'Wills', href: '/wills/'}]} as never} />
        <PracticeAreaNavBlock data={{heading: 'Rows', layout: 'inline', mobileDisplay: 'stacked', items: [{_key: 'b', label: 'Trusts', href: '/trusts/'}]} as never} />
      </main></div>,
    )
    const hit = [...container.querySelectorAll('[data-card]')].filter((el) => el.matches(SEL))
    expect(hit.length).toBeGreaterThanOrEqual(4)
    const row = [...container.querySelectorAll('a')].find((a) => a.textContent?.includes('Trusts'))!
    expect(row.matches(SEL)).toBe(false)
  })
})
