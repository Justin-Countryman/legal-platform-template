// color-roles (Phase 16A, [R-471])
//
// Every kind of element takes one color role, whatever the palette. A component
// may paint with the button color (`action`) only on a button, and never paints a
// fill, border, ring or gradient in the raw accent:
//
//   buttons ............................ action, action-fg (Button.tsx only)
//   hover, focus, selected, open, current-page states .. cue
//   static decorations: icon chips, marks, quote rules, frames .. decor
//   text links ......................... action-text
//   highlighted words, the line above a heading .. accent-text
//   stars .............................. star-fill (one fixed gold, [R-474])
//
// Flagged: a background, gradient stop, border, ring, outline, shadow, fill,
// stroke, divide or decoration utility in `action` or `accent` (any variant, any
// opacity). Not flagged: the text forms (`text-action-text`, `text-accent-text`),
// the named fills (`accent-fill`, `accent-fg`, `action-fg`), `action-state-cue`,
// and `text-accent` on an icon, which `no-text-accent-on-text` owns.
//
// Button.tsx is exempt in eslint.config.mjs: it is where the button color lives.
// Scope: JSX className values through the shared tokenizer; a class held in a `.ts`
// map is invisible here and is held by the rendered role test instead.

'use strict'

const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute} = require('../lib/ast-utils')

const RAW = /^(?:bg|from|to|via|border(?:-[trblxyse]{1,2})?|ring|outline|shadow|fill|stroke|divide|decoration)-(action|accent)(?:-hover)?(?:\/\d+)?$/

function base(token) {
  const idx = token.lastIndexOf(':')
  return idx >= 0 ? token.slice(idx + 1) : token
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Paint with the color role the element takes: cue for states, decor for decorations, the button color only on a button',
      recommended: false,
      url: 'BI/skills/skill-color-system/SKILL.md',
    },
    schema: [],
    messages: {
      rawRole:
        "'{{token}}' paints with the raw {{role}} color. States (hover, focus, selected, open, current page) take 'cue'; static decorations (icon chips, marks, quote rules, frames) take 'decor'; the button color belongs to Button only. See skill-color-system, the role map.",
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
            const match = RAW.exec(base(token))
            if (!match) continue
            context.report({node: classNameAttr, messageId: 'rawRole', data: {token, role: match[1] === 'action' ? 'button' : 'accent'}})
            return
          }
        }
      },
    }
  },
}
