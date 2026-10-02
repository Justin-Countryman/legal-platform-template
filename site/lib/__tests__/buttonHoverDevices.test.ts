import {describe, it, expect} from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import postcss, {type AtRule, type Rule} from 'postcss'

// ─── The button hover effects, only on a device that can hover (monorepo WS-MOTION-LAYER-DESIGN.md §1.2) ────
//
// The site-wide button effects (Design Settings → Button Hover Animation: sweep, fill from center, inset,
// lift) are rules in globals.css on a raw `:hover`, where Tailwind v4's `hover:` variant already sits
// inside `@media (hover: hover)`. A tap on a phone sets `:hover` and leaves it set, so a sweep or a fill
// stayed drawn on the button after the tap. Every such rule is held inside the media query.

const css = postcss.parse(fs.readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8'))
const hoverRules: Rule[] = []
css.walkRules((rule) => {
  if (rule.selector.includes('[data-button-animation') && rule.selector.includes(':hover')) hoverRules.push(rule)
})
const insideHoverMedia = (rule: Rule) => {
  for (let node = rule.parent; node; node = node.parent as typeof node) {
    if (node.type === 'atrule' && (node as AtRule).name === 'media' && /\(hover:\s*hover\)/.test((node as AtRule).params)) return true
  }
  return false
}

describe('the button hover effects', () => {
  it('exist', () => {
    expect(hoverRules.length).toBeGreaterThan(0)
  })

  it('apply only where the device can hover', () => {
    expect(hoverRules.filter((r) => !insideHoverMedia(r)).map((r) => r.selector)).toEqual([])
  })
})
