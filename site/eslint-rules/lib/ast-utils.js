// ast-utils
//
// Common AST traversal helpers for WS8 platform rules. Most rules need to:
//   - find a JSX element's `className` attribute
//   - check whether a JSX element is nested inside an ancestor of a given
//     name (for HTML-spec-correct landmark scoping, e.g., A3 footer rule)
//   - dispatch on JSX element name
//
// These helpers operate on AST nodes from `@typescript-eslint/parser` (which
// matches the ESTree shape augmented with JSX nodes).

'use strict'

// ─── className attribute lookup ──────────────────────────────────────────────

/**
 * Find the `className` attribute on a JSXOpeningElement.
 *
 * @param {object|null|undefined} openingElement — JSXOpeningElement node
 * @returns {object|null} the JSXAttribute node, or null if not present
 */
function getClassNameAttribute(openingElement) {
  if (!openingElement || !Array.isArray(openingElement.attributes)) return null
  for (const attr of openingElement.attributes) {
    if (
      attr.type === 'JSXAttribute' &&
      attr.name?.type === 'JSXIdentifier' &&
      attr.name.name === 'className'
    ) {
      return attr
    }
  }
  return null
}

/**
 * Find an attribute on a JSXOpeningElement by name.
 *
 * @param {object|null|undefined} openingElement — JSXOpeningElement node
 * @param {string} name — attribute name
 * @returns {object|null} the JSXAttribute node, or null if not present
 */
function getAttribute(openingElement, name) {
  if (!openingElement || !Array.isArray(openingElement.attributes)) return null
  for (const attr of openingElement.attributes) {
    if (
      attr.type === 'JSXAttribute' &&
      attr.name?.type === 'JSXIdentifier' &&
      attr.name.name === name
    ) {
      return attr
    }
  }
  return null
}

/**
 * Get the static string value of a JSXAttribute, when one can be extracted.
 * Returns the literal string for `attr="foo"` and `attr={"foo"}`. Returns
 * `null` for any expression we can't statically resolve to a single string
 * (template literals with interpolations, conditionals, calls, etc.).
 *
 * @param {object|null} attr — JSXAttribute or null
 * @returns {string|null}
 */
function getStaticStringAttributeValue(attr) {
  if (!attr || attr.type !== 'JSXAttribute' || !attr.value) return null
  if (attr.value.type === 'Literal' && typeof attr.value.value === 'string') {
    return attr.value.value
  }
  if (attr.value.type === 'JSXExpressionContainer') {
    const expr = attr.value.expression
    if (expr?.type === 'Literal' && typeof expr.value === 'string') {
      return expr.value
    }
    if (expr?.type === 'TemplateLiteral' && (expr.expressions?.length ?? 0) === 0) {
      return (expr.quasis ?? []).map((q) => q.value?.cooked ?? '').join('')
    }
  }
  return null
}

// ─── JSX element name dispatch ───────────────────────────────────────────────

/**
 * Get the name of a JSXOpeningElement as a string (e.g., 'div', 'h1',
 * 'Tagline'). Returns null for member expressions (`<Foo.Bar>`) and
 * namespaces (`<svg:path>`).
 *
 * @param {object|null|undefined} openingElement — JSXOpeningElement node
 * @returns {string|null}
 */
function getJSXElementName(openingElement) {
  if (!openingElement || !openingElement.name) return null
  if (openingElement.name.type === 'JSXIdentifier') {
    return openingElement.name.name
  }
  return null
}

/**
 * Test whether a JSXElement's tag name matches one of the provided strings.
 *
 * @param {object|null|undefined} element — JSXElement node
 * @param {string[]} names — element names to match
 * @returns {boolean}
 */
function isJSXElementNamed(element, names) {
  if (!element || element.type !== 'JSXElement') return false
  const name = getJSXElementName(element.openingElement)
  return name != null && names.includes(name)
}

// ─── Ancestor traversal ──────────────────────────────────────────────────────

/**
 * Walk up the AST from `node` looking for a JSXElement that satisfies
 * `predicate`. Skips non-JSX nodes (control flow, etc.). Returns the first
 * matching JSXElement, or null if none found.
 *
 * @param {object|null|undefined} node — starting AST node (typically a JSXElement)
 * @param {(el: object) => boolean} predicate
 * @returns {object|null}
 */
function findAncestorJSXElement(node, predicate) {
  let cur = node?.parent
  while (cur) {
    if (cur.type === 'JSXElement' && predicate(cur)) return cur
    cur = cur.parent
  }
  return null
}

/**
 * Convenience: is the node nested inside ANY of the named JSX elements?
 * Useful for "this <footer> is inside an <article> so it's not a landmark"
 * checks (A3 rule).
 *
 * @param {object|null|undefined} node
 * @param {string[]} ancestorNames — JSX element names that, if found as an
 *                                    ancestor, return true
 * @returns {boolean}
 */
function hasAncestorOfName(node, ancestorNames) {
  return findAncestorJSXElement(node, (el) => isJSXElementNamed(el, ancestorNames)) != null
}

// ─── First-child accessor ────────────────────────────────────────────────────

/**
 * Get the first non-whitespace, non-comment child of a JSXElement.
 * Used by A3 to assert a `<footer>`'s first child is the sr-only h2.
 *
 * @param {object|null|undefined} element — JSXElement node
 * @returns {object|null} a JSXElement, JSXFragment, or JSXExpressionContainer;
 *                        null if no meaningful child is found
 */
function getFirstSubstantiveChild(element) {
  if (!element || !Array.isArray(element.children)) return null
  for (const child of element.children) {
    if (child.type === 'JSXText') {
      // JSX text — skip if it's only whitespace
      if ((child.value ?? '').trim() === '') continue
      return child
    }
    if (child.type === 'JSXEmptyExpression') continue
    return child
  }
  return null
}

module.exports = {
  getClassNameAttribute,
  getAttribute,
  getStaticStringAttributeValue,
  getJSXElementName,
  isJSXElementNamed,
  findAncestorJSXElement,
  hasAncestorOfName,
  getFirstSubstantiveChild,
}
