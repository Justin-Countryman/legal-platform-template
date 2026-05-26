// no-transition-all (B1)
//
// Flag `transition-all` Tailwind utility in className.
//
// Posture lock:
//   `BI-OVERVIEW.md → 2026-04-28 (color system canonicalization, Motion
//    system Phase 2)`:
//   "transition-all replaced with explicit property lists on 7 header
//    floating wrappers"
//
//   WS7 Commit 4 follow-up:
//   "0 transition-all replacements (already absent platform-wide)"
//
//   Reasoning: `transition-all` animates every property change including
//   layout-affecting properties (width, height, position), which causes
//   jank and layout-thrash on hover. Explicit property lists
//   (`transition-[box-shadow,translate,border-color]`) animate only what
//   should animate; non-listed properties change instantly.
//
// Scope: JSX className attribute values only.
// Note: variant-prefixed forms (`hover:transition-all`, `md:transition-all`)
// are also flagged via the strip-variant-prefixes helper.

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute} = require('../lib/ast-utils')

function stripVariantPrefixes(token) {
  const idx = token.lastIndexOf(':')
  return idx >= 0 ? token.slice(idx + 1) : token
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow transition-all — use explicit property lists (transition-[a,b,c]) instead',
      recommended: false,
      url: 'BI-OVERVIEW.md#2026-04-28-color-system-canonicalization-motion-system-phase-2',
    },
    schema: [],
    messages: {
      noAll:
        "transition-all in className. Use an explicit transition property list (e.g., 'transition-[box-shadow,translate,border-color]') so layout-affecting properties don't animate. See BI-OVERVIEW.md → '2026-04-28 — Header hover migration + color system canonicalization' and the WS7 Commit 4 'transition-all replacements' note.",
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
            if (stripVariantPrefixes(token) === 'transition-all') {
              context.report({node: classNameAttr, messageId: 'noAll'})
              return
            }
          }
        }
      },
    }
  },
}
