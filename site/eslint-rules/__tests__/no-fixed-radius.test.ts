// no-fixed-radius (Phase 16A, [R-473]) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-fixed-radius.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {parser: tsParser, parserOptions: {ecmaFeatures: {jsx: true}}},
})

tester.run('platform/no-fixed-radius', rule, {
  valid: [
    {code: `<div className="rounded-ui border border-border" />`},
    {code: `<button className="rounded-btn bg-action" />`},
    {code: `<img className="rounded-t-ui" />`},
    {code: `<span className="size-2 rounded-full" />`},
    // A focus ring's shape, never a surface
    {code: `<a className="focus-visible:ring-2 focus-visible:rounded-sm" />`},
    {code: `<div className={cn('rounded-ui', isOpen && 'rounded-b-ui')} />`},
    // Not className
    {code: `const label = 'rounded-md'`},
  ],
  invalid: [
    {code: `<div className="rounded" />`, errors: [{messageId: 'fixedRadius'}]},
    {code: `<div className="p-4 rounded-md" />`, errors: [{messageId: 'fixedRadius'}]},
    {code: `<div className="rounded-none" />`, errors: [{messageId: 'fixedRadius'}]},
    {code: `<div className="md:rounded-lg" />`, errors: [{messageId: 'fixedRadius'}]},
    {code: `<div className="rounded-tl-xl" />`, errors: [{messageId: 'fixedRadius'}]},
    {code: `<div className={isCard ? 'rounded-ui' : 'rounded-sm'} />`, errors: [{messageId: 'fixedRadius'}]},
    {code: `<div className={['grid', 'rounded-2xl'].join(' ')} />`, errors: [{messageId: 'fixedRadius'}]},
  ],
})
