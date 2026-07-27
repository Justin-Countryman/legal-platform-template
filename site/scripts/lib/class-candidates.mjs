// class-candidates — extract the class names a JSX file DEFINITELY contains.
//
// Used by scripts/check-unknown-utility-classes.mjs to find Tailwind utility
// names that do not exist. See that file's header for the failure mode.
//
// ─── Why this is not eslint-rules/lib/className-tokenizer.js ─────────────────
//
// The ESLint tokenizer answers "which tokens are present on each code path",
// which is what a token-presence rule (A2, T2, A8) needs. This check asks a
// stricter question: "which strings are certainly WHOLE class names", because
// feeding Tailwind a fragment produces a false report.
//
// The difference is template-literal interpolation. `bg-${tone}-500` has quasis
// ["bg-", "-500"]; the ESLint tokenizer concatenates static parts and yields
// the tokens "bg-" and "-500". Both are fragments of one runtime class, neither
// is a class, and both would resolve to no CSS — two false positives from one
// correct line. So this extractor tracks interpolation boundaries and drops the
// tokens that touch them, reporting them as SKIPPED instead.
//
// The platform's standing posture is false-negatives over false-positives (see
// eslint.config.mjs, heading-cascade-discipline). This module follows it: when
// in doubt, skip and count.
//
// ─── What is certainly a whole class ────────────────────────────────────────
//
//   className="a b"                  → a, b            (string literal)
//   className={`a b`}                → a, b            (no interpolation)
//   className={cond ? 'a' : 'b'}     → a, b            (both code paths)
//   className={cond && 'a'}          → a
//   className={cn('a', x, 'b')}      → a, b            (x skipped)
//   className={`a ${x} b`}           → a, b            (whitespace-separated)
//   className={`bg-${x}-500`}        → (nothing)       (both tokens fragments)
//   className={`${x} a`}             → a
//   className={styles.foo}           → (nothing)       (opaque)
//
// A token adjacent to an interpolation with no whitespace between them is a
// fragment and is never emitted.

'use strict'

/**
 * @typedef {{name: string, line: number}} Candidate
 * @typedef {{candidates: Candidate[], skipped: Skip[]}} Extraction
 * @typedef {{line: number, reason: string}} Skip
 */

/**
 * Extract whole class names from every `className` attribute in a parsed file.
 *
 * @param {object} ast — @typescript-eslint/parser AST (jsx: true, loc: true)
 * @returns {Extraction}
 */
export function extractClassCandidates(ast) {
  /** @type {Candidate[]} */ const candidates = []
  /** @type {Skip[]} */ const skipped = []

  for (const attr of findClassNameAttributes(ast)) {
    const line = attr.loc?.start?.line ?? 0
    const result = readValue(attr.value)
    for (const name of result.whole) candidates.push({name, line})
    for (const reason of result.opaque) skipped.push({line, reason})
  }

  return {candidates, skipped}
}

// ─── AST walk ────────────────────────────────────────────────────────────────

function* findClassNameAttributes(node) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const child of node) yield* findClassNameAttributes(child)
    return
  }
  if (node.type === 'JSXAttribute' && node.name?.name === 'className') {
    yield node
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue
    const value = node[key]
    if (value && typeof value === 'object') yield* findClassNameAttributes(value)
  }
}

// ─── Expression reading ──────────────────────────────────────────────────────
//
// Every reader returns {whole: string[], opaque: string[]}. `whole` holds names
// we are certain about; `opaque` holds a short reason per construct we could
// not read, so the CLI can report the size of the blind spot rather than hide it.

const nothing = () => ({whole: [], opaque: []})
const merge = (...results) => ({
  whole: results.flatMap((r) => r.whole),
  opaque: results.flatMap((r) => r.opaque),
})

function readValue(value) {
  if (value == null) return nothing() // <div className /> — no value
  if (value.type === 'Literal') return readStringLiteral(value.value)
  if (value.type === 'JSXExpressionContainer') return readExpression(value.expression)
  return readExpression(value)
}

function readExpression(node) {
  if (node == null) return nothing()

  switch (node.type) {
    case 'Literal':
      return readStringLiteral(node.value)

    case 'TemplateLiteral':
      return readTemplateLiteral(node)

    // Both arms are reachable, so both contribute whole names.
    case 'ConditionalExpression':
      return merge(readExpression(node.consequent), readExpression(node.alternate))

    // `a && 'x'` / `a || 'x'` / `a ?? 'x'` — the string operands are reachable
    // as-written. A non-string operand falls through to the opaque default.
    case 'LogicalExpression':
      return merge(readExpression(node.left), readExpression(node.right))

    // Two different call shapes, read differently:
    //
    //   cn('a', x, 'b')                    — callee is an Identifier. The
    //       arguments ARE the class strings.
    //   ['a', b].filter(Boolean).join(' ') — callee is a MemberExpression. The
    //       class strings are in the chain's subject; the arguments are a
    //       separator and a predicate. Reading them would count `Boolean` as
    //       an unresolvable class name and inflate the skip count.
    case 'CallExpression': {
      const callee = node.callee
      if (callee?.type === 'MemberExpression') return readExpression(callee.object)
      return merge(...(node.arguments ?? []).map(readExpression))
    }

    // ['a', cond && 'b'].filter(Boolean).join(' ')
    case 'ArrayExpression':
      return merge(...(node.elements ?? []).filter(Boolean).map(readExpression))

    case 'JSXExpressionContainer':
      return readExpression(node.expression)

    // Identifier, MemberExpression, BinaryExpression, spread, anything else.
    // The class names are assembled elsewhere and are not resolvable here.
    default:
      return {whole: [], opaque: [node.type]}
  }
}

function readStringLiteral(value) {
  if (typeof value !== 'string') return {whole: [], opaque: ['non-string literal']}
  return {whole: splitClasses(value), opaque: []}
}

/**
 * Read a template literal, dropping tokens that touch an interpolation.
 *
 * For quasi i, its FIRST token is a fragment when an interpolation precedes it
 * with no whitespace in between; its LAST token is a fragment when an
 * interpolation follows it with no whitespace in between. A single-token quasi
 * can be a fragment on both sides at once, which is why the ends are trimmed
 * from one array rather than tested independently.
 */
function readTemplateLiteral(node) {
  const quasis = node.quasis ?? []
  const expressions = node.expressions ?? []
  if (expressions.length === 0) {
    return {whole: splitClasses(quasis.map((q) => q.value?.cooked ?? '').join('')), opaque: []}
  }

  const whole = []
  let droppedFragment = false

  quasis.forEach((quasi, i) => {
    const raw = quasi.value?.cooked ?? ''
    const tokens = splitClasses(raw)
    if (tokens.length === 0) return

    // An interpolation precedes this quasi (i > 0) and the quasi does not open
    // with whitespace → its first token continues the interpolated value.
    const openIsFragment = i > 0 && !/^\s/.test(raw)
    // An interpolation follows this quasi and it does not close with
    // whitespace → its last token is continued by the interpolated value.
    const closeIsFragment = i < quasis.length - 1 && !/\s$/.test(raw)

    const start = openIsFragment ? 1 : 0
    const end = closeIsFragment ? tokens.length - 1 : tokens.length
    if (openIsFragment || closeIsFragment) droppedFragment = true

    for (let k = start; k < end; k++) whole.push(tokens[k])
  })

  const opaque = expressions.map(() => 'template interpolation')
  if (droppedFragment) opaque.push('interpolation-adjacent fragment')
  return {whole, opaque}
}

function splitClasses(text) {
  return text.split(/\s+/).filter(Boolean)
}
