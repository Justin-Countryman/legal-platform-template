// no-tagline-classname-mb (C1)
//
// Flag `<Tagline>` consumers that pass `mb-*` (margin-bottom) Tailwind
// utilities through className. Spacing belongs to the typed `mb` prop —
// not to className.
//
// Posture lock:
//   `skill-component-patterns → Tagline / Anti-patterns`:
//   "Don't pass `mb-*` through `className`. Spacing is owned by the typed
//    `mb` prop. `<Tagline className="mb-2">` was the pre-WS7.7 pattern;
//    `<Tagline mb="mb-2">` is canonical post-WS7.7 Commit 5. Untyped
//    className-based spacing was swept across 23 callsites — keep it
//    consolidated."
//
//   `OUTSTANDING.md → "Workstream 7.7 ... → Commit 5 — Tagline primitive
//    `mb` prop + 23-callsite sweep"`.
//
// The Tagline primitive's typed `mb` prop accepts: 'mb-0' | 'mb-2' |
// 'mb-3' | 'mb-4' (default 'mb-3'). Any `mb-X` in className bypasses
// the type system — even values that happen to be in the allowed set,
// because the bypass pattern itself is the regression vector.
//
// Variant-prefixed forms (`md:mb-2`, `hover:mb-4`) are flagged too —
// the typed prop doesn't accept breakpoint variants, so prefixed
// forms in className are an even clearer bypass.
//
// Auto-fix: not provided. The fixer would have to verify the extracted
// `mb-X` value is in the typed prop's allowed set before applying, and
// the gain (zero current violations + low future incidence) doesn't
// justify the fixer-correctness work. Report-only ships in WS8.

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute, getJSXElementName} = require('../lib/ast-utils')

function stripVariantPrefixes(token) {
  const idx = token.lastIndexOf(':')
  return idx >= 0 ? token.slice(idx + 1) : token
}

// Match Tailwind margin-bottom utilities (positive or negative).
// Includes `mb-0`, `mb-px`, `mb-0.5`, `mb-[14px]`, `-mb-2`, etc.
const MB_RE = /^-?mb-/

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow mb-* in className on <Tagline> — use the typed `mb` prop instead',
      recommended: false,
      url: 'BI/skills/skill-component-patterns/SKILL.md#tagline',
    },
    schema: [],
    messages: {
      classNameMb:
        "<Tagline> className contains '{{token}}'. Spacing is owned by the typed `mb` prop ('mb-0' | 'mb-2' | 'mb-3' | 'mb-4', default 'mb-3'). Use <Tagline mb=\"{{token}}\"> instead. See skill-component-patterns → Tagline / Anti-patterns and OUTSTANDING.md → 'Workstream 7.7 → Commit 5 — Tagline primitive mb prop'.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (getJSXElementName(node) !== 'Tagline') return
        const classNameAttr = getClassNameAttribute(node)
        if (!classNameAttr) return
        const result = tokenizeClassNameAttribute(classNameAttr)
        if (!result) return
        for (const branch of result.branches) {
          for (const token of branch) {
            const bare = stripVariantPrefixes(token)
            if (MB_RE.test(bare)) {
              context.report({
                node: classNameAttr,
                messageId: 'classNameMb',
                data: {token: bare},
              })
              return
            }
          }
        }
      },
    }
  },
}
