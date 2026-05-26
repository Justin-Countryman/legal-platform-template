// no-text-accent-on-bg-muted (T5b) — RuleTester suite.
//
// Coverage:
//   - Pair in same literal className → flag
//   - Pair with variant-prefixed text-accent → flag
//   - Pair in same array.join branch → flag
//   - Pair separated across ternary branches (different runtime renders) → pass
//   - bg-muted alone → pass
//   - text-accent alone on bg-background → pass (cascade-aware, in the matrix)
//   - text-accent on dark surface → pass (cascade resolves to brightened on-dark)
//   - Allowlist guard: text-accent-fg / text-accent-on-dark / text-accent-* must
//     not substring-match the bare text-accent token

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-text-accent-on-bg-muted.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-text-accent-on-bg-muted', rule, {
  valid: [
    // text-accent alone on bg-background — legitimate (in the canonical matrix)
    {code: `<p className="bg-background text-accent" />`},
    // text-accent on dark surface — legitimate (cascade resolves to brightened on-dark)
    {code: `<section className="bg-brand-dark"><p className="text-accent" /></section>`},
    // bg-muted alone — legitimate
    {code: `<section className="bg-muted">{children}</section>`},
    // bg-muted + text-foreground-muted — the canonical replacement
    {code: `<p className="bg-muted text-foreground-muted" />`},
    // Other accent-namespaced tokens — must not substring-match the bare text-accent
    {code: `<div className="bg-accent text-accent-fg" />`},
    {code: `<div className="bg-muted text-accent-fg" />`},
    // T2-forbidden token (text-accent-on-dark) is caught by a different rule;
    // this rule must not double-fire on it
    {code: `<div className="bg-muted text-accent-on-dark" />`},
    // Ternary separating the pair across branches — neither runtime render
    // produces the failing pair, so the rule must NOT fire
    {
      code: `<div className={cond ? 'bg-muted text-foreground' : 'bg-background text-accent'} />`,
    },
    // Conditional && that introduces text-accent only when condition is true
    // and bg-muted only when false — pair never co-occurs in one runtime branch
    {
      code: `<div className={['p-4', cond ? 'bg-muted' : 'text-accent'].filter(Boolean).join(' ')} />`,
    },
    // Non-className contexts
    {code: `// text-accent on bg-muted fails AA`},
  ],
  invalid: [
    // Plain literal
    {
      code: `<p className="bg-muted text-accent" />`,
      errors: [{messageId: 'pair'}],
    },
    // Reverse order — token order in className is irrelevant
    {
      code: `<p className="text-accent bg-muted" />`,
      errors: [{messageId: 'pair'}],
    },
    // Variant-prefixed text-accent — hover state still renders the failing pair
    {
      code: `<a className="bg-muted hover:text-accent" />`,
      errors: [{messageId: 'pair'}],
    },
    // Co-mingled with legitimate tokens
    {
      code: `<p className="rounded-ui border border-border bg-muted p-4 text-accent" />`,
      errors: [{messageId: 'pair'}],
    },
    // Array.join — both tokens in the same branch
    {
      code: `<p className={['bg-muted', 'text-accent'].join(' ')} />`,
      errors: [{messageId: 'pair'}],
    },
    // Array.join with filter(Boolean) — both tokens unconditionally present
    {
      code: `<p className={['bg-muted', 'text-accent', cond && 'font-bold'].filter(Boolean).join(' ')} />`,
      errors: [{messageId: 'pair'}],
    },
    // Ternary where one branch contains both tokens together
    {
      code: `<p className={cond ? 'bg-muted text-accent' : 'bg-background text-foreground'} />`,
      errors: [{messageId: 'pair'}],
    },
    // cn() with both literals
    {
      code: `<p className={cn('bg-muted', 'text-accent')} />`,
      errors: [{messageId: 'pair'}],
    },
  ],
})
