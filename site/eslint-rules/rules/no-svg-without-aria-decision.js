// no-svg-without-aria-decision (A6)
//
// Force inline `<svg>` elements to make a semantic decision about how
// they expose to assistive technology. Every `<svg>` must explicitly
// carry one of:
//
//   - `aria-hidden="true"` (decorative — paired with adjacent text label)
//   - `aria-label="…"` (meaningful — standalone semantic icon)
//   - `aria-labelledby="…"` (meaningful — labeled by another node)
//   - `role="img"` / `role="presentation"` / `role="none"` (explicit role)
//
// Posture lock:
//   `BI-PRINCIPLES.md → Image / SVG accessibility`:
//   "SVG logos and icons:
//     - Meaningful SVGs use aria-label
//     - Decorative SVGs use aria-hidden=\"true\""
//
//   `skill-component-patterns → Icon registry`:
//   The platform's icon-registry SVGs ship with `aria-hidden: true` baked
//   into SVG_PROPS. The rule's spread-attribute carve-out preserves that
//   pattern (when the author writes `<svg {...SVG_PROPS}>`, the spread
//   is opaque to static analysis but the attribute decision IS made
//   inside the registry).
//
// Rule scope: any `<svg>` JSXOpeningElement that has no explicit
// aria-* / role attribute AND no JSXSpreadAttribute. The spread carve-out
// trusts that authors using a spread have made the decision externally
// (typically the icon-registry SVG_PROPS pattern).
//
// Auto-fix: NOT provided. The fix is a semantic decision (decorative
// vs meaningful) the author must make; lint can't choose the right
// answer. Report-only ships in WS8.

'use strict'

const {getJSXElementName} = require('../lib/ast-utils')

const ARIA_ATTRS = new Set([
  'aria-hidden',
  'aria-label',
  'aria-labelledby',
  'role',
])

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require <svg> elements to carry an explicit aria-* or role attribute (decorative vs meaningful decision)',
      recommended: false,
      url: 'BI/BI-PRINCIPLES.md#image--svg-accessibility',
    },
    schema: [],
    messages: {
      missing:
        "<svg> requires an explicit accessibility decision: add aria-hidden=\"true\" (decorative — paired with adjacent text label), aria-label (meaningful icon), aria-labelledby, or role=\"img\". See BI-PRINCIPLES.md → 'Image / SVG accessibility'.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (getJSXElementName(node) !== 'svg') return

        // Walk attributes. Bail early on JSXSpreadAttribute (the author
        // may be passing a props object that includes the aria decision —
        // typical of the platform's icon-registry SVG_PROPS pattern).
        for (const attr of node.attributes ?? []) {
          if (attr.type === 'JSXSpreadAttribute') return
          if (
            attr.type === 'JSXAttribute' &&
            attr.name?.type === 'JSXIdentifier' &&
            ARIA_ATTRS.has(attr.name.name)
          ) {
            return
          }
        }

        context.report({node, messageId: 'missing'})
      },
    }
  },
}
