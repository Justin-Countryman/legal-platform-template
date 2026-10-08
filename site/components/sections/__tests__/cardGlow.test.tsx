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

// GLOWING CARDS (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 16, `[R-641]`; lewinlawfirm's panels and cards; the
// light since `[R-646]`). On a dark band a card becomes a dark island: a surface between the dark ground and the glow's
// light, the light in its corner, a black shadow, a real border, the glow band's text values. Only where the palette has
// room for the light; light bands keep light cards.

const CSS = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8')
const SEL = '[data-card-glow="on"] main :is(.bg-brand-dark, [data-ring-context="dark"]) [data-card]'

describe('glowing cards', () => {
  it('the engine draws them only when asked and where the light holds, and every glow band pair holds on them', () => {
    let drawn = 0
    for (const p of PALETTE_PRESETS) {
      const plain = resolvePalette(presetInputs(p))
      expect(plain.tokens['--color-card-on-dark'], p.id).toBeUndefined()
      const t = resolvePalette(presetInputs(p), {cardGlow: 'on'})
      if (!t.glowLightOk) { expect(t.tokens['--color-card-on-dark'], p.id).toBeUndefined(); continue }
      drawn++
      expect(t.tokens['--color-card-glow'], p.id).toBe(resolvePalette(presetInputs(p), {glowShape: 'corner'}).tokens['--color-glow-light'])
      for (const ground of [t.tokens['--color-card-on-dark'], t.tokens['--color-card-glow']]) {
        for (const [fg, min] of photoBandPairs(t.tokens)) expect(wcagContrast(fg, ground) as number, `${p.id} ${fg} on ${ground}`).toBeGreaterThanOrEqual(min)
      }
    }
    expect(drawn).toBeGreaterThan(0)
  })

  it('reaches a card on a dark band inside the page, never one on a light band', () => {
    expect(CSS).toContain(`${SEL} {\n  background-color: var(--color-card-on-dark);`)
    // A real border (forced colors drop the glow), a black shadow, the selected state reset (§9.3).
    const rule = CSS.slice(CSS.indexOf(`${SEL} {`), CSS.indexOf('}', CSS.indexOf(`${SEL} {`)))
    expect(rule).toContain('border-width: 1px;')
    expect(rule).toContain('box-shadow: 0 18px 40px -24px rgb(0 0 0 / 0.55);')
    expect(rule).toContain('--color-action-state-cue:  var(--color-action-state-cue-on-scrim);')
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
