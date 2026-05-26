// no-text-action-raw (T5a) — RuleTester suite.
//
// Coverage:
//   - Plain literal className with text-action → flag
//   - Variant-prefixed (hover:, focus:, md:) → flag
//   - Ternary with text-action in one branch → flag
//   - Array.join + filter(Boolean) with text-action → flag
//   - cn() / clsx() call with text-action as literal arg → flag
//   - cn() with opaque arg + text-action literal → still flag (literal is known)
//   - Allowlist guard (whitespace-tokenizer must distinguish bare text-action
//     from text-action-text / text-action-fg / text-action-hover / text-action-on-light /
//     bg-action / border-action / hover:bg-action — none of those may match)
//   - Non-className context (comments / string literals / CSS-var emission)
//     does not fire — rule scope is JSX className only

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-text-action-raw.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-text-action-raw', rule, {
  valid: [
    // Cascade-aware text-action-text — the canonical replacement
    {code: `<div className="text-action-text" />`},
    {code: `<a className="hover:text-action-text" />`},
    // Other action-namespaced tokens — must not substring-match
    {code: `<button className="bg-action text-action-fg hover:bg-action-hover" />`},
    {code: `<button className="border border-action" />`},
    {code: `<span className="text-action-on-light" />`},
    // Mixed cascade-aware tokens
    {code: `<p className="text-foreground hover:text-accent" />`},
    // Multi-line array.join with only legitimate tokens
    {
      code: `<button className={['bg-action', 'text-action-fg', isHover && 'hover:bg-action-hover'].filter(Boolean).join(' ')} />`,
    },
    // Ternary across both surfaces with text-action-text everywhere
    {
      code: `<a className={isDark ? 'text-action-text' : 'text-action-text'} />`,
    },
    // cn() with cascade-aware tokens only
    {
      code: `<div className={cn('text-action-text', 'border-action')} />`,
    },
    // Non-className contexts — rule scope is JSX className only
    {code: `// text-action is anchored amber`},
    {code: `const css = '--color-action: #f5a623'`},
    {code: `const label = 'bg-action / text-action / border-action'`},
    // Token references inside non-className JSX props (e.g., Studio
    // documentation strings) do not fire
    {code: `<Swatch utility="bg-action / text-action / border-action" />`},
  ],
  invalid: [
    // Plain literal
    {
      code: `<p className="text-action" />`,
      errors: [{messageId: 'rawTextAction'}],
    },
    // Co-mingled with legitimate tokens — still flags
    {
      code: `<p className="text-sm font-medium text-action" />`,
      errors: [{messageId: 'rawTextAction'}],
    },
    // Variant prefixes
    {
      code: `<a className="hover:text-action" />`,
      errors: [{messageId: 'rawTextAction'}],
    },
    {
      code: `<a className="focus:text-action md:hover:text-action" />`,
      errors: [{messageId: 'rawTextAction'}],
    },
    // Surface-paired same-className (the MotionPreview :66 / elevation :159 shape)
    {
      code: `<button className="bg-muted text-foreground hover:text-action" />`,
      errors: [{messageId: 'rawTextAction'}],
    },
    {
      code: `<span className="bg-action/10 text-action" />`,
      errors: [{messageId: 'rawTextAction'}],
    },
    // Ternary with text-action in one branch
    {
      code: `<a className={isActive ? 'text-action' : 'text-foreground'} />`,
      errors: [{messageId: 'rawTextAction'}],
    },
    // Array.join + filter(Boolean) (real production shape)
    {
      code: `<td className={['py-3', 'pr-8', isHighlight && 'text-action'].filter(Boolean).join(' ')} />`,
      errors: [{messageId: 'rawTextAction'}],
    },
    // cn() with text-action as literal arg
    {
      code: `<div className={cn('text-sm', 'text-action')} />`,
      errors: [{messageId: 'rawTextAction'}],
    },
    // cn() with opaque arg + text-action literal — still flags (literal is known)
    {
      code: `<div className={cn(extraClasses, 'text-action')} />`,
      errors: [{messageId: 'rawTextAction'}],
    },
    // SVG element — no detection-level carve-out; StarRating uses per-site disable
    {
      code: `<svg className="text-action" />`,
      errors: [{messageId: 'rawTextAction'}],
    },
  ],
})
