// heading-cascade-discipline (A2)
//
// Every `<h1>` – `<h6>` must explicitly carry a cascade-aware text token
// (or the `sr-only` exception). Bare headings rely on inherited
// computed-color from `<body>`, which bypasses the dark-context cascade
// rule in `globals.css` — a bare heading inside `[data-ring-context="dark"]`
// silently renders dark text on a dark surface.
//
// Posture lock per `BI-FOUNDATIONS.md → "Heading-cascade discipline:
// bare headings on dark surfaces silently break"`:
//
//   > Any heading element (`<h1>` through `<h6>`) on a dark-surface
//   > context MUST explicitly use a cascade-aware text token
//   > (`text-foreground`, `text-foreground-muted`, or the `tagline`
//   > utility class). A bare heading with no text-color class will
//   > silently render as dark text on a dark surface despite every
//   > parent being correctly wrapped in `[data-ring-context="dark"]`.
//   > [...]
//   > The rule: every heading on a dark-surface context must reference
//   > a cascade-aware text token explicitly. Pure inheritance bypasses
//   > the cascade.
//
// Mechanism (re-stated for grep findability) per `skill-color-system →
// "Cascade reassignment vs. computed-color inheritance"`:
//
//   > The cascade rule reassigns custom properties (`--color-foreground`,
//   > etc.) inside `[data-ring-context="dark"]` containers, but those
//   > reassignments only affect elements that EXPLICITLY reference the
//   > variable at their own DOM position. CSS color inheritance carries
//   > a COMPUTED value down the tree — once `<body>` set `color:
//   > var(--color-foreground)` at `:root`, that color resolved to the
//   > on-light value and is inherited as a fixed color, not as a
//   > variable reference.
//
// Lock provenance: WS7.7 Commit 2 amend (h1 cascade bug surfaced during
// blog post detail visual check) + WS7.7 Commit 2b (cascade-discipline
// retrofit on 14 bare headings) + WS8 Commit 16a (cascade-discipline
// drift sweep on 37 headings — full platform compliance).
//
// Rule contract (per WS8 Phase 2 + Justin direction):
//
//   1. Visit `<h1>`–`<h6>` JSXOpeningElement.
//   2. If no `className` attribute at all → report `noClassName`.
//      A heading without className relies entirely on inheritance;
//      that's the silent-break risk the posture rejects.
//   3. If className tokenizes opaque (`complete: false` from the
//      tokenizer) → SKIP. Per "false-negatives over false-positives"
//      guidance — opaque expressions might contain the right token
//      via runtime composition.
//      Examples: `className={headingClassName}` (Identifier),
//      `className={cn(...someVar)}` (call with non-literal args),
//      `className={`text-foreground ${suffix}`}` (template with
//      interpolation).
//   4. If className tokenizes complete and EVERY branch contains at
//      least one cascade-aware token → pass.
//   5. Otherwise → report `missingCascadeToken`.
//
// Acceptable cascade-aware token allowlist (Justin direction):
//
//   - text-foreground         — primary content
//   - text-foreground-muted   — secondary content (footer column titles, etc.)
//   - text-foreground-subtle  — tertiary content
//   - text-accent             — decorative emphasis
//   - text-action-text        — action-color text on light surface
//   - text-current            — explicit currentColor reference
//   - text-inherit            — explicit inherit reference
//   - text-brand-dark         — anchored brand-dark color (used by homepage h1)
//   - tagline                 — utility class includes text-accent internally
//   - sr-only                 — screen-reader-only exception (footer landmark h2)
//
// Auto-fix: NOT provided. Per Justin direction:
//   "The right token isn't always text-foreground — sometimes
//    text-foreground-muted is correct (footer column h3s, secondary
//    headings). Auto-fix would either default to text-foreground
//    (wrong for ~10% of future cases) or require complex heuristics.
//    Better to surface and let the developer choose."

'use strict'

const {
  tokenizeClassNameAttribute,
  everyBranchContainsAnyOf,
} = require('../lib/className-tokenizer')
const {getClassNameAttribute, getJSXElementName} = require('../lib/ast-utils')

const HEADING_NAMES = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const ACCEPTABLE_TOKENS = [
  'text-foreground',
  'text-foreground-muted',
  'text-foreground-subtle',
  'text-accent',
  'text-action-text',
  'text-current',
  'text-inherit',
  'text-brand-dark',
  'tagline',
  'sr-only',
]

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Every <h1>–<h6> must explicitly carry a cascade-aware text token; bare headings break silently on dark surfaces.',
      recommended: false,
      url: 'BI/BI-FOUNDATIONS.md#heading-cascade-discipline-bare-headings-on-dark-surfaces-silently-break',
    },
    schema: [],
    messages: {
      noClassName:
        '<{{tag}}> has no className attribute. Bare headings rely on inherited computed-color from <body>, which bypasses the dark-context cascade rule and silently renders dark text on dark surfaces. Add an explicit cascade-aware token (typically `text-foreground`; use `text-foreground-muted` for secondary headings like footer column titles, or `tagline`/`sr-only` where appropriate). See BI-FOUNDATIONS.md → "Heading-cascade discipline" and skill-color-system → "Cascade reassignment vs. computed-color inheritance".',
      missingCascadeToken:
        '<{{tag}}> className lacks a cascade-aware text token. Add one of: text-foreground (primary), text-foreground-muted (secondary), text-foreground-subtle (tertiary), text-accent (decorative), text-action-text, text-current, text-inherit, text-brand-dark, tagline (utility class), or sr-only (screen-reader-only exception). Inherited body color does NOT cascade-swap on dark surfaces — explicit reference is required. See BI-FOUNDATIONS.md → "Heading-cascade discipline" and skill-color-system → "Cascade reassignment vs. computed-color inheritance".',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const tag = getJSXElementName(node)
        if (!tag || !HEADING_NAMES.has(tag)) return

        const classNameAttr = getClassNameAttribute(node)
        if (!classNameAttr) {
          context.report({node, messageId: 'noClassName', data: {tag}})
          return
        }

        const result = tokenizeClassNameAttribute(classNameAttr)

        // Defensive: if tokenizer returns null entirely, treat as no
        // className (rare — would mean the attribute exists but has no
        // value, e.g., `<h1 className />`).
        if (!result) {
          context.report({node, messageId: 'noClassName', data: {tag}})
          return
        }

        // Opaque tokenization — skip per "false-negatives over false-
        // positives" guidance. Opaque expressions might compose the
        // right token at runtime; flagging them risks false-positive
        // churn that undermines the rule's signal.
        if (!result.complete) return

        // All branches must contain at least one acceptable token.
        if (!everyBranchContainsAnyOf(result, ACCEPTABLE_TOKENS)) {
          context.report({
            node: classNameAttr,
            messageId: 'missingCascadeToken',
            data: {tag},
          })
        }
      },
    }
  },
}
