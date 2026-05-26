// no-arbitrary-color (T1) — RuleTester suite.
//
// RuleTester needs `describe` / `it` globals; vitest provides them via its
// default runner.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-arbitrary-color.js'

// Wire vitest's describe/it onto globalThis so RuleTester can pick them up.
;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-arbitrary-color', rule, {
  valid: [
    {code: `<div className="bg-action text-foreground" />`},
    {code: `<div className="border-border ring-focus" />`},
    {code: `<div className={cond ? "bg-muted" : "bg-background"} />`},
    {code: `<div className="rounded-[6px] gap-[0.125rem]" />`}, // non-color arbitrary values
    {code: `<button className="focus-visible:ring-white">x</button>`}, // skill-color-system carve-out
    // `ring-white` is a built-in token, not arbitrary; not flagged
    {code: `<div className={\`mb-2 \${someClass}\`} />`}, // template w/ interpolation
    {code: `<div className={getClasses()} />`}, // opaque
  ],
  invalid: [
    {
      code: `<div className="bg-[#ff0000]" />`,
      errors: [{messageId: 'arbitrary'}],
    },
    {
      code: `<div className="text-[rgb(0,0,0)]" />`,
      errors: [{messageId: 'arbitrary'}],
    },
    {
      code: `<div className="border-[hsl(0,0%,0%)]" />`,
      errors: [{messageId: 'arbitrary'}],
    },
    {
      code: `<div className="fill-[#abcdef]" />`,
      errors: [{messageId: 'arbitrary'}],
    },
    {
      code: `<div className="hover:bg-[#ff0000]" />`,
      errors: [{messageId: 'arbitrary'}],
    },
    {
      code: `<div className={cond ? "bg-action" : "bg-[#ff0000]"} />`,
      errors: [{messageId: 'arbitrary'}],
    },
    {
      code: `<div className={["bg-action", isError && "text-[rgb(255,0,0)]"].filter(Boolean).join(" ")} />`,
      errors: [{messageId: 'arbitrary'}],
    },
  ],
})
