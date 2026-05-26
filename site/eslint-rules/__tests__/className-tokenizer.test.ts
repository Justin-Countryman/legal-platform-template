// className-tokenizer — vitest fixtures.
//
// Fixtures lean on real WS7.7 / WS8 production className shapes so the
// tokenizer is validated against the patterns rules will actually face.

import {describe, it, expect} from 'vitest'
import {parseJSXOpening, findAttribute} from './parse-jsx'

// eslint-rules/index.js / lib/className-tokenizer.js are CommonJS modules.
// Vitest handles the interop automatically.
import {
  tokenizeClassNameAttribute,
  tokenizeClassNameValue,
  tokenizeWhitespace,
  anyBranchContains,
  everyBranchContainsAnyOf,
  noBranchContains,
} from '../lib/className-tokenizer.js'

function tokenize(jsx: string) {
  const opening = parseJSXOpening(jsx)
  const attr = findAttribute(opening, 'className')
  return tokenizeClassNameAttribute(attr)
}

describe('tokenizeWhitespace', () => {
  it('splits on spaces, drops empty strings', () => {
    expect(tokenizeWhitespace('foo bar  baz')).toEqual(['foo', 'bar', 'baz'])
  })

  it('returns empty array for empty / whitespace-only', () => {
    expect(tokenizeWhitespace('')).toEqual([])
    expect(tokenizeWhitespace('   ')).toEqual([])
  })

  it('handles tabs and newlines as whitespace', () => {
    expect(tokenizeWhitespace('foo\tbar\nbaz')).toEqual(['foo', 'bar', 'baz'])
  })
})

describe('string literal className', () => {
  it('tokenizes a plain string', () => {
    const r = tokenize('<div className="foo bar baz" />')
    expect(r).toEqual({branches: [['foo', 'bar', 'baz']], complete: true})
  })

  it('tokenizes a footer-h3 production className (WS7.7 Commit 2b retrofit)', () => {
    const r = tokenize('<h3 className="text-base font-semibold text-foreground-muted mb-2">Title</h3>')
    expect(r?.complete).toBe(true)
    expect(r?.branches[0]).toContain('text-foreground-muted')
    expect(r?.branches[0]).toContain('mb-2')
  })

  it('returns one empty branch for empty string', () => {
    const r = tokenize('<div className="" />')
    expect(r).toEqual({branches: [[]], complete: true})
  })
})

describe('expression-container literal', () => {
  it('tokenizes className={"foo bar"}', () => {
    const r = tokenize('<div className={"foo bar"} />')
    expect(r).toEqual({branches: [['foo', 'bar']], complete: true})
  })
})

describe('template literal', () => {
  it('tokenizes a template with no expressions', () => {
    const r = tokenize('<div className={`foo bar`} />')
    expect(r).toEqual({branches: [['foo', 'bar']], complete: true})
  })

  it('tokenizes static parts and marks incomplete when expressions present', () => {
    const r = tokenize('<div className={`foo ${x} bar`} />')
    expect(r?.branches).toEqual([['foo', 'bar']])
    expect(r?.complete).toBe(false)
  })

  it('handles multiple expressions in a template', () => {
    const r = tokenize('<div className={`px-${pad} py-${pad} bg-muted`} />')
    expect(r?.complete).toBe(false)
    expect(r?.branches[0]).toContain('bg-muted')
  })
})

describe('conditional expression', () => {
  it('emits both branches', () => {
    const r = tokenize('<div className={cond ? "foo bar" : "baz"} />')
    expect(r?.branches).toEqual([['foo', 'bar'], ['baz']])
    expect(r?.complete).toBe(true)
  })

  it('mirrors WS8 InternalHero.tsx no-image branch (post-Commit 1)', () => {
    const r = tokenize(
      '<section className={!hasImage && (isDark ? "bg-brand-dark" : "bg-background")} />',
    )
    // Logical && on (cond ? a : b): the truthy branch gives ternary's branches,
    // the falsy branch gives []. So branches = ['bg-brand-dark'], ['bg-background'], [].
    expect(r?.complete).toBe(true)
    expect(r?.branches).toContainEqual(['bg-brand-dark'])
    expect(r?.branches).toContainEqual(['bg-background'])
    expect(r?.branches).toContainEqual([])
  })
})

describe('logical &&', () => {
  it('emits truthy branch + empty falsy branch', () => {
    const r = tokenize('<div className={cond && "foo"} />')
    expect(r?.branches).toEqual([['foo'], []])
    expect(r?.complete).toBe(true)
  })

  it('marks incomplete when right side is opaque', () => {
    const r = tokenize('<div className={cond && someVar} />')
    expect(r?.complete).toBe(false)
  })
})

describe('logical || / ??', () => {
  it('|| unions both sides', () => {
    const r = tokenize('<div className={alpha || "fallback"} />')
    expect(r?.branches).toContainEqual(['fallback'])
    // alpha is opaque → its branch is []
    expect(r?.branches).toContainEqual([])
    expect(r?.complete).toBe(false)
  })

  it('?? unions both sides', () => {
    const r = tokenize('<div className={alpha ?? "fallback"} />')
    expect(r?.branches).toContainEqual(['fallback'])
    expect(r?.complete).toBe(false)
  })
})

describe('array.join — WS8 production patterns', () => {
  it('plain array .join(" ")', () => {
    const r = tokenize('<div className={["foo", "bar"].join(" ")} />')
    expect(r).toEqual({branches: [['foo', 'bar']], complete: true})
  })

  it('array.filter(Boolean).join(" ") — InternalHero.tsx pattern', () => {
    const r = tokenize(
      '<div className={["foo", cond && "bar", "baz"].filter(Boolean).join(" ")} />',
    )
    // Cross-product: ['foo'] × (['bar'] | []) × ['baz']
    //   → ['foo', 'bar', 'baz'] | ['foo', 'baz']
    expect(r?.complete).toBe(true)
    expect(r?.branches).toContainEqual(['foo', 'bar', 'baz'])
    expect(r?.branches).toContainEqual(['foo', 'baz'])
  })

  it('mirrors the actual InternalHero.tsx:53-59 className shape', () => {
    const r = tokenize(`<section className={[
      'relative px-[5%] pb-12 md:pb-16 lg:pb-20',
      '[--hero-pt:2rem] md:[--hero-pt:3rem] lg:[--hero-pt:4rem]',
      !hasImage && (isDark ? 'bg-brand-dark' : 'bg-background'),
    ].filter(Boolean).join(' ')} />`)
    expect(r?.complete).toBe(true)
    // Must include both the dark fallback path and the light fallback path
    // somewhere in the branches set.
    const flat = r?.branches.flat() ?? []
    expect(flat).toContain('bg-brand-dark')
    expect(flat).toContain('bg-background')
    expect(flat).toContain('relative')
    expect(flat).toContain('px-[5%]')
    // No-image-false branch should exist (no bg- token from the conditional).
    expect(r?.branches.some((b: string[]) =>
      !b.includes('bg-brand-dark') && !b.includes('bg-background'),
    )).toBe(true)
  })
})

describe('clsx-style call expressions', () => {
  it('tokenizes cn("foo", "bar")', () => {
    const r = tokenize('<div className={cn("foo", "bar")} />')
    expect(r).toEqual({branches: [['foo', 'bar']], complete: true})
  })

  it('tokenizes clsx with a conditional arg, marking incomplete on opaque', () => {
    const r = tokenize('<div className={clsx("foo", cond && "bar", maybe)} />')
    expect(r?.branches[0]).toContain('foo')
    expect(r?.branches[0]).toContain('bar')
    expect(r?.complete).toBe(false)
  })

  it('handles classNames(...)', () => {
    const r = tokenize('<div className={classNames("a", "b")} />')
    expect(r).toEqual({branches: [['a', 'b']], complete: true})
  })
})

describe('opaque expressions', () => {
  it('returns one empty incomplete branch for plain identifier', () => {
    const r = tokenize('<div className={maybeClasses} />')
    expect(r).toEqual({branches: [[]], complete: false})
  })

  it('returns empty incomplete branch for member expression', () => {
    const r = tokenize('<div className={styles.foo} />')
    expect(r).toEqual({branches: [[]], complete: false})
  })

  it('returns empty incomplete branch for unknown call', () => {
    const r = tokenize('<div className={getClasses(x)} />')
    expect(r).toEqual({branches: [[]], complete: false})
  })
})

describe('null / no-attribute behavior', () => {
  it('returns null when attr is missing', () => {
    const opening = parseJSXOpening('<div />')
    const attr = findAttribute(opening, 'className')
    expect(attr).toBeNull()
    expect(tokenizeClassNameAttribute(attr)).toBeNull()
  })

  it('returns null for null input', () => {
    expect(tokenizeClassNameAttribute(null)).toBeNull()
    expect(tokenizeClassNameValue(null)).toBeNull()
  })
})

// ─── Predicate helpers ───────────────────────────────────────────────────────

describe('anyBranchContains', () => {
  it('returns true when token in any branch', () => {
    const r = tokenize('<div className={cond ? "foo bar" : "baz"} />')
    expect(anyBranchContains(r, 'foo')).toBe(true)
    expect(anyBranchContains(r, 'baz')).toBe(true)
  })

  it('returns false when token absent', () => {
    const r = tokenize('<div className={cond ? "foo" : "bar"} />')
    expect(anyBranchContains(r, 'nope')).toBe(false)
  })

  it('returns false on null input', () => {
    expect(anyBranchContains(null, 'foo')).toBe(false)
  })
})

describe('everyBranchContainsAnyOf — A2 cascade-aware semantic', () => {
  it('passes when all branches contain at least one cascade-aware token', () => {
    const r = tokenize('<h1 className={isDark ? "text-foreground" : "text-foreground"}>x</h1>')
    expect(everyBranchContainsAnyOf(r, ['text-foreground'])).toBe(true)
  })

  it('fails when one branch is missing the required token', () => {
    const r = tokenize('<h1 className={isDark ? "text-foreground" : "font-bold"}>x</h1>')
    expect(everyBranchContainsAnyOf(r, ['text-foreground'])).toBe(false)
  })

  it('passes when token appears in branch with other tokens', () => {
    const r = tokenize('<h1 className="mb-4 text-foreground font-bold">x</h1>')
    expect(everyBranchContainsAnyOf(r, ['text-foreground'])).toBe(true)
  })

  it('passes if any of multiple acceptable tokens appears in every branch', () => {
    const r = tokenize('<h1 className={isDark ? "text-foreground-muted" : "text-foreground"}>x</h1>')
    expect(everyBranchContainsAnyOf(r, ['text-foreground', 'text-foreground-muted'])).toBe(true)
  })
})

describe('noBranchContains — T2 manual-cascade-override semantic', () => {
  it('passes when token never appears', () => {
    const r = tokenize('<div className="text-foreground border-border" />')
    expect(noBranchContains(r, 'text-foreground-on-dark')).toBe(true)
  })

  it('fails when token appears in any branch', () => {
    const r = tokenize('<div className={isDark ? "text-foreground-on-dark" : "text-foreground"} />')
    expect(noBranchContains(r, 'text-foreground-on-dark')).toBe(false)
  })

  it('correctly distinguishes text-foreground-muted from text-foreground (no substring match)', () => {
    // The tokenizer splits on whitespace into individual tokens — `text-foreground-muted`
    // is a single token, not "text-foreground" + "-muted". Critical for A2: a className
    // containing `text-foreground-muted` must NOT satisfy a "contains text-foreground"
    // check via substring.
    const r = tokenize('<div className="text-foreground-muted mb-2" />')
    expect(anyBranchContains(r, 'text-foreground')).toBe(false)
    expect(anyBranchContains(r, 'text-foreground-muted')).toBe(true)
  })
})
