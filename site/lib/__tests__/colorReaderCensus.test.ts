import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'

// ─── The reader census (item 323) ─────────────────────────────────────────────
//
// Phase 15, WS-V1-PHASE15-DESIGN §7 amendment 21.
//
// THE QUESTION. Every `--color-*` name in `@theme` becomes Tailwind utilities and
// is a promise: something renders it. A name nothing reads is either dead weight
// or, worse, a name a future component will reach for believing the engine keeps
// it current. Phase 14's engine emits values for a subset of these names; the
// rest are declarations with no consumer.
//
// WHAT THIS ASSERTS. For each name: a component or route reads it as a utility
// (`bg-x`, `text-x`, `ring-x`, …) or as `var(--color-x)`. A name that no TSX reads
// must appear in UNREAD below with its reason, and each reason is itself checked,
// so "the cascade blocks read it" fails if the blocks stop doing so. A new name
// with no reader fails; a listed name that gains a reader fails too, which is what
// keeps the list from rotting.
//
// WHAT IT CANNOT DO. It does not prove the value is right (that is
// `colorGuarantee.test.ts`), nor that the reader is on a ground where the pair
// passes (that is the boundary registry and the cascade-block parity test).

const SITE = path.resolve(__dirname, '../..')
const CSS = fs.readFileSync(path.join(SITE, 'app/globals.css'), 'utf8')

/** Every `--color-*` declared in a `@theme` block. */
function themeColorNames(): string[] {
  const names = new Set<string>()
  for (const match of CSS.matchAll(/@theme[^{]*\{/g)) {
    let depth = 1
    let i = match.index! + match[0].length
    const start = i
    while (depth > 0 && i < CSS.length) {
      if (CSS[i] === '{') depth += 1
      else if (CSS[i] === '}') depth -= 1
      i += 1
    }
    for (const declaration of CSS.slice(start, i - 1).matchAll(/(--color-[a-z0-9-]+)\s*:/g)) names.add(declaration[1])
  }
  return [...names].sort()
}

/** Every shipped `.tsx` and `.ts` — dev-only design surfaces excluded ([R-214]).
 *  `.ts` since Phase 16B: class maps such as `lib/imageTreatment.ts` hold readers
 *  (`before:bg-slab`) that no `.tsx` spells. */
function shippedSource(): string {
  const parts: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.isDirectory()) {
        if (!['__tests__', '__snapshots__', 'design-studio', 'design-preview', 'node_modules'].includes(entry.name)) {
          walk(path.join(dir, entry.name))
        }
        continue
      }
      if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) parts.push(fs.readFileSync(path.join(dir, entry.name), 'utf8'))
    }
  }
  for (const dir of ['components', 'app', 'lib']) walk(path.join(SITE, dir))
  return parts.join('\n')
}

const UTILITY = '(?:bg|text|border|border-[trblxy]|ring|ring-offset|from|via|to|fill|stroke|divide|outline|caret|placeholder|accent|shadow|decoration)'

// Why each unread name is still here. The reason is asserted below, not trusted.
type Reason = 'cascade' | 'utility-bridge'
const UNREAD: Record<string, Reason> = Object.fromEntries([
  // Read by the cascade blocks in globals.css, never by a component: a component
  // reads the context-free name (`text-foreground`) and the block swaps it.
  ...[
    '--color-accent-on-dark', '--color-accent-on-light', '--color-accent-text-on-light',
    '--color-action-state-cue-on-dark', '--color-action-state-cue-on-light', '--color-action-state-cue-on-scrim',
    '--color-action-text-hover-on-dark', '--color-action-text-hover-on-light',
    '--color-action-text-on-dark', '--color-action-text-on-light',
    '--color-border-control-on-dark', '--color-border-control-on-light', '--color-border-control-on-scrim',
    '--color-border-on-dark', '--color-border-on-light',
    '--color-foreground-muted-on-dark', '--color-foreground-muted-on-light',
    '--color-foreground-subtle-on-dark', '--color-foreground-subtle-on-light',
    '--color-hover-wash-on-dark', '--color-star-outline-on-dark', '--color-star-outline-on-light',
  ].map((name) => [name, 'cascade' as Reason]),
  // Tailwind v4 does not generate a ring utility from a color name, so globals.css
  // bridges these with `@utility ring-focus` / `@utility ring-focus-on-dark`.
  ...['--color-ring-focus', '--color-ring-focus-on-dark', '--color-ring-focus-on-light'].map((name) => [name, 'utility-bridge' as Reason]),
])

const names = themeColorNames()
// Comments are not readers (Phase 16A: the word "text-link" in a comment counted
// `--color-link` as read). Block comments, JSX comments and `//` line comments that
// start a line or follow whitespace go; a URL's `https://` follows a colon and stays.
const source = shippedSource().replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/[^\n]*/gm, '$1')

// A reader is a whole class: the utility starts at a class boundary (start, space,
// quote, backtick, a variant's colon or `!`) and ends at one. Unanchored,
// `text-accent-text` counted `--color-text` as read through `accent-text` (Phase 16A).
const isRead = (name: string) => {
  const suffix = name.slice('--color-'.length)
  return new RegExp(`(?:^|[\\s"'\`:!{(])${UTILITY}-${suffix}(?![\\w-])`, 'm').test(source) || source.includes(`var(${name})`)
}

describe('the color reader census', () => {
  it('reads a sensible number of names, so a broken parse cannot pass this file', () => {
    // 50 after Phase 16A deleted the wireframe kit's 35 unread names (item 339).
    expect(names.length).toBeGreaterThan(40)
    expect(names).toContain('--color-accent-fill')
  })

  it('every theme color name is read by a component, or listed with a reason', () => {
    const unlisted = names.filter((name) => !isRead(name) && !(name in UNREAD))
    expect(unlisted, 'give it a reader, delete it, or add it to UNREAD with its reason').toEqual([])
  })

  it('no listed name has quietly gained a reader', () => {
    const stale = Object.keys(UNREAD).filter((name) => isRead(name))
    expect(stale, 'remove these from UNREAD: a component reads them now').toEqual([])
  })

  it('every listed name still exists in @theme', () => {
    expect(Object.keys(UNREAD).filter((name) => !names.includes(name))).toEqual([])
  })

  it('the cascade reason is true: each of those names is read by a cascade block', () => {
    for (const [name, reason] of Object.entries(UNREAD)) {
      if (reason !== 'cascade') continue
      expect(CSS, name).toContain(`var(${name})`)
    }
  })

  it('the bridge reason is true: globals.css defines the ring utilities by hand', () => {
    expect(CSS).toMatch(/@utility ring-focus \{/)
    expect(CSS).toMatch(/@utility ring-focus-on-dark \{/)
  })

  // The new name Phase 15 adds is a name, not a value: it aliases the anchored
  // accent, and a component reads it (the band, the edge, the strip, the button).
  it('accent-fill is read, and aliases the accent rather than adding a value', () => {
    expect(isRead('--color-accent-fill')).toBe(true)
    expect(CSS).toMatch(/--color-accent-fill:\s*var\(--color-accent-on-light\);/)
  })
})
