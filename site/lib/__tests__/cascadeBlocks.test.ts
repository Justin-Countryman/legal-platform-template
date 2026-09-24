import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'

// ─── The cascade blocks ───────────────────────────────────────────────────────
//
// Three blocks in `app/globals.css` re-declare the cascade-aware color tokens
// for a context: the dark block (`.bg-brand-dark, [data-ring-context="dark"]`),
// the light island (`[data-ring-context="light"]`) and, from Phase 15, the
// saturated band (`[data-ring-context="saturated"]`).
//
// WHY A TEST. A block that declares a token the others do not is the bug this
// file exists to stop: the missing token keeps the value of whatever context the
// band sits in, so a kicker, a divider or a focus ring silently renders the light
// value on a dark or saturated ground. Phase 14 shipped exactly that bug on
// `--color-accent-text` and it reached a client (measured #846700 on navy at
// 2.98:1, PR #28). Nothing else in the suite compares the three blocks: the
// guarantee test measures VALUES the engine emits, and Tailwind's own checker
// sees class names, not custom-property declarations.
//
// WHAT THIS CANNOT CATCH: whether the value each block picks is the right one.
// That is `colorGuarantee.test.ts` (ratios) and `designTokens.test.ts` (forms).

const CSS = fs.readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8')

/** The declarations inside the first rule whose selector list matches `selector`. */
function block(selector: string): Map<string, string> {
  const at = CSS.indexOf(selector)
  expect(at, `${selector} is not in globals.css`).toBeGreaterThan(-1)
  const open = CSS.indexOf('{', at)
  const close = CSS.indexOf('}', open)
  const declarations = new Map<string, string>()
  for (const line of CSS.slice(open + 1, close).split('\n')) {
    const match = /^\s*(--[a-z0-9-]+)\s*:\s*(.+?);\s*$/.exec(line)
    if (match) declarations.set(match[1], match[2])
  }
  return declarations
}

const dark = block('.bg-brand-dark,\n[data-ring-context="dark"]')
const light = block('[data-ring-context="light"]')
const saturated = block('[data-ring-context="saturated"]')

describe('the cascade blocks re-declare the same token set', () => {
  it('the dark block is not empty, so a typo in the selector cannot pass this file', () => {
    expect(dark.size).toBeGreaterThanOrEqual(13)
  })

  it.each([
    ['the light island', light],
    ['the saturated band', saturated],
  ])('%s declares exactly the dark block’s tokens', (_name, other) => {
    expect([...other.keys()].sort()).toEqual([...dark.keys()].sort())
  })

  it('every declaration is a token reference or a computed color, never a literal', () => {
    for (const [name, value] of [...dark, ...light, ...saturated]) {
      expect(value, name).toMatch(/^(var\(--|color-mix\(|rgb\(var\(|transparent$)/)
    }
  })
})

describe('the saturated band', () => {
  // Amendment 12: one text tier. Hierarchy on the fill is size and weight, because
  // a muted step off an arbitrary accent cannot be guaranteed for every input.
  it('resolves every text tier to accent-fg, the one pair validateWcag guarantees', () => {
    for (const token of ['--color-foreground', '--color-foreground-muted', '--color-foreground-subtle']) {
      expect(saturated.get(token), token).toBe('var(--color-accent-fg)')
    }
  })

  it('draws its divider from accent-fg and turns the hover wash off', () => {
    expect(saturated.get('--color-border')).toBe('color-mix(in srgb, var(--color-accent-fg) 25%, transparent)')
    expect(saturated.get('--color-hover-wash')).toBe('transparent')
  })

  // [R-461]: the accent cannot mark a word on its own fill, so the lean does.
  it('leans its highlighted words, because no color can mark them on the fill', () => {
    const rule = /\[data-ring-context="saturated"\] \.heading-emphasis \{\s*font-style: italic;\s*\}/
    expect(CSS).toMatch(rule)
  })

  it('never re-declares --color-accent-fill: the fill is the same value in every context', () => {
    for (const [name, declarations] of [['dark', dark], ['light', light], ['saturated', saturated]] as const) {
      expect(declarations.has('--color-accent-fill'), name).toBe(false)
    }
  })
})

describe('the photo band block (Phase 17B session 6, `[R-533]`)', () => {
  const photo = block('[data-scrim="true"] {')
  const shared = block('[data-scrim="true"],\n[data-hero-image="true"]')

  it('a photo band reads the scrim values of the two marks that are not text, and nothing else', () => {
    expect([...photo.entries()]).toEqual([
      ['--color-border-control', 'var(--color-border-control-on-scrim)'],
      ['--color-action-state-cue', 'var(--color-action-state-cue-on-scrim)'],
    ])
  })

  it('the image heroes do not: the block they share with a photo band keeps its three text remaps', () => {
    expect([...shared.keys()]).toEqual(['--color-action-text', '--color-action-text-hover', '--color-ring-focus'])
  })
})
