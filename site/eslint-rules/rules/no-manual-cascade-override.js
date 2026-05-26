// no-manual-cascade-override (T2)
//
// Flag manual `*-on-dark` / `*-on-light` Tailwind utilities in className.
// The 8-token cascade rule in `app/globals.css` reassigns these via
// `.bg-brand-dark, [data-ring-context="dark"]` — components should reach
// for the cascade-aware utility name (e.g., `text-foreground`,
// `border-border`, `ring-focus`) and let the cascade resolve to the
// correct surface variant automatically.
//
// Posture lock:
//   `skill-color-system → Anti-patterns`:
//   "Manually overriding cascade-aware tokens per component for dark
//    surfaces. Eight aliases ... cascade automatically. If you find
//    yourself writing `text-foreground-on-dark`, `border-border-on-dark`,
//    or `hover:bg-hover-wash-on-dark` inside a `.bg-brand-dark` container,
//    you don't need to — the cascade has already swapped the underlying
//    value."
//
//   `BI-FOUNDATIONS.md → "Surface-aware cascade: 8 tokens swap together"`.
//
// Scope: JSX className attribute values only. The token-name strings as
// they appear in `lib/designTokens.ts`'s cascade-rule definition (i.e.,
// the CSS-var emission code) and in code comments are NOT flagged —
// this rule is scoped to JSX className tokens.

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute} = require('../lib/ast-utils')

const FORBIDDEN_TOKENS = [
  'text-foreground-on-dark',
  'text-foreground-muted-on-dark',
  'text-foreground-subtle-on-dark',
  'border-border-on-dark',
  'bg-hover-wash-on-dark',
  'text-action-text-on-dark',
  'text-accent-on-dark',
  'ring-focus-on-dark',
]

// Strip Tailwind variant prefixes (hover:, focus:, md:, etc.) so we can
// match the bare token. Keeps simple — split on the LAST `:` and check
// the suffix.
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
        'Disallow manual *-on-dark cascade-override utilities — the 8-token cascade rule swaps these automatically',
      recommended: false,
      url: 'BI-FOUNDATIONS.md#surface-aware-cascade-8-tokens-swap-together-dont-override-per-component',
    },
    schema: [],
    messages: {
      manual:
        "Manual cascade override '{{token}}' in className. The 8-token cascade rule swaps automatically inside .bg-brand-dark / [data-ring-context=\"dark\"]; reach for the cascade-aware utility (e.g., 'text-foreground', 'border-border', 'ring-focus') and let it resolve per-surface. See skill-color-system → Anti-patterns and BI-FOUNDATIONS.md → 'Surface-aware cascade'.",
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
            const bare = stripVariantPrefixes(token)
            if (FORBIDDEN_TOKENS.includes(bare)) {
              context.report({
                node: classNameAttr,
                messageId: 'manual',
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
