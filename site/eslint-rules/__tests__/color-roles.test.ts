// color-roles (Phase 16A, [R-471]) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/color-roles.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {parser: tsParser, parserOptions: {ecmaFeatures: {jsx: true}}},
})

tester.run('platform/color-roles', rule, {
  valid: [
    {code: `<a className="hover:border-cue focus-visible:ring-focus" />`},
    {code: `<span className="bg-decor/10 rounded-ui" />`},
    {code: `<a className="text-action-text hover:text-action-text-hover" />`},
    {code: `<p className="text-accent-text" />`},
    {code: `<div className="bg-accent-fill text-accent-fg" />`},
    {code: `<span className="ring-1 ring-action-state-cue bg-cue" />`},
    {code: `<svg className="text-accent" />`},
    {code: `const doc = 'bg-action / border-accent'`},
  ],
  invalid: [
    {code: `<div className="bg-action" />`, errors: [{messageId: 'rawRole'}]},
    {code: `<div className="group-hover:border-action" />`, errors: [{messageId: 'rawRole'}]},
    {code: `<div className="from-action/30 to-cue/10" />`, errors: [{messageId: 'rawRole'}]},
    {code: `<blockquote className="border-l-4 border-accent" />`, errors: [{messageId: 'rawRole'}]},
    {code: `<div className="border-l-accent" />`, errors: [{messageId: 'rawRole'}]},
    {code: `<div className={active ? 'bg-accent/10' : ''} />`, errors: [{messageId: 'rawRole'}]},
    {code: `<div className="hover:ring-action" />`, errors: [{messageId: 'rawRole'}]},
  ],
})
