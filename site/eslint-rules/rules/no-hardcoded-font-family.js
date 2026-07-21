// no-hardcoded-font-family (T8)
//
// Flag hardcoded font families in component code:
//   style={{fontFamily: 'Lora, serif'}}
//   `font-family: Georgia, serif`
//   className="font-['Lora']"
//
// Posture lock:
//   `BI-PRINCIPLES.md → Performance / Fonts` + `skill-typography → CSS chain`:
//   the platform self-hosts fonts and drives them from Sanity
//   (`designSettings.fontPairingPreset` / `customFonts`), which emit
//   `--dynamic-font-heading` / `--dynamic-font-body`. Components consume
//   `font-heading` / `font-body`, never a family name.
//
// WHY THIS EXISTS ALONGSIDE THE EXISTING FONT RULES. Those block font
// FETCHING: `no-restricted-syntax` catches the Google Fonts CDN hosts and
// `no-restricted-imports` blocks `next/font/google`. Neither catches a font
// VALUE typed into a component, which is the half OUTSTANDING item 46 names.
// A block that hardcodes `fontFamily: 'Lora, serif'` keeps rendering Lora after
// an operator changes `fontPairingPreset`, so the design setting appears to
// work and does nothing — the same failure the thin block schema exists to
// avoid, arriving through the rendering side.
//
// Scope: the `fontFamily` property in object expressions (inline styles and
// style objects), `font-family:` inside string/template CSS, and Tailwind's
// arbitrary-value `font-[…]` class.
//
// Carve-outs:
//   - `var(--…)` values pass: that IS the token path.
//   - Generic CSS keywords alone (`inherit`, `initial`, `unset`, `revert`)
//     pass; they select no family.
//   - Token-system boundary files (lib/token-boundary.js): the Design Studio
//     font catalog must name families literally to preview them, and Satori
//     cannot resolve CSS variables at all.

'use strict'

const {isTokenBoundaryFile} = require('../lib/token-boundary')
const {tokenizeClassNameAttribute} = require('../lib/className-tokenizer')
const {getClassNameAttribute} = require('../lib/ast-utils')

const PASSTHROUGH = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer'])
const FONT_ARBITRARY_RE =
  /^(?:[a-z-]+:)*font-\[[^\]]+\]$/

function isTokenised(value) {
  return typeof value === 'string' && value.includes('var(--')
}

function isPassthrough(value) {
  return typeof value === 'string' && PASSTHROUGH.has(value.trim().toLowerCase())
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded font families — consume font-heading / font-body, which resolve the Sanity-driven font pairing',
      recommended: false,
      url: 'BI-PRINCIPLES.md#performance--fonts',
    },
    schema: [],
    messages: {
      hardcodedFamily:
        'Hardcoded font family "{{value}}" — use the `font-heading` / `font-body` utilities, or var(--dynamic-font-heading|body). A literal family ignores designSettings.fontPairingPreset, so changing the pairing silently does nothing here. See BI-PRINCIPLES.md → Performance / Fonts and skill-typography → CSS chain.',
      arbitraryFontClass:
        'Arbitrary font utility "{{value}}" — use `font-heading` or `font-body`. See skill-typography → CSS chain.',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (isTokenBoundaryFile(filename)) return {}

    function reportValue(node, value) {
      if (typeof value !== 'string' || value.trim() === '') return
      if (isTokenised(value) || isPassthrough(value)) return
      context.report({
        node,
        messageId: 'hardcodedFamily',
        data: {value: value.length > 40 ? `${value.slice(0, 40)}…` : value},
      })
    }

    return {
      // style={{fontFamily: '…'}} and any object literal carrying fontFamily.
      Property(node) {
        const key = node.key
        const name = key && (key.name || key.value)
        if (name !== 'fontFamily') return
        const v = node.value
        if (v.type === 'Literal') reportValue(v, v.value)
        else if (v.type === 'TemplateLiteral') {
          const cooked = v.quasis.map((q) => q.value.cooked ?? '').join('')
          // A template that interpolates is usually building from data (the
          // catalog case); only flag when the static text alone names a family.
          if (v.expressions.length === 0) reportValue(v, cooked)
        }
      },

      // `font-family:` written into a CSS string or template (styled strings,
      // injected <style> content, @font-face builders).
      Literal(node) {
        if (typeof node.value !== 'string') return
        const m = node.value.match(/font-family\s*:\s*([^;]+)/i)
        if (m) reportValue(node, m[1])
      },
      TemplateElement(node) {
        const cooked = node.value && node.value.cooked
        if (typeof cooked !== 'string') return
        const m = cooked.match(/font-family\s*:\s*([^;]+)/i)
        if (m) reportValue(node, m[1])
      },

      // Tailwind arbitrary font utility: className="font-['Lora']"
      JSXOpeningElement(node) {
        const classNameAttr = getClassNameAttribute(node)
        if (!classNameAttr) return
        const result = tokenizeClassNameAttribute(classNameAttr)
        if (!result) return
        for (const branch of result.branches) {
          for (const token of branch) {
            if (FONT_ARBITRARY_RE.test(token)) {
              context.report({
                node: classNameAttr,
                messageId: 'arbitraryFontClass',
                data: {value: token},
              })
              return // one report per className is enough
            }
          }
        }
      },
    }
  },
}
