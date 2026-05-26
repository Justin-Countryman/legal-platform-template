// h1-mobile-cap (A8)
//
// Flag `<h1>` elements whose className includes a size token at or above
// `text-4xl` WITHOUT a responsive breakpoint prefix. The platform's mobile
// H1 cap is `text-3xl` (30px) — locked across all `marketingScale` presets
// and across internal pages.
//
// Posture lock:
//   `BI-PRINCIPLES.md → Mobile-first / Mobile best practices`:
//   "H1 maximum text-3xl on mobile — never larger"
//
//   `BI-FOUNDATIONS.md → Mobile-first always`:
//   "The mobile H1 cap (text-3xl / 30px) is locked by BI-PRINCIPLES.md
//    and is non-negotiable across all marketingScale presets and across
//    internal pages."
//
// What passes:
//   - Mobile floor at or below `text-3xl` (text-3xl, text-2xl, text-xl,
//     text-lg, text-base, text-sm, text-xs).
//   - Any breakpoint-prefixed size: `md:text-4xl`, `lg:text-6xl`, etc.
//     The breakpoint prefix means the class only applies at >= that
//     screen size, so it doesn't affect mobile rendering.
//   - Utility classes that internally clamp (`marketing-h1`,
//     `text-page-h1`). The rule only inspects `text-Nxl` token shapes
//     and won't flag platform clamp utilities.
//
// What fires:
//   - `text-Nxl` for N in {4, 5, 6, 7, 8, 9} WITHOUT a responsive prefix.
//   - The token must be in a JSX className expression (any branch).
//
// Auto-fix: NOT provided. The right replacement is a per-site visual
// decision (typically text-3xl with smoother md/lg progression — see
// the WS8 Commit 11 per-site report). Report-only.

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute, getJSXElementName} = require('../lib/ast-utils')

// Match `text-Nxl` where N >= 4. Only checked against bare (unprefixed)
// tokens — see hasAnyVariantPrefix below.
const LARGE_TEXT_TOKEN_RE = /^text-(?:[4-9]xl)$/

/**
 * Does the token have ANY variant prefix?
 *
 * The BI-PRINCIPLES H1 cap targets the mobile REST-state rendering.
 * Any variant prefix — responsive (md:, lg:), state (hover:, focus:),
 * or environment (dark:) — gates the class to a non-default condition,
 * so the class doesn't apply at mobile rest. Skip on any prefix.
 *
 * Examples:
 *   'text-4xl'        → false → check
 *   'md:text-4xl'     → true  → skip (responsive — applies at md+ only)
 *   'hover:text-4xl'  → true  → skip (interaction state — not rest)
 *   'dark:text-4xl'   → true  → skip (environment — not unconditional)
 */
function hasAnyVariantPrefix(token) {
  return token.includes(':')
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        '<h1> mobile floor must be text-3xl or smaller — flag text-4xl+ without a responsive prefix',
      recommended: false,
      url: 'BI/BI-PRINCIPLES.md#mobile-first',
    },
    schema: [],
    messages: {
      mobileTooLarge:
        "<h1> mobile floor '{{token}}' exceeds the platform cap of text-3xl. Add a responsive prefix (md:, lg:) and use text-3xl or smaller as the mobile floor (e.g., 'text-3xl md:text-4xl lg:{{token}}'). See BI-PRINCIPLES.md → 'Mobile-first / Mobile best practices' and BI-FOUNDATIONS.md → 'Mobile-first always'.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (getJSXElementName(node) !== 'h1') return
        const classNameAttr = getClassNameAttribute(node)
        if (!classNameAttr) return
        const result = tokenizeClassNameAttribute(classNameAttr)
        if (!result) return

        for (const branch of result.branches) {
          for (const token of branch) {
            if (hasAnyVariantPrefix(token)) continue
            if (LARGE_TEXT_TOKEN_RE.test(token)) {
              context.report({
                node: classNameAttr,
                messageId: 'mobileTooLarge',
                data: {token},
              })
              return
            }
          }
        }
      },
    }
  },
}
