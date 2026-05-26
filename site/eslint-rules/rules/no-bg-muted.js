// no-bg-muted (T4)
//
// Flag the `bg-muted` Tailwind utility in className. This rule is unscoped
// at the rule level — `eslint.config.mjs` decides where it applies via a
// `files: [...]` block (idiomatic flat-config). Today: scoped to
// InternalHero.tsx + InternalPageHeader.tsx where the locked posture
// "light fallback band uses bg-background, NOT bg-muted" applies.
//
// Posture lock:
//   `BI-FOUNDATIONS.md → "Light fallback band uses bg-background, NOT
//    bg-muted"`:
//   "When `internalHeroBackground === 'light'`, hero bands paint
//    `bg-background` (true light surface). Do NOT use `bg-muted`.
//    `bg-muted` is anchored to `:root` per skill-color-system —
//    `role-muted` is the warm off-white section alternation surface,
//    derived from the `accent1` tint. On the analogous-accent example
//    palette, `accent1` is gold, so `bg-muted` resolves to a
//    gold-tinted near-white. Using it as the 'light variant' of a
//    hero band introduces a third color the editor didn't pick — the
//    design setting's `light` option turns into 'warm gold tint',
//    which isn't what `light` means.
//    The rule: light means light. The design system's two options
//    must produce two outcomes, not three."
//
//   Lock provenance: WS7.7 Commit 1 (InternalPageHeader scheme-aware)
//   + Commit 2 (BlogPostPage scheme-aware) + WS8 Commit 1 (the missed
//   InternalHero.tsx:56 consumer).
//
// Variant-prefix-aware: `hover:bg-muted`, `md:bg-muted`, etc. all
// flagged. The hero band's color is governed by `internalHeroBackground`
// at all states / breakpoints, not just at mobile rest.
//
// Auto-fix: NOT provided. The fix is `bg-muted` → `bg-background` in
// the canonical case, but other consumers within the same file might
// legitimately need bg-muted for non-band purposes. Report-only.

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
        'Disallow bg-muted in hero band components — use bg-background for the light-scheme fallback',
      recommended: false,
      url: 'BI/BI-FOUNDATIONS.md#light-fallback-band-uses-bg-background-not-bg-muted',
    },
    schema: [],
    messages: {
      noBgMuted:
        "'{{token}}' in a hero band component. The light-scheme fallback uses 'bg-background' (true light surface), NOT 'bg-muted' (warm off-white section alternation tinted toward accent1 — gold accent example). Light means light: the design system's two options must produce two outcomes, not three. See BI-FOUNDATIONS.md → 'Light fallback band uses bg-background, NOT bg-muted' (WS7.7 Commit 1 + 2 + WS8 Commit 1 lock).",
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
            if (stripVariantPrefixes(token) === 'bg-muted') {
              context.report({
                node: classNameAttr,
                messageId: 'noBgMuted',
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
