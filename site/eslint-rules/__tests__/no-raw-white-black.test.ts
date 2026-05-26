// no-raw-white-black (B2) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-raw-white-black.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-raw-white-black', rule, {
  valid: [
    // Role tokens — canonical replacements
    {code: `<div className="bg-background text-foreground" />`},
    {code: `<div className="bg-brand-dark text-foreground" />`},
    // ring-white / ring-offset-brand-dark — documented Button focus carve-out;
    // different Tailwind prefixes (ring-, ring-offset-) so they pass through
    // the rule's bg-/text- scope naturally without a file-level allowlist
    {code: `<button className="focus-visible:ring-white">x</button>`},
    {code: `<button className="ring-white ring-offset-brand-dark">x</button>`},
    // Tokens that contain the substring but are different utilities
    {code: `<div className="text-foreground-muted" />`},
    {code: `<div className="bg-foreground" />`},  // bg-foreground (a real role token), not bg-white
    // Conditional with all branches OK
    {code: `<div className={isDark ? "bg-brand-dark" : "bg-background"} />`},
  ],
  invalid: [
    {
      code: `<div className="bg-white" />`,
      errors: [{messageId: 'rawWhite'}],
    },
    {
      code: `<div className="text-white" />`,
      errors: [{messageId: 'rawTextWhite'}],
    },
    {
      code: `<div className="bg-black" />`,
      errors: [{messageId: 'rawBlack'}],
    },
    {
      code: `<div className="text-black" />`,
      errors: [{messageId: 'rawTextBlack'}],
    },
    {
      code: `<div className="hover:bg-white" />`,
      errors: [{messageId: 'rawWhite'}],
    },
    {
      code: `<div className="md:text-white" />`,
      errors: [{messageId: 'rawTextWhite'}],
    },
    // Conditional — at least one branch flags
    {
      code: `<div className={cond ? "bg-white" : "bg-background"} />`,
      errors: [{messageId: 'rawWhite'}],
    },
    // Array.join with conditional
    {
      code: `<div className={["base", isDark && "text-white"].filter(Boolean).join(" ")} />`,
      errors: [{messageId: 'rawTextWhite'}],
    },
  ],
})
