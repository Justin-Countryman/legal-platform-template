// no-bg-muted (T4) — RuleTester suite.
//
// The rule itself is unscoped (fires on any bg-muted token in className).
// File-scoping happens in eslint.config.mjs via a `files: [...]` block.
// Tests exercise the rule's match logic directly; file-scoping is a
// config concern verified by the synthetic in-tree test in the commit.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-bg-muted.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-bg-muted', rule, {
  valid: [
    // Canonical light fallback — bg-background
    {code: `<section className="bg-background">x</section>`},
    // Dark fallback — bg-brand-dark
    {code: `<section className="bg-brand-dark">x</section>`},
    // Conditional with both options being canonical
    {code: `<section className={isDark ? "bg-brand-dark" : "bg-background"}>x</section>`},
    // Tokens that contain the substring "muted" but aren't bg-muted
    {code: `<section className="text-foreground-muted">x</section>`},
    {code: `<section className="bg-muted-x">x</section>`}, // hypothetical, not bg-muted
    // No className
    {code: `<section>x</section>`},
    // Opaque
    {code: `<section className={getClasses()}>x</section>`},
  ],
  invalid: [
    // Direct bg-muted
    {
      code: `<section className="bg-muted">x</section>`,
      errors: [{messageId: 'noBgMuted'}],
    },
    // Combined with other classes
    {
      code: `<section className="px-[5%] pb-12 bg-muted">x</section>`,
      errors: [{messageId: 'noBgMuted'}],
    },
    // The original WS8 Commit 1 pre-fix shape (now corrected to bg-background)
    {
      code: `<section className={["px-[5%] pb-12", !hasImage && (isDark ? 'bg-brand-dark' : 'bg-muted')].filter(Boolean).join(' ')}>x</section>`,
      errors: [{messageId: 'noBgMuted'}],
    },
    // Variant-prefixed forms
    {
      code: `<section className="hover:bg-muted">x</section>`,
      errors: [{messageId: 'noBgMuted'}],
    },
    {
      code: `<section className="md:bg-muted">x</section>`,
      errors: [{messageId: 'noBgMuted'}],
    },
    // Conditional with one branch flagged
    {
      code: `<section className={cond ? "bg-background" : "bg-muted"}>x</section>`,
      errors: [{messageId: 'noBgMuted'}],
    },
    // Element other than <section> — rule is unscoped to element name
    // (the file-path scope in eslint.config.mjs limits where it fires;
    // the rule itself fires on any element in those files)
    {
      code: `<header className="bg-muted">x</header>`,
      errors: [{messageId: 'noBgMuted'}],
    },
    {
      code: `<div className="bg-muted">x</div>`,
      errors: [{messageId: 'noBgMuted'}],
    },
  ],
})
