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
import {photoBandPairs, resolvePalette} from '@/lib/designTokens'
import {PALETTE_PRESETS, presetInputs} from '@/lib/palettes'

// GLOWING CARDS (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 16, `[R-641]`; lewinlawfirm's panels and cards). On a
// dark band a card becomes a dark island: a surface on the ramp from the dark ground to the glow, its corner in the
// accent's glow, the glow band's text values. Only where the palette's glow holds; light bands keep light cards.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const SEL = '[data-card-glow="on"] main :is(.bg-brand-dark, [data-ring-context="dark"]) [data-card]'

describe('glowing cards', () => {
  it('the engine draws them only when asked and where the glow holds, and every glow band pair holds on them', () => {
    let drawn = 0
    for (const p of PALETTE_PRESETS) {
      const plain = resolvePalette(presetInputs(p))
      expect(plain.tokens['--color-card-on-dark'], p.id).toBeUndefined()
      const t = resolvePalette(presetInputs(p), {cardGlow: 'on'})
      if (!t.glowOk) { expect(t.tokens['--color-card-on-dark'], p.id).toBeUndefined(); continue }
      drawn++
      for (const ground of [t.tokens['--color-card-on-dark'], t.tokens['--color-card-glow']]) {
        for (const [fg, min] of photoBandPairs(t.tokens)) expect(wcagContrast(fg, ground) as number, `${p.id} ${fg} on ${ground}`).toBeGreaterThanOrEqual(min)
      }
    }
    expect(drawn).toBeGreaterThan(0)
  })

  it('reaches a card on a dark band inside the page, never one on a light band', () => {
    expect(CSS).toContain(`${SEL} {\n  background-color: var(--color-card-on-dark);`)
    const {container} = render(
      <div data-card-glow="on"><main>
        <section data-ring-context="dark"><CardLink href="/a/">On dark</CardLink></section>
        <section><CardLink href="/b/">On light</CardLink></section>
      </main></div>,
    )
    const [dark, light] = [...container.querySelectorAll('[data-card]')]
    expect(dark.matches(SEL)).toBe(true)
    expect(light.matches(SEL)).toBe(false)
  })
})
