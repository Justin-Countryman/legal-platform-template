// className-tokenizer
//
// Extract Tailwind class tokens from a JSX `className` attribute value, grouped
// by code path (branch). Each branch represents one possible runtime outcome
// of the className expression — so a `<div className={cond ? 'a' : 'b'}>`
// tokenizes to two branches `[['a'], ['b']]`.
//
// Rules consume this output to apply per-rule semantics:
//
//   - Token-must-be-present-in-every-branch (e.g., A2 cascade-aware heading
//     rule — every code path must include a cascade-aware text token).
//   - Token-must-not-appear-in-any-branch (e.g., T2 manual-cascade-override
//     rule — no branch may contain `text-foreground-on-dark`).
//   - Token-presence-anywhere (e.g., A8 mobile h1 cap — flag if any branch
//     contains `text-Nxl` without a breakpoint prefix).
//
// Complete vs incomplete:
//
//   - `complete: true`  — the tokenizer fully understood the expression. Rules
//                          can apply strict semantics with no false-positive
//                          risk on this site.
//   - `complete: false` — at least one branch contains an opaque sub-expression
//                          (an interpolation, a non-array call, a member
//                          access on an unknown shape). The tokens we returned
//                          are correct AS FAR AS WE COULD SEE; rules should
//                          decide whether to flag or skip on opaque branches.
//
// Returns `null` when the AST node isn't a className attribute value at all.
//
// Supported expression shapes (production patterns observed in reference builds):
//   - Literal strings: `className="foo bar"`
//   - Template literals (with or without expressions)
//   - Conditional expressions: `cond ? 'a' : 'b'`
//   - Logical AND: `cond && 'a'`         → branches `[['a'], []]`
//   - Logical OR:  `a || 'fallback'`     → branches union of both
//   - Logical ??:  `a ?? 'fallback'`     → branches union of both
//   - Array.join: `['a', 'b'].join(' ')` and `[...].filter(Boolean).join(' ')`
//   - Identifier-only call args: `cn('a', 'b')` / `clsx('a', 'b')` — concat
//     literal args; non-literal args mark complete=false
//
// Future shapes (not yet implemented; rule authors can extend):
//   - Object-style class maps (`{a: cond}` from clsx-shaped libs)
//   - Spread elements in arrays
//   - Tagged template literals

'use strict'

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Tokenize a JSX `className` attribute value.
 *
 * @param {object|null|undefined} attrValue — the JSXAttribute's `value` field,
 *                                            or a JSXExpressionContainer's
 *                                            `expression`, or any expression
 *                                            node a recursive call lands on.
 * @returns {{ branches: string[][], complete: boolean } | null}
 *          - `null` when input is null/undefined or shape isn't recognizable
 *            as an expression we can reason about.
 *          - `{ branches, complete }` otherwise. `branches` is non-empty.
 *            Each inner array contains the tokens KNOWN to be present in
 *            that runtime branch (excluding empty strings). `complete`
 *            is `false` if any sub-expression was opaque.
 */
function tokenizeClassNameValue(attrValue) {
  if (attrValue == null) return null

  // JSXAttribute value: either a Literal (string) or a JSXExpressionContainer.
  if (attrValue.type === 'Literal') {
    return tokenizeStringLiteral(attrValue.value)
  }
  if (attrValue.type === 'JSXExpressionContainer') {
    return tokenizeExpression(attrValue.expression)
  }
  // Already an expression — recurse via tokenizeExpression
  return tokenizeExpression(attrValue)
}

/**
 * Tokenize a JSXAttribute node directly, finding its value and dispatching.
 * Convenience wrapper for rule authors.
 *
 * @param {object|null|undefined} attrNode — a JSXAttribute AST node
 * @returns {{ branches: string[][], complete: boolean } | null}
 */
function tokenizeClassNameAttribute(attrNode) {
  if (!attrNode || attrNode.type !== 'JSXAttribute') return null
  return tokenizeClassNameValue(attrNode.value)
}

// ─── Private helpers ─────────────────────────────────────────────────────────

/**
 * @param {unknown} value
 * @returns {{ branches: string[][], complete: boolean }}
 */
function tokenizeStringLiteral(value) {
  if (typeof value !== 'string') {
    return {branches: [[]], complete: false}
  }
  return {branches: [tokenizeWhitespace(value)], complete: true}
}

/**
 * Split a Tailwind className string into individual tokens by whitespace.
 * Filters empty strings.
 *
 * @param {string} s
 * @returns {string[]}
 */
function tokenizeWhitespace(s) {
  return s.split(/\s+/).filter(Boolean)
}

/**
 * Tokenize an arbitrary expression node.
 *
 * @param {object|null|undefined} node
 * @returns {{ branches: string[][], complete: boolean } | null}
 */
function tokenizeExpression(node) {
  if (node == null) return null

  switch (node.type) {
    case 'Literal':
      return tokenizeStringLiteral(node.value)

    case 'TemplateLiteral':
      return tokenizeTemplateLiteral(node)

    case 'ConditionalExpression':
      return unionBranches(
        tokenizeExpression(node.consequent),
        tokenizeExpression(node.alternate),
      )

    case 'LogicalExpression':
      return tokenizeLogicalExpression(node)

    case 'CallExpression':
      return tokenizeCallExpression(node)

    case 'ArrayExpression':
      return tokenizeArrayExpression(node)

    // Anything else (Identifier, MemberExpression, BinaryExpression, etc.)
    // is opaque to us. Return one branch with no known tokens, marked
    // incomplete — rules can decide what to do.
    default:
      return {branches: [[]], complete: false}
  }
}

/**
 * Tokenize a template literal. Concatenates the static `quasi` parts; ignores
 * `${expr}` interpolations but marks the result incomplete if any are present.
 *
 * @param {object} node — TemplateLiteral
 */
function tokenizeTemplateLiteral(node) {
  const quasis = node.quasis ?? []
  const expressions = node.expressions ?? []
  const staticParts = quasis.map((q) => q.value?.cooked ?? '')
  const tokens = []
  for (const part of staticParts) {
    for (const t of tokenizeWhitespace(part)) tokens.push(t)
  }
  return {
    branches: [tokens],
    complete: expressions.length === 0,
  }
}

/**
 * Tokenize a `&&` / `||` / `??` logical expression.
 *
 * - `cond && 'a'`  → `[['a'], []]`        (truthy branch + empty falsy branch)
 * - `'a' || 'b'`   → `[['a'], ['b']]`     (either side could win)
 * - `expr ?? 'b'`  → `[branchesOfExpr, ['b']]`
 *
 * @param {object} node — LogicalExpression
 */
function tokenizeLogicalExpression(node) {
  const left = tokenizeExpression(node.left)
  const right = tokenizeExpression(node.right)

  if (node.operator === '&&') {
    // Truthy: result is right operand. Falsy: result is left operand
    // (which is falsy — at runtime it stringifies to 'false', '0', '',
    // or skipped by .filter(Boolean) chains; treat as empty branch).
    if (!right) return null
    return {
      branches: [...right.branches, []],
      complete: right.complete,
    }
  }

  // || and ??: either side could be the result
  return unionBranches(left, right)
}

/**
 * Tokenize an array expression. If used as `[...].join(' ')` (typically with
 * an optional `.filter(Boolean)` in between), the join collapses array
 * elements into a single concatenated branch — but each conditional element
 * (`cond && 'x'`) introduces a sub-branch.
 *
 * Strategy: for each array element, tokenize it. If any element produced
 * multiple branches, the array's branches are the cross-product (all
 * combinations of element branches). For typical clamp-on-conditional
 * patterns the cross-product stays small (2–4 branches).
 *
 * @param {object} node — ArrayExpression
 */
function tokenizeArrayExpression(node) {
  const elementResults = []
  let complete = true
  for (const el of node.elements ?? []) {
    if (el == null) continue // sparse element / hole
    const result = tokenizeExpression(el)
    if (!result) return {branches: [[]], complete: false}
    elementResults.push(result)
    if (!result.complete) complete = false
  }
  if (elementResults.length === 0) {
    return {branches: [[]], complete: true}
  }

  // Cross-product of branches across elements
  let branches = [[]]
  for (const r of elementResults) {
    const next = []
    for (const accum of branches) {
      for (const b of r.branches) {
        next.push([...accum, ...b])
      }
    }
    branches = next
  }
  return {branches, complete}
}

/**
 * Tokenize a call expression. Three patterns supported:
 *
 *   1. `<array>.join(...)` — recurse into the array, return its result.
 *      The join separator doesn't change which tokens are present.
 *   2. `<array>.filter(...).join(...)` — recurse into the array; rule
 *      authors can decide whether to fold falsy-element semantics for
 *      `.filter(Boolean)` calls, but as a default we treat the chain
 *      identically to plain `.join` (each element's branches still apply).
 *   3. `cn(...)` / `clsx(...)` / similar string-arg utility calls — concat
 *      all literal-string args; mark incomplete if any arg is non-literal.
 *
 * Anything else returns one empty branch with complete=false.
 *
 * @param {object} node — CallExpression
 */
function tokenizeCallExpression(node) {
  // <expr>.join(<sep>) or <expr>.filter(<pred>).join(<sep>)
  if (
    node.callee?.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property?.type === 'Identifier' &&
    node.callee.property.name === 'join'
  ) {
    const obj = node.callee.object
    // Strip a leading `.filter(Boolean)` if present
    if (
      obj?.type === 'CallExpression' &&
      obj.callee?.type === 'MemberExpression' &&
      !obj.callee.computed &&
      obj.callee.property?.type === 'Identifier' &&
      obj.callee.property.name === 'filter'
    ) {
      return tokenizeExpression(obj.callee.object)
    }
    return tokenizeExpression(obj)
  }

  // cn(...), clsx(...), classNames(...) — concat literal-string args
  if (node.callee?.type === 'Identifier') {
    const name = node.callee.name
    if (name === 'cn' || name === 'clsx' || name === 'classNames' || name === 'cx' || name === 'twMerge') {
      const tokens = []
      let complete = true
      for (const arg of node.arguments ?? []) {
        const r = tokenizeExpression(arg)
        if (!r) {
          complete = false
          continue
        }
        // Flatten branches into the single accumulator; rule authors can
        // upgrade this if they want per-arg branch tracking.
        for (const branch of r.branches) {
          for (const t of branch) tokens.push(t)
        }
        if (!r.complete) complete = false
      }
      return {branches: [tokens], complete}
    }
  }

  // Unknown call — opaque
  return {branches: [[]], complete: false}
}

/**
 * Union the branches of two tokenize results. Used by ternaries and `||`/`??`.
 *
 * @param {{branches: string[][], complete: boolean} | null} a
 * @param {{branches: string[][], complete: boolean} | null} b
 */
function unionBranches(a, b) {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  return {
    branches: [...a.branches, ...b.branches],
    complete: a.complete && b.complete,
  }
}

// ─── Convenience predicates for rule authors ─────────────────────────────────

/**
 * Does at least one branch contain `token`?
 *
 * @param {{branches: string[][]} | null} result
 * @param {string} token
 */
function anyBranchContains(result, token) {
  if (!result) return false
  return result.branches.some((b) => b.includes(token))
}

/**
 * Does every branch contain at least one of `tokens`?
 * Use this for "must be present" semantics like A2's cascade-aware heading rule.
 *
 * @param {{branches: string[][]} | null} result
 * @param {string[]} tokens
 */
function everyBranchContainsAnyOf(result, tokens) {
  if (!result) return false
  if (tokens.length === 0) return true
  return result.branches.every((b) => b.some((t) => tokens.includes(t)))
}

/**
 * Does no branch contain `token`?
 * Use this for "must not appear" semantics like T2's manual-cascade-override rule.
 *
 * @param {{branches: string[][]} | null} result
 * @param {string} token
 */
function noBranchContains(result, token) {
  if (!result) return true
  return !result.branches.some((b) => b.includes(token))
}

module.exports = {
  tokenizeClassNameValue,
  tokenizeClassNameAttribute,
  tokenizeWhitespace,
  // Predicates
  anyBranchContains,
  everyBranchContainsAnyOf,
  noBranchContains,
}
