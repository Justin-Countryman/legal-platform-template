// Test helper — parse a JSX expression to AST and surface the JSXAttribute
// for a given attribute name.
//
// Tests pass a JSX string like `<div className="foo" />`, this helper parses
// it via @typescript-eslint/parser and returns the JSXAttribute node so
// className-tokenizer / ast-utils tests can run their utility-under-test on
// realistic AST shapes.
//
// Per WS8 Commit 0a Decision 1: this helper traverses an opaque-shape AST
// graph; nodes are typed as `unknown` and accessed via `Record<string, unknown>`
// casts at use site, matching the platform's WS7 Cat 6A pattern.

import {parse} from '@typescript-eslint/parser'

type Tree = Record<string, unknown>
type MaybeTree = Tree | null

/**
 * Parse a JSX snippet and return the first JSXOpeningElement found.
 * The snippet is treated as an expression statement.
 */
export function parseJSXOpening(jsx: string): MaybeTree {
  const wrapped = `const _x = ${jsx}`
  const ast = parse(wrapped, {
    jsx: true,
    loc: false,
    range: false,
    sourceType: 'module',
    ecmaVersion: 'latest',
  }) as unknown as Tree
  return findFirstNode(ast, (n) => (n as Tree | null)?.type === 'JSXOpeningElement')
}

/**
 * Parse a JSX snippet and return the first JSXElement found.
 */
export function parseJSXElement(jsx: string): MaybeTree {
  const wrapped = `const _x = ${jsx}`
  const ast = parse(wrapped, {
    jsx: true,
    loc: false,
    range: false,
    sourceType: 'module',
    ecmaVersion: 'latest',
  }) as unknown as Tree
  attachParents(ast)
  return findFirstNode(ast, (n) => (n as Tree | null)?.type === 'JSXElement')
}

/**
 * Get the JSXAttribute named `attrName` from a JSXOpeningElement.
 */
export function findAttribute(opening: MaybeTree, attrName: string): MaybeTree {
  const attrs = (opening as Tree | null)?.attributes as Tree[] | undefined
  if (!attrs) return null
  for (const attr of attrs) {
    const a = attr as Tree
    if (
      a?.type === 'JSXAttribute' &&
      (a.name as Tree | undefined)?.name === attrName
    ) {
      return a
    }
  }
  return null
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function findFirstNode(node: unknown, pred: (n: unknown) => boolean): MaybeTree {
  if (!node || typeof node !== 'object') return null
  if (pred(node)) return node as Tree
  const obj = node as Tree
  for (const key of Object.keys(obj)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue
    const v = obj[key]
    if (Array.isArray(v)) {
      for (const item of v) {
        const found = findFirstNode(item, pred)
        if (found) return found
      }
    } else if (v && typeof v === 'object') {
      const found = findFirstNode(v, pred)
      if (found) return found
    }
  }
  return null
}

function attachParents(root: unknown, parent: Tree | null = null): void {
  if (!root || typeof root !== 'object') return
  const obj = root as Tree
  if (parent != null) obj.parent = parent
  for (const key of Object.keys(obj)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue
    const v = obj[key]
    if (Array.isArray(v)) {
      for (const item of v) attachParents(item, obj)
    } else if (v && typeof v === 'object' && (v as Tree).type) {
      attachParents(v, obj)
    }
  }
}
