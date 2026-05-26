// no-raw-white-black (B2)
//
// Flag raw white/black Tailwind utilities in className:
//   bg-white, text-white, text-black, bg-black
//
// Posture lock:
//   `skill-color-system → Anti-patterns`:
//   "Raw text-white / bg-white instead of role tokens. Use text-foreground
//    for white-on-dark text and bg-background for white surfaces. The
//    Tailwind built-in text-white / bg-white bypass the role-token
//    discipline and don't track the inverse-neutral palette
//    (text-foreground is intentionally a near-white tied to the active
//    client's primary, not pure white)."
//
//   WS4 / WS7 swept these from production. Audit Section C item #2
//   confirmed zero current occurrences.
//
// Scope: JSX className attribute values only.
// Variant-prefix-aware (so `hover:bg-white`, `md:text-white` are flagged).
//
// Carve-outs: NONE for this rule's prefixes. The documented exception in
// `skill-color-system` ("Exception: ring-white and ring-offset-brand-dark
// on Button focus rings") uses different Tailwind prefixes (`ring-` /
// `ring-offset-`) — those don't match this rule's `bg-` / `text-` scope
// and pass through naturally without needing a file-level carve-out.

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute} = require('../lib/ast-utils')

const FORBIDDEN_TOKENS = ['bg-white', 'text-white', 'text-black', 'bg-black']

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
        'Disallow raw bg-white / text-white / text-black / bg-black — use role tokens (bg-background, text-foreground, etc.)',
      recommended: false,
      url: 'BI/skills/skill-color-system/SKILL.md#anti-patterns',
    },
    schema: [],
    messages: {
      rawWhite:
        "Raw 'bg-white' in className. Use 'bg-background' (warm-tied near-white role token). See skill-color-system → Anti-patterns.",
      rawTextWhite:
        "Raw 'text-white' in className. Use 'text-foreground' (cascade-aware; resolves to brand-tied near-white on dark surfaces). See skill-color-system → Anti-patterns.",
      rawBlack:
        "Raw 'bg-black' in className. Use 'bg-brand-dark' or another role token. See skill-color-system → Anti-patterns.",
      rawTextBlack:
        "Raw 'text-black' in className. Use 'text-foreground' (cascade-aware) or 'text-brand-dark'. See skill-color-system → Anti-patterns.",
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
            if (!FORBIDDEN_TOKENS.includes(bare)) continue
            const messageId =
              bare === 'bg-white'   ? 'rawWhite'
              : bare === 'text-white' ? 'rawTextWhite'
              : bare === 'bg-black'   ? 'rawBlack'
              :                         'rawTextBlack'
            context.report({node: classNameAttr, messageId})
            return
          }
        }
      },
    }
  },
}
