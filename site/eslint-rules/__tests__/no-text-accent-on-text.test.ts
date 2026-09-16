// no-text-accent-on-text (Phase 14) — RuleTester suite.
//
// Coverage:
//   - text-accent on intrinsic text elements, with and without variant prefixes → flag
//   - text-accent in one branch of a ternary → flag (that branch renders text)
//   - text-accent-text, text-accent-fg, text-accent-on-dark → pass (no substring match)
//   - text-accent on an icon component or an SVG element → pass (1.4.11 graphic)
//   - bg-muted beside text-accent-text → pass (the old rule's pair is not the concern)

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-text-accent-on-text.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-text-accent-on-text', rule, {
  valid: [
    {code: `<p className="text-accent-text" />`},
    {code: `<a className="hover:text-accent-text" href="/" />`},
    {code: `<span className="text-accent-fg bg-accent" />`},
    {code: `<p className="text-accent-on-dark" />`},
    {code: `<ClockIcon className="size-3.5 text-accent" />`},
    {code: `<IconComponent className="text-accent" />`},
    {code: `<svg className="text-accent" />`},
    {code: `<section className="bg-muted"><p className="text-accent-text" /></section>`},
    {code: `<div className="border-accent bg-accent/10" />`},
  ],
  invalid: [
    {code: `<p className="text-accent" />`, errors: [{messageId: 'raw'}]},
    {code: `<span className="inline-flex text-accent" />`, errors: [{messageId: 'raw'}]},
    {code: `<a className="hover:text-accent" href="/" />`, errors: [{messageId: 'raw'}]},
    {code: `<h2 className="md:text-accent" />`, errors: [{messageId: 'raw'}]},
    {code: `<p className={cond ? "text-accent" : "text-foreground"} />`, errors: [{messageId: 'raw'}]},
    {code: `<li className={["font-medium", "text-accent"].join(" ")} />`, errors: [{messageId: 'raw'}]},
  ],
})
