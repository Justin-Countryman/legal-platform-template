// no-svg-without-aria-decision (A6) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-svg-without-aria-decision.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-svg-without-aria-decision', rule, {
  valid: [
    // Decorative — explicit aria-hidden
    {code: `<svg aria-hidden="true" className="size-4"><path d="M0 0" /></svg>`},
    {code: `<svg aria-hidden={true}><path d="M0 0" /></svg>`},
    // Meaningful — aria-label
    {code: `<svg aria-label="Close menu"><path d="M0 0" /></svg>`},
    {code: `<svg aria-label={\`Close \${title}\`}><path d="M0 0" /></svg>`},
    // Meaningful — aria-labelledby
    {code: `<svg aria-labelledby="title-id"><path d="M0 0" /></svg>`},
    // Explicit role
    {code: `<svg role="img"><path d="M0 0" /></svg>`},
    {code: `<svg role="presentation"><path d="M0 0" /></svg>`},
    // Spread attribute — bail (icon-registry SVG_PROPS pattern)
    {code: `<svg {...SVG_PROPS} className="size-4"><path d="M0 0" /></svg>`},
    {code: `<svg className="size-4" {...iconProps}><path d="M0 0" /></svg>`},
    // Non-SVG elements aren't in scope
    {code: `<div className="size-4"><path d="M0 0" /></div>`},
    {code: `<img alt="x" />`}, // imgs are a different rule (A1)
  ],
  invalid: [
    // Bare svg
    {
      code: `<svg className="size-4"><path d="M0 0" /></svg>`,
      errors: [{messageId: 'missing'}],
    },
    {
      code: `<svg viewBox="0 0 24 24"><path d="M0 0" /></svg>`,
      errors: [{messageId: 'missing'}],
    },
    // svg with stroke / fill but no aria
    {
      code: `<svg fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M0 0" /></svg>`,
      errors: [{messageId: 'missing'}],
    },
    // Mirrors the original Select.tsx:44 pre-fix shape (drift-fix target
    // in Commit 10 — reproduced as fixture)
    {
      code: `<svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6l4 4 4-4" /></svg>`,
      errors: [{messageId: 'missing'}],
    },
  ],
})
