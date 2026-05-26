// no-manual-cascade-override (T2) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-manual-cascade-override.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-manual-cascade-override', rule, {
  valid: [
    // Cascade-aware tokens — these are the correct usage
    {code: `<div className="text-foreground border-border" />`},
    {code: `<div className="hover:bg-hover-wash ring-focus" />`},
    {code: `<div className="text-accent text-action-text" />`},
    // Tokens that look similar but aren't on-dark
    {code: `<div className="text-foreground-muted text-foreground-subtle" />`},
    {code: `<div className="border-foreground" />`},
    // Conditional with all branches OK
    {code: `<div className={isDark ? "text-foreground" : "text-foreground"} />`},
    // Non-className contexts — comments, strings (rule scope is JSX className only)
    {code: `// text-foreground-on-dark is the cascade target`},
    {code: `const css = '--color-foreground-on-dark: #fff'`},
  ],
  invalid: [
    {
      code: `<div className="text-foreground-on-dark" />`,
      errors: [{messageId: 'manual'}],
    },
    {
      code: `<div className="text-foreground-muted-on-dark" />`,
      errors: [{messageId: 'manual'}],
    },
    {
      code: `<div className="border-border-on-dark" />`,
      errors: [{messageId: 'manual'}],
    },
    {
      code: `<div className="ring-focus-on-dark" />`,
      errors: [{messageId: 'manual'}],
    },
    {
      code: `<div className="text-accent-on-dark" />`,
      errors: [{messageId: 'manual'}],
    },
    {
      code: `<div className="hover:bg-hover-wash-on-dark" />`,
      errors: [{messageId: 'manual'}],
    },
    {
      code: `<div className="md:text-foreground-on-dark" />`,
      errors: [{messageId: 'manual'}],
    },
    // Mixed — at least one branch flags
    {
      code: `<div className={isDark ? "text-foreground-on-dark" : "text-foreground"} />`,
      errors: [{messageId: 'manual'}],
    },
    // WS7.7-shape array.join with conditional
    {
      code: `<div className={["text-base", isDark && "text-foreground-on-dark"].filter(Boolean).join(" ")} />`,
      errors: [{messageId: 'manual'}],
    },
    // Whole-token check (false-positive guard): text-foreground-muted-on-dark
    // must match — it's a forbidden token; whitespace-tokenization keeps it
    // distinct from text-foreground-muted.
    {
      code: `<div className="text-foreground-muted text-foreground-muted-on-dark" />`,
      errors: [{messageId: 'manual'}],
    },
  ],
})
