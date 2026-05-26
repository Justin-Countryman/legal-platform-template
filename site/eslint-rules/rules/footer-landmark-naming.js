// footer-landmark-naming (A3)
//
// Enforce the platform footer landmark-naming pattern: every top-level
// `<footer>` carries `aria-labelledby="footer-heading"` and contains
// `<h2 id="footer-heading" className="sr-only">…</h2>` as its first
// substantive child.
//
// Posture lock per `BI-PRINCIPLES.md → Landmarks`:
//
//   > Every <footer> carries `aria-labelledby="footer-heading"` and
//   > contains `<h2 id="footer-heading" className="sr-only">Footer</h2>`
//   > as its first child. The visually-hidden h2 names the landmark
//   > for screen readers; the aria-labelledby attribution gives the
//   > landmark its accessible name.
//   >
//   > Industry-standard pattern from MDN / W3C / Princeton
//   > WebAccessibility / The A11Y Project.
//   >
//   > Locked in WS7 Commit 2 OQ4.
//
// Cross-cited in `skill-component-patterns → Footer landmark naming
// pattern`. Lock provenance: WS7 Commit 2 (7 main footer variants
// migrated) + WS8 Commit 2 (ReviewPageContent.tsx review-page footer
// migrated).
//
// HTML-spec scoping (per WS8 OQ3 + Justin direction):
//
//   `<footer>` is a landmark element only when it is NOT nested inside
//   another sectioning content element. The HTML5 spec defines the
//   sectioning content elements that "scope" a footer:
//     - <article>
//     - <aside>
//     - <section>
//     - <main>
//     - <nav>
//
//   A `<footer>` nested inside any of these is a sectioning footer
//   (e.g., the footer of an article — author byline, publish date) and
//   is NOT a page-level landmark. Skip the rule on those.
//
// Granular messageIds for actionable errors:
//
//   - missingAriaLabelledby — <footer> has no `aria-labelledby` attribute
//   - wrongAriaLabelledby   — has aria-labelledby but value isn't "footer-heading"
//   - missingFirstChildH2   — first substantive child isn't a <h2>
//                              (could be missing entirely, or be a <div>, etc.)
//   - missingH2Id           — first <h2> child but missing `id="footer-heading"`
//   - missingH2SrOnly       — first <h2> with correct id but className lacks "sr-only"
//
// All five messages cite BI-PRINCIPLES → Landmarks.
//
// Auto-fix: NOT provided. The fix needs to insert / modify both the
// <footer> attribute AND a child JSX element; non-trivial. Report-only.

'use strict'

const {tokenizeClassNameAttribute, anyBranchContains} = require('../lib/className-tokenizer')
const {
  getClassNameAttribute,
  getJSXElementName,
  getAttribute,
  getStaticStringAttributeValue,
  hasAncestorOfName,
  getFirstSubstantiveChild,
} = require('../lib/ast-utils')

// HTML5 sectioning content elements that scope a nested <footer> out of
// being a page-level landmark.
const SECTIONING_ANCESTORS = ['article', 'aside', 'section', 'main', 'nav']

const FOOTER_HEADING_ID = 'footer-heading'

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Top-level <footer> elements must carry aria-labelledby="footer-heading" and a sr-only <h2 id="footer-heading"> first child',
      recommended: false,
      url: 'BI/BI-PRINCIPLES.md#landmarks',
    },
    schema: [],
    messages: {
      missingAriaLabelledby:
        '<footer> landmark missing `aria-labelledby="footer-heading"`. The visually-hidden first-child <h2> needs this attribution to give the landmark its accessible name. See BI-PRINCIPLES.md → Landmarks.',
      wrongAriaLabelledby:
        '<footer> aria-labelledby="{{value}}" should reference "footer-heading" — the canonical id of the sr-only first-child <h2> that names the landmark. See BI-PRINCIPLES.md → Landmarks.',
      missingFirstChildH2:
        '<footer> first substantive child must be `<h2 id="footer-heading" className="sr-only">…</h2>`. The visually-hidden h2 names the landmark for screen reader users navigating by region. See BI-PRINCIPLES.md → Landmarks.',
      missingH2Id:
        '<footer> first-child <h2> missing `id="footer-heading"` (the id the <footer>\'s aria-labelledby points to). See BI-PRINCIPLES.md → Landmarks.',
      missingH2SrOnly:
        '<footer> first-child <h2> missing `sr-only` className. The h2 must be visually hidden (visible only to screen readers) so it serves as a landmark name without affecting layout. See BI-PRINCIPLES.md → Landmarks.',
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        if (getJSXElementName(node.openingElement) !== 'footer') return

        // HTML-spec scoping: skip nested footers (inside article/aside/section/main/nav)
        if (hasAncestorOfName(node, SECTIONING_ANCESTORS)) return

        // (1) aria-labelledby attribute
        const ariaLabelledby = getAttribute(node.openingElement, 'aria-labelledby')
        if (!ariaLabelledby) {
          context.report({
            node: node.openingElement,
            messageId: 'missingAriaLabelledby',
          })
          return
        }
        const ariaValue = getStaticStringAttributeValue(ariaLabelledby)
        if (ariaValue !== FOOTER_HEADING_ID) {
          context.report({
            node: ariaLabelledby,
            messageId: 'wrongAriaLabelledby',
            data: {value: ariaValue ?? '<dynamic>'},
          })
          return
        }

        // (2) First substantive child must be <h2>
        const firstChild = getFirstSubstantiveChild(node)
        if (
          !firstChild ||
          firstChild.type !== 'JSXElement' ||
          getJSXElementName(firstChild.openingElement) !== 'h2'
        ) {
          context.report({
            node: node.openingElement,
            messageId: 'missingFirstChildH2',
          })
          return
        }

        // (3) <h2> must have id="footer-heading"
        const idAttr = getAttribute(firstChild.openingElement, 'id')
        const idValue = getStaticStringAttributeValue(idAttr)
        if (idValue !== FOOTER_HEADING_ID) {
          context.report({
            node: firstChild.openingElement,
            messageId: 'missingH2Id',
          })
          return
        }

        // (4) <h2> must have sr-only className
        const classNameAttr = getClassNameAttribute(firstChild.openingElement)
        const tokens = tokenizeClassNameAttribute(classNameAttr)
        if (!tokens || !anyBranchContains(tokens, 'sr-only')) {
          context.report({
            node: firstChild.openingElement,
            messageId: 'missingH2SrOnly',
          })
          return
        }
      },
    }
  },
}
