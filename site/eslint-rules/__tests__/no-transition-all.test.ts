// no-transition-all (B1) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-transition-all.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-transition-all', rule, {
  valid: [
    // Explicit property lists — canonical replacement
    {code: `<div className="transition-colors" />`},
    {code: `<div className="transition-shadow duration-ui-fast" />`},
    {code: `<div className="transition-[box-shadow,translate,border-color]" />`},
    // No transition utility at all
    {code: `<div className="bg-action text-foreground" />`},
    // transition-* without -all — these ARE OK
    {code: `<div className="transition-opacity" />`},
    {code: `<div className="transition-transform" />`},
    {code: `<div className="hover:transition-colors" />`},
    // Should NOT match `transitions-all` or `transition-all-x` if those existed
    // (none do in Tailwind today)
  ],
  invalid: [
    {
      code: `<div className="transition-all" />`,
      errors: [{messageId: 'noAll'}],
    },
    {
      code: `<div className="hover:transition-all" />`,
      errors: [{messageId: 'noAll'}],
    },
    {
      code: `<div className="md:transition-all" />`,
      errors: [{messageId: 'noAll'}],
    },
    {
      code: `<div className={cond ? "transition-all" : "transition-colors"} />`,
      errors: [{messageId: 'noAll'}],
    },
    {
      code: `<div className={["base-classes", "transition-all"].join(" ")} />`,
      errors: [{messageId: 'noAll'}],
    },
  ],
})
