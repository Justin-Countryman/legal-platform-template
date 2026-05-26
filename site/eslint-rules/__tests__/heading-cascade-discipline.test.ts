// heading-cascade-discipline (A2) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/heading-cascade-discipline.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/heading-cascade-discipline', rule, {
  valid: [
    // Each acceptable token, primary case
    {code: `<h1 className="text-foreground">x</h1>`},
    {code: `<h1 className="text-foreground-muted">x</h1>`},
    {code: `<h1 className="text-foreground-subtle">x</h1>`},
    {code: `<h1 className="text-accent">x</h1>`},
    {code: `<h1 className="text-action-text">x</h1>`},
    {code: `<h1 className="text-current">x</h1>`},
    {code: `<h1 className="text-inherit">x</h1>`},
    {code: `<h1 className="text-brand-dark">x</h1>`},
    {code: `<h2 className="tagline">x</h2>`},
    {code: `<h2 className="sr-only">Footer</h2>`},
    // Combined with other classes (mirrors WS8 Commit 16a post-fix shapes)
    {code: `<h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">x</h1>`},
    {code: `<h2 className="mb-4 mt-8 font-heading text-3xl font-bold text-foreground first:mt-0">x</h2>`},
    {code: `<h3 className="text-base font-semibold text-foreground-muted mb-2">Office</h3>`},
    {code: `<h2 id="footer-heading" className="sr-only">Footer</h2>`},
    {code: `<h3 className="tagline mb-3">Bar Admissions</h3>`},
    // Conditional with both branches having cascade-aware tokens
    {code: `<h1 className={isDark ? "text-foreground" : "text-foreground"}>x</h1>`},
    {code: `<h2 className={cond ? "text-foreground" : "text-foreground-muted"}>x</h2>`},
    // Logical-and with token in present-branch — still has empty branch
    // missing token; rule should flag... wait, NO — logical-and emits
    // [tokens, []] branches. The empty branch lacks the token.
    // Move to invalid below.

    // Opaque cases — skipped per false-negatives-over-false-positives
    {code: `<h2 className={headingClassName}>{title}</h2>`},
    {code: `<h2 className={cn(headingClass, "mb-2")}>x</h2>`}, // one arg opaque
    {code: `<h1 className={\`text-foreground \${suffix}\`}>x</h1>`}, // template w/ interpolation
    {code: `<h2 className={getClasses()}>x</h2>`},
    {code: `<h3 className={styles.heading}>x</h3>`},
    {code: `<h2 className={cn(...spread)}>x</h2>`},
    // Non-heading elements — out of scope
    {code: `<div>x</div>`},
    {code: `<p className="mb-4">x</p>`},
    {code: `<span>x</span>`},
    // False-positive guard: text-foreground-muted is whole-token, not a
    // substring match of "text-foreground"
    {code: `<h1 className="text-foreground-muted mb-2">x</h1>`},
    // CtaSectionBlock BackgroundCta variant (already had text-foreground from WS7.7 Commit 2b)
    {code: `<h2 className="mb-5 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">{heading}</h2>`},
    // Marketing-h1 utility paired with explicit color
    {code: `<h1 className="marketing-h1 font-bold text-foreground">{title}</h1>`},
    {code: `<h1 className="marketing-h1 font-heading text-brand-dark">{title}</h1>`},
  ],
  invalid: [
    // No className at all — noClassName messageId
    {
      code: `<h1>Title</h1>`,
      errors: [{messageId: 'noClassName'}],
    },
    {
      code: `<h2>{title}</h2>`,
      errors: [{messageId: 'noClassName'}],
    },
    {
      code: `<h6>x</h6>`,
      errors: [{messageId: 'noClassName'}],
    },
    // Empty className — missingCascadeToken (className present, just no token)
    {
      code: `<h1 className="">x</h1>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    // className without cascade-aware token — missingCascadeToken
    {
      code: `<h1 className="font-bold mb-4">Title</h1>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    {
      code: `<h2 className="text-base mb-2">Office</h2>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    {
      code: `<h3 className="text-lg font-bold leading-snug">{name}</h3>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    // Mirrors WS8 Commit 16a pre-fix shapes
    {
      code: `<h1 className="mb-4 text-3xl font-bold md:text-4xl">{heading}</h1>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    {
      code: `<h2 className="mb-4 mt-8 font-heading text-3xl font-bold first:mt-0">{children}</h2>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    // Conditional — at least one branch missing the token
    {
      code: `<h2 className={cond ? "text-foreground" : "font-bold"}>x</h2>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    {
      code: `<h1 className={cond ? "text-foreground" : ""}>x</h1>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    // Array.join with conditional — branch missing token still flags
    {
      code: `<h2 className={["mb-2", "font-bold"].join(" ")}>x</h2>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    // Substring false-positive guard: "text-foregroundx" is NOT a real
    // token; it should NOT satisfy the check (whole-token match)
    {
      code: `<h2 className="text-foregroundx font-bold">x</h2>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    // Other-color tokens that aren't cascade-aware
    {
      code: `<h2 className="text-action mb-2">x</h2>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    {
      code: `<h2 className="text-muted mb-2">x</h2>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
    // cn() with all-literal args — tokenizer resolves complete; flagged
    // when no acceptable token among the literals
    {
      code: `<h2 className={cn("font-bold", "mb-2")}>x</h2>`,
      errors: [{messageId: 'missingCascadeToken'}],
    },
  ],
})
