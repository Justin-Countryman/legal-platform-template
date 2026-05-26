// no-tagline-classname-mb (C1) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-tagline-classname-mb.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-tagline-classname-mb', rule, {
  valid: [
    // Canonical: typed `mb` prop
    {code: `<Tagline mb="mb-2">x</Tagline>`},
    {code: `<Tagline mb="mb-3" className="text-center">x</Tagline>`},
    // No className at all
    {code: `<Tagline>x</Tagline>`},
    // className without mb-* (other utilities are fine)
    {code: `<Tagline className="text-center">x</Tagline>`},
    {code: `<Tagline className="text-accent uppercase">x</Tagline>`},
    // mt-* is NOT mb-* — passes
    {code: `<Tagline className="mt-4">x</Tagline>`},
    // Other components passing mb-* are unaffected — only Tagline is scoped
    {code: `<div className="mb-2">x</div>`},
    {code: `<p className="mb-3">x</p>`},
    {code: `<Heading className="mb-2">x</Heading>`},
    // Opaque className
    {code: `<Tagline className={getClasses()}>x</Tagline>`},
  ],
  invalid: [
    {
      code: `<Tagline className="mb-2">x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
    {
      code: `<Tagline className="mb-3 text-center">x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
    {
      code: `<Tagline as="p" className="mb-4">x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
    // Decimal margin
    {
      code: `<Tagline className="mb-0.5">x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
    // Arbitrary-value margin
    {
      code: `<Tagline className="mb-[14px]">x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
    // Negative margin
    {
      code: `<Tagline className="-mb-2">x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
    // Variant-prefixed (the typed prop doesn't accept these — even more
    // clearly a bypass)
    {
      code: `<Tagline className="md:mb-4">x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
    {
      code: `<Tagline className="hover:mb-3">x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
    // Conditional — at least one branch flags
    {
      code: `<Tagline className={cond ? "mb-2" : "text-center"}>x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
    // Array.join with conditional
    {
      code: `<Tagline className={["text-center", cond && "mb-2"].filter(Boolean).join(" ")}>x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
    // clsx-style
    {
      code: `<Tagline className={cn("text-center", "mb-3")}>x</Tagline>`,
      errors: [{messageId: 'classNameMb'}],
    },
  ],
})
