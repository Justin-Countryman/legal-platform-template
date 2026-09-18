// no-fixed-radius (Phase 16A, [R-473])
//
// Flag a fixed corner radius in className: `rounded`, `rounded-sm` … `rounded-3xl`,
// `rounded-none`, and their side forms (`rounded-t-md`, `rounded-tl-lg`, …). A site's
// corners are one family, chosen once: surfaces (cards, images, fields, panels,
// badges, row highlights) read `rounded-ui` and controls read `rounded-btn`, both of
// which follow Design Settings. A fixed radius stays behind when the family changes,
// which is exactly what Phase 16A found on four surfaces.
//
// Allowed: `rounded-ui`, `rounded-btn` and their side forms, `rounded-full` (a
// circle or a dot is a shape, not a corner), and a fixed radius under a focus
// variant (`focus-visible:rounded-sm`), which shapes only the focus ring around a
// word, never a surface.
//
// Scope: JSX className values, through the shared tokenizer. A class string held
// in an object or a `.ts` map is invisible to this rule; those are fixed by hand
// and held by the class-resolution tests.

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute} = require('../lib/ast-utils')

const FIXED = /^rounded(?:-(?:t|r|b|l|tl|tr|br|bl|s|e|ss|se|es|ee|x|y))?(?:-(?:none|xs|sm|md|lg|xl|2xl|3xl|4xl))?$/

function split(token) {
  const idx = token.lastIndexOf(':')
  return idx >= 0 ? {variants: token.slice(0, idx).split(':'), base: token.slice(idx + 1)} : {variants: [], base: token}
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a fixed corner radius; surfaces use rounded-ui and controls rounded-btn, so corners follow the site family',
      recommended: false,
      url: 'BI/skills/skill-radius-system/SKILL.md',
    },
    schema: [],
    messages: {
      fixedRadius:
        "'{{token}}' is a fixed radius and will not follow the site's corner family (Design Settings, Corners). Use 'rounded-ui' on a surface or 'rounded-btn' on a control; 'rounded-full' for a circle; a fixed radius only under a focus variant. See skill-radius-system.",
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
            const {variants, base} = split(token)
            if (!FIXED.test(base)) continue
            if (variants.some((v) => v === 'focus' || v === 'focus-visible' || v === 'focus-within')) continue
            context.report({node: classNameAttr, messageId: 'fixedRadius', data: {token}})
            return
          }
        }
      },
    }
  },
}
