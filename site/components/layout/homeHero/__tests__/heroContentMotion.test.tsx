import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import postcss, {type AtRule, type Rule} from 'postcss'

// ─── The hero's content animation starts with the page (monorepo WS-MOTION-LAYER-DESIGN.md §1.2, §5) ───
//
// It ran through Framer Motion, whose feature bundle loads after the page: the server sent every line
// at its starting offset (`transform: translateY(20px)`) and the lines moved home only when the bundle
// arrived (measured on a slow phone: drawn at 4.3 s, moving at 8.7 s); `fade` swapped a plain div for
// Framer's at hydration, which starts at opacity 0, so the heading was drawn, vanished and faded back.
// The animation is CSS keyframes now, from the first paint: nothing in the block carries an inline
// offset or opacity in any state, the block names its animation for the stylesheet, the heading sits
// where `fade` never reaches it, and every hero rule in `globals.css` exists only for a visitor who has
// not asked for reduced motion.

vi.mock('@/components/ui/ButtonGroup', () => ({
  ButtonGroup: ({items}: {items: {label: string}[]}) => <div data-testid="ctas">{items.map((i) => i.label).join(' ')}</div>,
}))

import {HeroTextBlock} from '../shared'
import type {Motion} from '../types'

const MOTIONS: Motion[] = ['none', 'fade', 'entrance', 'stagger', 'staggerRight', 'slide']

function block(motion: Motion) {
  return render(
    <HeroTextBlock
      eyebrow="A law firm in the county"
      heading="Counsel you can call"
      description="Plain answers and a clear plan."
      ctas={[{label: 'Request a consultation', href: '/contact/', style: 'primary'} as never]}
      isDark
      motion={motion}
    />,
  ).container
}

describe('the hero content animation, drawn by CSS from the first paint', () => {
  it.each(MOTIONS)('%s: no line carries an inline offset or opacity, before or after mount', (motion) => {
    const container = block(motion)
    const styled = [...container.querySelectorAll('[style]')].map((el) => el.getAttribute('style') ?? '')
    expect(styled.filter((s) => /transform|translate|opacity/i.test(s))).toEqual([])
    expect(container.textContent).toContain('Counsel you can call')
  })

  it.each(MOTIONS.filter((m) => m !== 'none'))('%s: the block names its animation for the stylesheet', (motion) => {
    const lines = block(motion).querySelector('.hero-lines')
    expect(lines?.getAttribute('data-hero-motion')).toBe(motion)
  })

  it('none: the block names no animation', () => {
    expect(block('none').querySelector('[data-hero-motion]')).toBeNull()
  })

  it('the heading is a line of its own, where the fade, which moves the lines around it, never reaches', () => {
    // `.hero-lines[data-hero-motion="fade"] > :not(h1)`: the heading is the largest paint, and a fade from
    // opacity 0 at the first paint delayed it by about 1.2 s (ADV-MOT-B, measured).
    const container = block('fade')
    expect(container.querySelector('.hero-lines > h1')?.textContent).toBe('Counsel you can call')
  })
})

describe('the hero rules in globals.css', () => {
  const css = postcss.parse(fs.readFileSync(path.resolve(__dirname, '../../../../app/globals.css'), 'utf8'))
  const heroRules: Rule[] = []
  css.walkRules((rule) => { if (rule.selector.includes('.hero-lines')) heroRules.push(rule) })
  const insideNoPreference = (rule: Rule) => {
    for (let node = rule.parent; node; node = node.parent as typeof node) {
      if (node.type === 'atrule' && (node as AtRule).name === 'media' && /prefers-reduced-motion:\s*no-preference/.test((node as AtRule).params)) return true
    }
    return false
  }

  it('exist', () => {
    expect(heroRules.length).toBeGreaterThan(0)
  })

  it('exist only for a visitor who has not asked for reduced motion', () => {
    expect(heroRules.filter((r) => !insideNoPreference(r)).map((r) => r.selector)).toEqual([])
  })

  it('never fade the heading', () => {
    const fades = heroRules.filter((r) => r.selector.includes('fade'))
    expect(fades.length).toBeGreaterThan(0)
    for (const r of fades) expect(r.selector).toMatch(/:not\(h1\)/)
  })
})
