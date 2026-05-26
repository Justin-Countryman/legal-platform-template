// collection-grid-list-semantics (A4)
//
// Card grids of collections — homogeneous items rendered from a data
// array — must use `<ul role="list">` + `<li>`, not `<div className="grid">`
// (and not `<ul>` without an explicit `role="list"`).
//
// Posture lock per `BI-PRINCIPLES.md → Collections and lists`:
//
//   > Card grids of people / collections / items render as
//   > `<ul role="list">` + `<li>`, never as `<div className="grid">`.
//   > CSS grid styling applies to the `<ul>` instead of the `<div>` —
//   > same visual result, list semantics restored.
//   >
//   > The `role="list"` is required because some browsers (Safari with
//   > VoiceOver) strip implicit list semantics when `list-style: none`
//   > is applied.
//   >
//   > Applies to: attorney index, staff index, blog index, testimonials
//   > grid, badge grids, location card grids — any card grid representing
//   > a collection of similar items.
//
//   Locked in WS7 Commit 2 (2C).
//
// Cross-cited in `skill-component-patterns → Collection card grid (people /
// items lists)`.
//
// Two violation shapes (granular messageIds):
//
//   - `divToUl` — <div className="grid grid-cols-..."> with .map() child:
//     should be <ul role="list" aria-label="..."> + <li> wrapping each
//     mapped child.
//
//   - `ulMissingRole` — <ul className="grid grid-cols-..."> with .map()
//     child but no `role="list"`: just add the role attribute. Required
//     for Safari/VoiceOver list-semantics preservation.
//
// Detection heuristic:
//
//   1. Element name is 'div' or 'ul' (the two production shapes —
//      section / article / aside aren't expected and pragmatically
//      out of scope).
//   2. className contains both `grid` and a `grid-cols-...` token (in
//      ANY branch — variant prefixes accepted).
//   3. Element has exactly ONE substantive child (whitespace-only
//      JSXText nodes ignored).
//   4. The substantive child is a JSXExpressionContainer wrapping a
//      CallExpression whose final method is `.map(...)`.
//   5. The `.map()` callee object is NOT an ArrayExpression literal.
//      `[0, 1, 2].map((col) =>)` is a structural-iteration pattern
//      (synthetic index, not a content collection); skip — false-
//      negatives over false-positives per WS8 audit posture.
//
// Auto-fix: NOT provided. The fix is a JSX restructure (rename
// element + wrap each map child in <li> + move keys + add aria-label);
// non-trivial to express as a fixer correctly. Report-only.

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {
  getClassNameAttribute,
  getJSXElementName,
  getAttribute,
  getStaticStringAttributeValue,
  getFirstSubstantiveChild,
} = require('../lib/ast-utils')

/**
 * Strip Tailwind variant prefixes (md:, hover:, etc.) from a className token.
 * @param {string} token
 */
function stripVariantPrefixes(token) {
  const idx = token.lastIndexOf(':')
  return idx >= 0 ? token.slice(idx + 1) : token
}

/**
 * Does the className have BOTH a `grid` token AND a `grid-cols-…` token
 * (across any branch, ignoring variant prefixes)?
 */
function classNameLooksLikeGrid(result) {
  if (!result) return false
  for (const branch of result.branches) {
    let hasGrid = false
    let hasGridCols = false
    for (const token of branch) {
      const bare = stripVariantPrefixes(token)
      if (bare === 'grid') hasGrid = true
      if (bare.startsWith('grid-cols-')) hasGridCols = true
    }
    if (hasGrid && hasGridCols) return true
  }
  // Common shape: `grid` token in unprefixed form, `sm:grid-cols-2` in
  // prefixed form. Accept that too — the variant strip above already
  // handles it, but if branches differ, scan flatly across all tokens.
  const allTokens = result.branches.flat()
  const hasGrid = allTokens.some((t) => stripVariantPrefixes(t) === 'grid')
  const hasGridCols = allTokens.some((t) =>
    stripVariantPrefixes(t).startsWith('grid-cols-'),
  )
  return hasGrid && hasGridCols
}

/**
 * Walk an expression chain (peeling off LogicalExpression `&&`,
 * ChainExpression `?.`) and check whether the unwrapped expression is a
 * `.map()` call whose callee object is NOT an ArrayExpression.
 *
 * Returns true if the expression IS a collection-style `.map()` call
 * (data iteration); false if it's a structural [0,1,2].map() / not a
 * .map() at all / opaque.
 */
function isCollectionMapExpression(expr) {
  if (!expr) return false
  // Unwrap logical-and: `cond && data.map(...)` → use the right side
  if (expr.type === 'LogicalExpression' && expr.operator === '&&') {
    return isCollectionMapExpression(expr.right)
  }
  // Unwrap optional chain: `data?.map(...)` is wrapped in ChainExpression
  if (expr.type === 'ChainExpression') {
    return isCollectionMapExpression(expr.expression)
  }
  // The actual .map() check
  if (expr.type !== 'CallExpression') return false
  const callee = expr.callee
  if (
    !callee ||
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property?.type !== 'Identifier' ||
    callee.property.name !== 'map'
  ) {
    return false
  }
  // Refined heuristic (WS8 Commit 15 — Decision 2C): skip when the map
  // is over an ArrayExpression literal like `[0, 1, 2].map((col) =>)`.
  // That's structural iteration, not a content collection.
  const obj = callee.object
  if (obj?.type === 'ArrayExpression') return false
  return true
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Card grids of collections must use <ul role="list"> + <li>, never <div className="grid">',
      recommended: false,
      url: 'BI/BI-PRINCIPLES.md#collections-and-lists',
    },
    schema: [],
    messages: {
      divToUl:
        '<div className="grid grid-cols-..."> rendering a .map() collection should be <ul role="list" aria-label="..."> with each mapped child wrapped in <li>. CSS grid styling applies to the <ul> identically. See BI-PRINCIPLES.md → Collections and lists.',
      ulMissingRole:
        '<ul className="grid grid-cols-..."> rendering a .map() collection requires `role="list"`. Some browsers (Safari with VoiceOver) strip implicit list semantics when `list-style: none` is applied; the explicit role restores list-semantics for AT users. See BI-PRINCIPLES.md → Collections and lists.',
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        const name = getJSXElementName(node.openingElement)
        if (name !== 'div' && name !== 'ul') return

        // Must look like a CSS grid (className has grid + grid-cols-)
        const classNameAttr = getClassNameAttribute(node.openingElement)
        if (!classNameAttr) return
        const tokens = tokenizeClassNameAttribute(classNameAttr)
        if (!classNameLooksLikeGrid(tokens)) return

        // Must have exactly ONE substantive child, and it must be a
        // JSXExpressionContainer wrapping a collection .map() call.
        const firstChild = getFirstSubstantiveChild(node)
        if (!firstChild || firstChild.type !== 'JSXExpressionContainer') return
        if (!isCollectionMapExpression(firstChild.expression)) return

        // Verify there's only ONE substantive child (no other siblings
        // before/after the .map() expression). Children other than
        // whitespace-only JSXText would mean this isn't a pure
        // collection grid — skip to avoid false positives.
        let substantiveCount = 0
        for (const child of node.children ?? []) {
          if (child.type === 'JSXText') {
            if ((child.value ?? '').trim() === '') continue
            substantiveCount++
          } else {
            substantiveCount++
          }
          if (substantiveCount > 1) return
        }

        if (name === 'div') {
          context.report({node: node.openingElement, messageId: 'divToUl'})
          return
        }

        // name === 'ul' — check role="list"
        const roleAttr = getAttribute(node.openingElement, 'role')
        const roleValue = getStaticStringAttributeValue(roleAttr)
        if (roleValue !== 'list') {
          context.report({
            node: node.openingElement,
            messageId: 'ulMissingRole',
          })
        }
      },
    }
  },
}
