// no-theme-for-style-set (Phase 17C, `[R-535]`)
//
// In a module that imports `lib/styleSets`, a name it declares must not say theme: there the
// word would be the style set's old name (`for (const theme of STYLE_SETS)`). Code may say theme
// for the flow of the page; a module that also names the flow lists those names in the rule's
// `allow` option, each one read in review. The check itself is `lib/style-set-names.js`, which
// the Studio's test applies to `studio/` as well.

'use strict'

const {scopedThemeNames} = require('../lib/style-set-names')

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'In a module that imports lib/styleSets, no declared name says theme, which there would mean the style set (Phase 17C, [R-535]).',
    },
    schema: [{type: 'object', properties: {allow: {type: 'array', items: {type: 'string'}}}, additionalProperties: false}],
    messages: {
      themeName:
        "'{{name}}' says theme in a module that imports lib/styleSets. The style set is styleSet in code (Phase 17C, [R-535]); if the name means the flow of the page, add it to this rule's allow list in eslint.config.mjs.",
    },
  },
  create(context) {
    const allow = (context.options[0] && context.options[0].allow) || []
    return {
      'Program:exit'(program) {
        for (const {node, name} of scopedThemeNames(program, allow)) context.report({node, messageId: 'themeName', data: {name}})
      },
    }
  },
}
