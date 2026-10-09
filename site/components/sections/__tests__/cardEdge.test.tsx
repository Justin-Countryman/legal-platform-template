import {describe, expect, it, vi} from 'vitest'
import {forwardRef} from 'react'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import {wcagContrast} from 'culori'

vi.mock('next/link', () => ({
  // eslint-disable-next-line react/display-name
  default: forwardRef<HTMLAnchorElement, {href: string; children: React.ReactNode}>(({href, children, ...rest}, ref) => <a ref={ref} href={href} {...rest}>{children}</a>),
}))

import {CardLink} from '@/components/ui/CardLink'
import {TestimonialCard} from '@/components/ui/TestimonialCard'
import {CaseResultsSection} from '../CaseResultsSection'
import {PracticeAreaNavBlock} from '../PracticeAreaNavBlock'
import {resolvePalette} from '@/lib/designTokens'
import {PALETTE_PRESETS, presetInputs} from '@/lib/palettes'

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

// BACKLOG 441 (monorepo, decided under `[R-503]`): on a dark band the glowing card's real border replaced the resting edge,
// so a design setting both (the from-scratch test of 2026-10-08: `cardEdge left`, `cardGlow on`) drew the edge on its light
// cards and none on its dark ones. The approved Figma design drew both, the stripe over the border; so does the page.
describe('the edge over a glowing card (backlog 441)', () => {
  const GLOW = '[data-card-glow="on"] main :is(.bg-brand-dark, [data-ring-context="dark"]) [data-card]'
  const over = (edge: string) => `[data-card-glow="on"][data-card-edge="${edge}"] main :is(.bg-brand-dark, [data-ring-context="dark"]) [data-card]`
  const body = (sel: string) => new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`).exec(CSS)?.[1]?.trim() ?? ''

  it('draws the edge the setting names over the glow’s border, in the decor color as the card resolves it', () => {
    expect(body(over('left'))).toBe('border-left: 4px solid --theme(--color-decor);')
    expect(body(over('bottom'))).toBe('border-bottom: 2px solid --theme(--color-decor);')
    expect(body(over('outline'))).toBe('border-color: --theme(--color-decor);')
    // After the glowing card's own rule, which it outweighs by one attribute besides.
    for (const edge of ['left', 'bottom', 'outline']) expect(CSS.indexOf(over(edge)), edge).toBeGreaterThan(CSS.indexOf(`${GLOW} {`))
    // The glow keeps its border on the other sides: the rule it overrides is untouched.
    expect(CSS.slice(CSS.indexOf(`${GLOW} {`), CSS.indexOf('}', CSS.indexOf(`${GLOW} {`)))).toContain('border-color: color-mix(in srgb, var(--color-accent-on-dark) 48%, transparent);')
  })

  it('reaches a glowing card on a dark band, never a card on a light one, which keeps the plain edge', () => {
    const {container} = render(
      <div data-card-glow="on" data-card-edge="left"><main>
        <section data-ring-context="dark"><CardLink href="/a/">On dark</CardLink></section>
        <section className="bg-brand-dark"><CardLink href="/b/">On the dark ground</CardLink></section>
        <section><CardLink href="/c/">On light</CardLink></section>
      </main></div>,
    )
    const [dark, ground, light] = [...container.querySelectorAll('[data-card]')]
    for (const card of [dark, ground]) {
      expect(card.matches(over('left'))).toBe(true)
      expect(card.matches(GLOW)).toBe(true)
    }
    expect(light.matches(over('left'))).toBe(false)
    expect(light.matches('[data-card-edge="left"] main [data-card]')).toBe(true)
  })

  it('reads on the glowing card’s surface and its lit corner on every preset that draws it: 3:1 or more', () => {
    let drawn = 0
    for (const p of PALETTE_PRESETS) {
      const t = resolvePalette(presetInputs(p), {cardGlow: 'on'})
      if (!t.glowLightOk) continue
      drawn++
      // Inside a glowing card the accent is the accent on dark (the card's own values), which the decor color reads.
      for (const ground of [t.tokens['--color-card-on-dark'], t.tokens['--color-card-glow']]) {
        expect(wcagContrast(t.tokens['--color-accent-on-dark'], ground) as number, `${p.id} on ${ground}`).toBeGreaterThanOrEqual(3)
      }
    }
    expect(drawn).toBeGreaterThanOrEqual(13)
  })
})
