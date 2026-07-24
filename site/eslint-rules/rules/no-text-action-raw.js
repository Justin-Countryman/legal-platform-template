// no-text-action-raw (T5a)
//
// Flag raw `text-action` in className. The anchored amber utility is not
// a legitimate body-text token on ANY surface in the canonical pairing
// matrix — it fails AA on every light surface (~2.27:1 on bg-background,
// ~1.82:1 on bg-muted, ~1.97:1 on bg-accent for vivid-accent palettes
// like a warm amber). Every legitimate text use of "action color" routes
// through cascade-aware `text-action-text`, which carries an AA-safe
// `actionOnLight()` fallback on light surfaces and resolves to raw
// action on dark surfaces via the 8-token cascade rule.
//
// Posture lock:
//   `skill-color-system → Surface-aware tokens (cascade-driven)` —
//   "`text-action-text` cascade-aware utility ... AA-safe action-on-light
//    fallback ... raw action color (passes contrast on brand-dark)."
//
//   `skill-color-system → Forbidden / warning combinations` (canonical
//   pairing matrix; rendered live in Foundation Colors tab @
//   DesignStudioClient.tsx FoundationPanel):
//   "text-action on bg-muted (~1.82:1, fails AA, warning); text-action on
//    bg-background (~2.27:1, fails AA, warning)."
//
//   `BI/OUTSTANDING.md → "Token-surface contrast prevention enforcement"`
//   — the architectural lock for Level 1 enforcement.
//
//   `BI-FOUNDATIONS.md → "No new pattern decisions through the [tool]
//    backdoor"` — this rule enforces the pre-existing locked matrix; no
//   new posture is invented here.
//
// Scope: JSX className attribute values only. References to the
// `text-action` string in code comments, CSS-var emission code in
// `lib/designTokens.ts`, and Studio-documentation utility-label props
// in DesignStudioClient.tsx (e.g., `utility="bg-action / text-action /
// border-action"` strings rendered as documentation prose) are NOT
// flagged — those are non-className contexts the AST visitor never
// reaches.
//
// Variant-prefix-aware: `hover:text-action`, `focus:text-action`,
// `md:text-action`, etc. all flagged — the cascade-aware variant
// `text-action-text` also accepts variant prefixes (`hover:text-action-text`)
// and is the canonical replacement.
//
// No detection-level carve-out for `<svg>` elements, and — since the
// OUTSTANDING item 13 outline landed (2026-07-24) — no per-site disable
// anywhere: this rule has ZERO standing exceptions. StarRating, formerly
// the single legitimate raw-amber-on-light site (semantic gold-star
// convention), now renders via dedicated `text-star-fill` +
// `--color-star-outline` tokens (see `skill-color-system → Stars semantic
// color doctrine`), so it never touches `text-action` at all. If a new
// site genuinely needs raw action color, rule #6 of the rule-authoring
// contract still applies: prefer a per-site disable mapped to a tracked
// posture over loosening the rule.
//
// Auto-fix: NOT provided. The replacement (`text-action-text`) is correct
// in 100% of body-text cases, but for the rare design-driven raw-amber
// site (StarRating semantic gold) the right answer is per-site disable —
// auto-fix would migrate StarRating against design intent.

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
        'Disallow raw text-action — use cascade-aware text-action-text (AA-safe on light, raw action on dark)',
      recommended: false,
      url: 'BI/skills/skill-color-system/SKILL.md#surface-aware-tokens-cascade-driven',
    },
    schema: [],
    messages: {
      rawTextAction:
        "'{{token}}' is anchored amber and fails AA on every light surface (~2.27:1 on bg-background, ~1.82:1 on bg-muted). Use cascade-aware 'text-action-text' instead — it carries an AA-safe brand-dark fallback on light surfaces and resolves to the raw action color on dark surfaces via the 8-token cascade rule. See skill-color-system → 'Surface-aware tokens (cascade-driven)' and the Foundation Colors tab → 'Forbidden / warning combinations'.",
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
            if (stripVariantPrefixes(token) === 'text-action') {
              context.report({
                node: classNameAttr,
                messageId: 'rawTextAction',
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
