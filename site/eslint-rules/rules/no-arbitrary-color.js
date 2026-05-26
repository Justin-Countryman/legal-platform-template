// no-arbitrary-color (T1)
//
// Flag Tailwind arbitrary-value classes that contain raw color values:
//   bg-[#hex], text-[rgb(...)], border-[hsl(...)], etc.
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
// Scope: JSX className attribute values only. Static utility prefixes
// (`bg-`, `text-`, `border-`, `ring-`, `fill-`, `stroke-`, `outline-`,
// `decoration-`, `divide-`, `placeholder-`, `from-`, `via-`, `to-`).
//
// Carve-outs:
//   - `ring-white` and `ring-offset-brand-dark` are NOT flagged — those are
//     canonical Button focus-ring tokens per skill-button-system. The
//     `ring-` prefix is excluded from the arbitrary-color regex below.
//     (Only the ARBITRARY-VALUE form `ring-[...]` would match — bare
//     `ring-white` is a built-in Tailwind utility, not an arbitrary value.)

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute} = require('../lib/ast-utils')

// Match `(prefix)-[<color-value>]` where <color-value> starts with `#`,
// `rgb(`, `rgba(`, `hsl(`, `hsla(`, or `oklch(`. Token-level (no whitespace).
const ARBITRARY_COLOR_RE =
  /^(?:hover:|focus:|active:|focus-visible:|focus-within:|group-hover:|md:|lg:|xl:|sm:|2xl:|dark:|light:|first:|last:|odd:|even:|disabled:|invalid:)*(?:bg|text|border|fill|stroke|outline|decoration|divide|placeholder|from|via|to|caret|accent|shadow)-\[(?:#[0-9a-fA-F]{3,8}|rgba?\([^\]]+\)|hsla?\([^\]]+\)|oklch\([^\]]+\))\]/

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow arbitrary color values in className utilities — use design tokens instead',
      recommended: false,
      url: 'BI-FOUNDATIONS.md#token-first-not-value-first',
    },
    schema: [],
    messages: {
      arbitrary:
        "Arbitrary color value '{{token}}' in className. Use a design token (bg-action / text-foreground / border-border / etc.) instead. See BI-FOUNDATIONS.md → 'Token-first, not value-first' and skill-color-system → Anti-patterns.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const classNameAttr = getClassNameAttribute(node)
        if (!classNameAttr) return
        const result = tokenizeClassNameAttribute(classNameAttr)
        if (!result) return
        for (const branch of result.branches) {
          for (const token of branch) {
            if (ARBITRARY_COLOR_RE.test(token)) {
              context.report({
                node: classNameAttr,
                messageId: 'arbitrary',
                data: {token},
              })
              return // one report per className is enough
            }
          }
        }
      },
    }
  },
}
