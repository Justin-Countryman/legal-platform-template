// no-footer-h3-tagline (C2)
//
// Flag `<h3 className="tagline ...">` when nested inside a `<footer>`
// JSX ancestor. Footer column titles must be plain h3 with role-token
// styling, not the `tagline` decorative utility class — the heading
// hierarchy must read as a 16px semibold heading above 14px body, not
// as a typographic eyebrow.
//
// Posture lock:
//   `BI-PRINCIPLES.md → Heading hierarchy`:
//   "Footer column titles use plain `<h3 className="text-base
//    font-semibold text-foreground-muted mb-2">` — never the `tagline`
//    utility class. Hierarchy reads as a 16px semibold heading above
//    14px body, not as a decorative typographic eyebrow."
//
//   `skill-component-patterns → Tagline / Anti-patterns`:
//   "Don't use `<Tagline>` for footer column titles. Those are
//    headings — use plain <h3 className="text-base font-semibold
//    text-foreground-muted mb-2">{title}</h3> (no `tagline` utility
//    class). ... Locked in WS7 Commit 2; cascade-discipline retrofit
//    added in WS7.7 Commit 2b across 13 column-h3 instances."
//
// Scope (per WS8 Phase 2 Justin direction): JSX `<footer>` ancestor
// scoping via findAncestorJSXElement. Tighter than file-path scoping
// because the rule fires on the actual heading-inside-footer pattern
// regardless of where the file lives.
//
// Carve-outs: NONE on the rule itself. The two known
// `<h3 className="tagline">` sites in attorney profile layouts
// (ClassicSidebarLayout, PremiumHorizontalLayout — tracked separately
// in OUTSTANDING.md → "WS7 lower-priority Biography heading semantics")
// are NOT inside <footer> JSX; the rule's ancestor scoping passes them
// through naturally without a file-level allowlist.

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {
  getClassNameAttribute,
  getJSXElementName,
  findAncestorJSXElement,
  isJSXElementNamed,
} = require('../lib/ast-utils')

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow <h3 className="tagline"> inside <footer> — footer column titles must be plain h3, not the tagline decorative utility',
      recommended: false,
      url: 'BI/BI-PRINCIPLES.md#heading-hierarchy',
    },
    schema: [],
    messages: {
      footerH3Tagline:
        "<h3 className=\"tagline ...\"> inside a <footer> ancestor. Footer column titles must be plain '<h3 className=\"text-base font-semibold text-foreground-muted mb-2\">' — never the `tagline` utility (which renders the heading as a decorative typographic eyebrow). See BI-PRINCIPLES.md → 'Heading hierarchy' and skill-component-patterns → Tagline / Anti-patterns.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (getJSXElementName(node) !== 'h3') return
        const classNameAttr = getClassNameAttribute(node)
        if (!classNameAttr) return
        const result = tokenizeClassNameAttribute(classNameAttr)
        if (!result) return

        // Does any branch contain the `tagline` utility?
        let hasTagline = false
        outer: for (const branch of result.branches) {
          for (const token of branch) {
            if (token === 'tagline') {
              hasTagline = true
              break outer
            }
          }
        }
        if (!hasTagline) return

        // Is the h3 nested inside a JSX `<footer>` ancestor? findAncestor
        // walks up via node.parent — ESLint wires parent pointers in the
        // rule context automatically.
        const footerAncestor = findAncestorJSXElement(node, (el) =>
          isJSXElementNamed(el, ['footer']),
        )
        if (!footerAncestor) return

        context.report({
          node: classNameAttr,
          messageId: 'footerH3Tagline',
        })
      },
    }
  },
}
