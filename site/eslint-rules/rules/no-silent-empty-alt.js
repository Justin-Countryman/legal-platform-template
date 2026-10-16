// no-silent-empty-alt (monorepo backlog 457, [R-465])
//
// An image's alt whose last fallback is the empty string (`alt={x ?? ''}`, `alt={x || name || ''}`,
// `alt={x ? x : ''}`) decides "decorative" silently when the stored description is missing: axe passes an
// empty alt as decoration, so Verify could not tell a missing description from a deliberate one. About thirty
// renderers did it before 457.
//
// The two decisions the platform allows (`lib/imageAlt.ts`):
//
//   - a content image: `alt={contentAlt(stored, fallback)}`, whose empty answer Verify lists for a person;
//   - a decorative image: the literal `alt=""` with `data-decorative=""`, and its reason beside it.
//
// Auto-fix: NOT provided. Content or decoration is the author's decision.

'use strict'

/** True when `node` can evaluate to the empty string by falling back to it. */
function fallsBackToEmpty(node) {
  if (!node) return false
  if (node.type === 'Literal') return node.value === ''
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0 && node.quasis.every((q) => q.value.cooked === '')
  if (node.type === 'LogicalExpression' && (node.operator === '??' || node.operator === '||')) return fallsBackToEmpty(node.right)
  if (node.type === 'ConditionalExpression') return fallsBackToEmpty(node.consequent) || fallsBackToEmpty(node.alternate)
  if (node.type === 'TSNonNullExpression' || node.type === 'TSAsExpression') return fallsBackToEmpty(node.expression)
  return false
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Refuse an image alt that falls back to the empty string: say content (contentAlt) or decorative (alt="")',
      recommended: false,
      url: 'site/lib/imageAlt.ts',
    },
    schema: [],
    messages: {
      silent:
        "This alt falls back to '' and so calls a missing description decorative without saying so (monorepo backlog 457). " +
        "A content image takes alt={contentAlt(stored, fallback)} from lib/imageAlt.ts, whose empty answer Verify lists for a " +
        'person; a decorative one takes the literal alt="" with data-decorative="" and its reason beside it.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name?.type !== 'JSXIdentifier' || node.name.name !== 'alt') return
        if (node.value?.type !== 'JSXExpressionContainer') return
        const expression = node.value.expression
        // A bare literal `alt={''}` is the literal decision, as `alt=""` is.
        if (expression.type === 'Literal' || expression.type === 'TemplateLiteral') return
        if (fallsBackToEmpty(expression)) context.report({node, messageId: 'silent'})
      },
    }
  },
}
