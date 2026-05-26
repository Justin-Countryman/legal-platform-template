// ast-utils — vitest fixtures.

import {describe, it, expect} from 'vitest'
import {parseJSXOpening, parseJSXElement, findAttribute} from './parse-jsx'

import {
  getClassNameAttribute,
  getAttribute,
  getStaticStringAttributeValue,
  getJSXElementName,
  isJSXElementNamed,
  findAncestorJSXElement,
  hasAncestorOfName,
  getFirstSubstantiveChild,
} from '../lib/ast-utils.js'

// AST nodes are opaque to TS at this surface — `Record<string, unknown>` keeps
// JSDoc-typed `object` returns navigable from tests via use-site casts.
// Matches the WS7 Cat 6A platform pattern.
type Node = Record<string, unknown>

describe('getClassNameAttribute', () => {
  it('returns the attribute when present', () => {
    const opening = parseJSXOpening('<div className="foo" id="x" />')
    const attr = getClassNameAttribute(opening) as Node | null
    expect(attr?.type).toBe('JSXAttribute')
    expect((attr?.name as Node | undefined)?.name).toBe('className')
  })

  it('returns null when className is absent', () => {
    const opening = parseJSXOpening('<div id="x" />')
    expect(getClassNameAttribute(opening)).toBeNull()
  })
})

describe('getAttribute', () => {
  it('finds named attributes', () => {
    const opening = parseJSXOpening('<footer aria-labelledby="footer-heading" data-x="y" />')
    const aria = getAttribute(opening, 'aria-labelledby') as Node | null
    const dataX = getAttribute(opening, 'data-x') as Node | null
    expect((aria?.name as Node | undefined)?.name).toBe('aria-labelledby')
    expect((dataX?.name as Node | undefined)?.name).toBe('data-x')
    expect(getAttribute(opening, 'missing')).toBeNull()
  })
})

describe('getStaticStringAttributeValue', () => {
  it('extracts plain string', () => {
    const opening = parseJSXOpening('<div className="foo" />')
    const attr = findAttribute(opening, 'className')
    expect(getStaticStringAttributeValue(attr)).toBe('foo')
  })

  it('extracts string from expression container', () => {
    const opening = parseJSXOpening('<div className={"foo"} />')
    const attr = findAttribute(opening, 'className')
    expect(getStaticStringAttributeValue(attr)).toBe('foo')
  })

  it('extracts static template literal', () => {
    const opening = parseJSXOpening('<div className={`foo bar`} />')
    const attr = findAttribute(opening, 'className')
    expect(getStaticStringAttributeValue(attr)).toBe('foo bar')
  })

  it('returns null for dynamic template', () => {
    const opening = parseJSXOpening('<div className={`foo ${x}`} />')
    const attr = findAttribute(opening, 'className')
    expect(getStaticStringAttributeValue(attr)).toBeNull()
  })

  it('returns null for ternary', () => {
    const opening = parseJSXOpening('<div className={c ? "a" : "b"} />')
    const attr = findAttribute(opening, 'className')
    expect(getStaticStringAttributeValue(attr)).toBeNull()
  })

  it('returns null when attr is null', () => {
    expect(getStaticStringAttributeValue(null)).toBeNull()
  })
})

describe('getJSXElementName / isJSXElementNamed', () => {
  it('returns lowercase HTML element names', () => {
    const opening = parseJSXOpening('<footer />')
    expect(getJSXElementName(opening)).toBe('footer')
  })

  it('returns capitalized component names', () => {
    const opening = parseJSXOpening('<Tagline />')
    expect(getJSXElementName(opening)).toBe('Tagline')
  })

  it('returns null for member expression names (Foo.Bar)', () => {
    const opening = parseJSXOpening('<Dialog.Panel />')
    expect(getJSXElementName(opening)).toBeNull()
  })

  it('isJSXElementNamed dispatches correctly', () => {
    const el = parseJSXElement('<footer />')
    expect(isJSXElementNamed(el, ['footer'])).toBe(true)
    expect(isJSXElementNamed(el, ['header', 'footer'])).toBe(true)
    expect(isJSXElementNamed(el, ['header'])).toBe(false)
  })
})

describe('findAncestorJSXElement / hasAncestorOfName', () => {
  it('finds direct parent JSXElement', () => {
    const root = parseJSXElement('<article><footer /></article>') as Node
    // Walk down to the inner footer
    const children = root.children as Node[] | undefined
    const inner = children?.find((c) => c.type === 'JSXElement')
    expect(inner).toBeDefined()
    const ancestor = findAncestorJSXElement(inner, (el) => isJSXElementNamed(el, ['article']))
    expect(ancestor).toBe(root)
  })

  it('returns null when no ancestor matches', () => {
    const root = parseJSXElement('<div><footer /></div>') as Node
    const children = root.children as Node[] | undefined
    const inner = children?.find((c) => c.type === 'JSXElement')
    expect(findAncestorJSXElement(inner, (el) => isJSXElementNamed(el, ['article']))).toBeNull()
  })

  it('hasAncestorOfName matches multiple candidate names', () => {
    const root = parseJSXElement('<section><footer /></section>') as Node
    const children = root.children as Node[] | undefined
    const inner = children?.find((c) => c.type === 'JSXElement')
    expect(hasAncestorOfName(inner, ['article', 'section', 'aside'])).toBe(true)
  })

  it('hasAncestorOfName — A3 use case (footer inside article = not a landmark)', () => {
    // Mirrors TestimonialCard.tsx: <article>...<footer>...</footer></article>
    const root = parseJSXElement('<article className="testimonial"><h3>x</h3><footer className="byline">y</footer></article>') as Node
    const children = root.children as Node[] | undefined
    const footer = children?.find((c) => {
      const opening = c.openingElement as Node | undefined
      const name = opening?.name as Node | undefined
      return c.type === 'JSXElement' && name?.name === 'footer'
    })
    expect(footer).toBeDefined()
    expect(hasAncestorOfName(footer, ['article', 'aside', 'section'])).toBe(true)
  })

  it('hasAncestorOfName — A3 use case (top-level footer = landmark)', () => {
    // Mirrors a layout footer at the top of the tree.
    const root = parseJSXElement('<footer><div>x</div></footer>')
    expect(hasAncestorOfName(root, ['article', 'aside', 'section'])).toBe(false)
  })
})

describe('getFirstSubstantiveChild', () => {
  it('skips whitespace text and returns first JSX element', () => {
    const root = parseJSXElement('<footer>\n  <h2 className="sr-only">Footer</h2>\n  <div>body</div>\n</footer>')
    const first = getFirstSubstantiveChild(root) as Node | null
    expect(first?.type).toBe('JSXElement')
    const opening = first?.openingElement as Node | undefined
    const name = opening?.name as Node | undefined
    expect(name?.name).toBe('h2')
  })

  it('returns the first non-whitespace text when text precedes elements', () => {
    const root = parseJSXElement('<footer>x<div>y</div></footer>')
    const first = getFirstSubstantiveChild(root) as Node | null
    expect(first?.type).toBe('JSXText')
  })

  it('returns null when only whitespace children', () => {
    const root = parseJSXElement('<footer>   </footer>')
    const first = getFirstSubstantiveChild(root)
    expect(first).toBeNull()
  })
})
