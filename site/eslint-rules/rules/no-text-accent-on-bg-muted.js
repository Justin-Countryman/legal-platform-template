// no-text-accent-on-bg-muted (T5b)
//
// Flag the same-className pair `text-accent` + `bg-muted` (in any order,
// with or without variant prefixes). The cascade-aware accent token is
// legitimate on `bg-background` (resolves to tagline color, ~AA-passing
// on warm-white) and on `bg-brand-dark` / `[data-ring-context="dark"]`
// (resolves via the cascade rule to brightened accent-on-dark). On
// `bg-muted` (warm-off-white section alternation tinted toward accent1),
// the same accent value fails AA at ~2.27:1.
//
// Posture lock:
//   `skill-color-system → Forbidden / warning combinations` +
//   `lib/designTokens.ts → validateWcag()` ("accent on muted" — warning
//   pair surfaced in ColorPreview at ~2.27:1).
//
//   Live demonstration: FoundationPanel @ DesignStudioClient.tsx →
//   "Forbidden / warning combinations" subsection renders the failing
//   pair with sample copy and the contrast ratio annotation.
//
//   Replacement guidance: either move the text to `bg-background`
//   (where `text-accent` resolves to the tagline color and is in the
//   canonical matrix) or use `text-foreground-muted` (which resolves
//   correctly on `bg-muted` per the canonical matrix).
//
// Same-className detection only (Option A scope of the WS-Token-Surface
// pre-flight). Ancestor-surface detection is deferred — per WS8 posture
// "false-negatives over false-positives", the rule only fires when both
// tokens appear in the same className attribute (or same code-path branch
// within that attribute), which is the unambiguous case. Same-className
// detection catches the FoundationPanel forbidden-cell demos (which
// intentionally pair the tokens in one className to document the
// anti-pattern; those sites carry per-line eslint-disable comments
// citing the demo).
//
// Branch semantics: pair-presence is per-branch. A className like
// `cond ? "text-accent" : "bg-muted"` does NOT fire — at runtime exactly
// one branch renders, never both. Fires only when a single branch
// contains both tokens (e.g., `<p className="bg-muted text-accent">` or
// the array/cn shape where both tokens land together).
//
// Variant-prefix-aware: `hover:text-accent` + `bg-muted` flags too
// (hover state still produces the failing rendered pair). `md:text-accent`
// + `bg-muted` flags (responsive breakpoint still resolves on the same
// surface).
//
// Auto-fix: NOT provided. Right replacement depends on whether the
// designer wants the accent emphasis (move surface to bg-background)
// or the surface alternation (drop the accent and use text-foreground-muted).

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute} = require('../lib/ast-utils')

function stripVariantPrefixes(token) {
  const idx = token.lastIndexOf(':')
  return idx >= 0 ? token.slice(idx + 1) : token
}

function branchContains(branch, target) {
  for (const token of branch) {
    if (stripVariantPrefixes(token) === target) return true
  }
  return false
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow text-accent on bg-muted in the same className — fails AA at ~2.27:1',
      recommended: false,
      url: 'BI/skills/skill-color-system/SKILL.md#wcag-validation-validatewcagroles-primaryhex',
    },
    schema: [],
    messages: {
      pair:
        "'text-accent' on 'bg-muted' fails AA at ~2.27:1 contrast (the accent color is the warm-off-white surface's neighbor in OKLCH space). Move the text to bg-background (where text-accent resolves to the tagline color and passes) or use text-foreground-muted on bg-muted instead. See skill-color-system → 'Forbidden / warning combinations' and Foundation Colors tab → 'Forbidden / warning combinations'.",
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
          if (
            branchContains(branch, 'text-accent') &&
            branchContains(branch, 'bg-muted')
          ) {
            context.report({
              node: classNameAttr,
              messageId: 'pair',
            })
            return
          }
        }
      },
    }
  },
}
