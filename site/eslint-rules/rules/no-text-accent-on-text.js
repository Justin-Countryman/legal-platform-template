// no-text-accent-on-text (Phase 14; was no-text-accent-on-bg-muted, T5b)
//
// Flag `text-accent` (with any variant prefix: hover:, md:, group-hover:) on an
// intrinsic JSX element such as <p>, <span>, <a> or <h2>. Icon COMPONENTS
// (<ClockIcon>, <IconComponent>) and SVG elements are not flagged.
//
// Why. Since Phase 14 the accent has two forms. `--color-accent` is the brand
// color as a fill, a rule or an icon: WCAG 2.2 1.4.11 asks 3:1 of a meaningful
// graphic and exempts an icon beside its own text, and a gold accent measures
// about 2.4:1 on white. `--color-accent-text` is the accent AS TEXT: the accent
// itself where it reaches 4.5:1 on every light ground, else the accent darkened at
// its own hue until it does (gold #C9A227 renders #846700), and on dark grounds the
// brightened accent. Text is measured by 1.4.3 at 4.5:1, so text must take
// `text-accent-text`. The color guarantee test proves `accent-text` passes for any
// accent an operator types; nothing proves it for the raw accent.
//
// The old rule flagged `text-accent` beside `bg-muted` in one className. It could
// not see an ancestor's surface (a nested pair was never flagged, and 0 of 43 real
// sites shared a className with a surface), and after Phase 14 `muted` carries no
// accent hue, so its rationale no longer held (WS-V1-PHASE14-DESIGN §7 amendment 4).
//
// Branch semantics are the tokenizer's: `cond ? "text-accent" : "x"` flags,
// because the branch that renders is text-accent on a text element.
//
// Auto-fix: none. An intrinsic element colored with the accent is almost always
// text (use `text-accent-text`); where it is genuinely a decorative glyph, wrap the
// glyph in an icon component or disable the line and say why.

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute} = require('../lib/ast-utils')

const SVG_ELEMENTS = new Set(['svg', 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'use'])

function stripVariantPrefixes(token) {
  const idx = token.lastIndexOf(':')
  return idx >= 0 ? token.slice(idx + 1) : token
}

function isIntrinsicTextHost(node) {
  if (node.name.type !== 'JSXIdentifier') return false
  const name = node.name.name
  return /^[a-z]/.test(name) && !SVG_ELEMENTS.has(name)
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the raw accent on an intrinsic element: text takes text-accent-text',
      recommended: false,
      url: '.claude/skills/skill-color-system/SKILL.md',
    },
    schema: [],
    messages: {
      raw:
        "'text-accent' colors text with the accent's fill form, which is not contrast-checked as text (gold measures about 2.4:1 on white). Use 'text-accent-text', the accent as text, which reaches 4.5:1 on every ground for any accent. Icons beside their own text may keep 'text-accent' on the icon component. See skill-color-system.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!isIntrinsicTextHost(node)) return
        const classNameAttr = getClassNameAttribute(node)
        if (!classNameAttr) return
        const result = tokenizeClassNameAttribute(classNameAttr)
        if (!result) return
        for (const branch of result.branches) {
          if (branch.some((token) => stripVariantPrefixes(token) === 'text-accent')) {
            context.report({node: classNameAttr, messageId: 'raw'})
            return
          }
        }
      },
    }
  },
}
