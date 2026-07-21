// no-raw-color-value (T7)
//
// Flag raw color values in string literals and template strings ANYWHERE in a
// component, not only inside className:
//   const BRAND = '#2C5740'
//   style={{color: '#fff'}}
//   `linear-gradient(rgb(0 0 0), transparent)`
//
// Posture lock:
//   `BI-FOUNDATIONS.md → "Token-first, not value-first"`:
//   "Hardcoded hex, rem, ms, or shadow values inside component class strings
//    are the warning sign. ... Reach for a token first."
//
//   `skill-color-system → Anti-patterns`:
//   "Hardcoded hex inside components. If you find yourself typing #aa0000,
//    you mean bg-brand-dark."
//
// WHY THIS EXISTS ALONGSIDE `no-arbitrary-color`. That rule reads className
// only, which was the whole of the exposure until homepage block components
// existed. OUTSTANDING item 46: className hex is caught, hex outside className
// is not. A block that sets `style={{background: '#2C5740'}}` renders correctly
// on the client it was written for and silently opts out of per-client theming
// and WCAG validation on every other one, with nothing reporting it.
//
// Scope: string Literals and TemplateElements. className is deliberately NOT
// re-checked here — `no-arbitrary-color` owns it and reports a better message.
//
// Carve-out: files on the token-system boundary (lib/token-boundary.js). Those
// are places where the token system ends and a raw value is the only thing that
// can be written, not deferred violations, so they are scoped out structurally
// rather than carrying inline disables. See that file for each reason.

'use strict'

const {isTokenBoundaryFile} = require('../lib/token-boundary')

// Hex is unambiguous: a literal color, wherever it appears.
const HEX_RE = /(?:^|[\s,(:;=])#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{1}|[0-9a-fA-F]{3}|[0-9a-fA-F]{5})?\b/

// Functional notation is only a RAW value when it does not resolve through a
// token. `rgb(var(--shadow-rgb) / 0.06)` and `color-mix(in srgb, var(--x) …)`
// are token COMPOSITION, which is the sanctioned way to vary a token's alpha,
// and the elevation/shadow system is built on it. Flagging those would flag the
// token path itself.
const FUNCTIONAL_RE = /(?:^|[\s,(:;=])(?:rgba?|hsla?|oklch|lab|lch)\s*\(/

function hasRawColor(text) {
  if (HEX_RE.test(text)) return true
  // Functional notation referencing a CSS variable is composition, not a value.
  return FUNCTIONAL_RE.test(text) && !text.includes('var(--')
}

function isClassNameContext(node) {
  // Walk up far enough to catch className={...} and clsx/cn(...) wrappers.
  let current = node.parent
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (current.type === 'JSXAttribute' && current.name && current.name.name === 'className') {
      return true
    }
    current = current.parent
  }
  return false
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw color values outside className — use design tokens or CSS custom properties',
      recommended: false,
      url: 'BI-FOUNDATIONS.md#token-first-not-value-first',
    },
    schema: [],
    messages: {
      rawColor:
        'Raw color value "{{value}}" — use a design token (var(--color-…) or a role-token utility). Hardcoding opts this element out of per-client theming and WCAG validation. See BI-FOUNDATIONS.md → Token-first, not value-first and skill-color-system → Anti-patterns.',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (isTokenBoundaryFile(filename)) return {}

    function check(node, raw, hexOnly) {
      if (typeof raw !== 'string' || raw.length === 0) return
      const hit = hexOnly ? HEX_RE.test(raw) : hasRawColor(raw)
      if (!hit) return
      if (isClassNameContext(node)) return // no-arbitrary-color owns className
      context.report({
        node,
        messageId: 'rawColor',
        data: {value: raw.length > 40 ? `${raw.slice(0, 40)}…` : raw},
      })
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value, false)
      },
      // A template QUASI is a fragment. `rgb(${SHADOW_RGB} / 0.06)` splits the
      // var reference into an expression the quasi cannot see, so judging
      // functional notation from one fragment reports the token path as a
      // violation. Hex needs no surrounding context, so fragments are checked
      // for hex only; a genuinely raw rgb() written inline still lands in a
      // Literal and is caught there.
      TemplateElement(node) {
        check(node, node.value && node.value.cooked, true)
      },
    }
  },
}
