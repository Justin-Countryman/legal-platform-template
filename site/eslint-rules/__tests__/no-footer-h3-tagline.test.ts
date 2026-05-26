// no-footer-h3-tagline (C2) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-footer-h3-tagline.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-footer-h3-tagline', rule, {
  valid: [
    // Canonical: footer column h3 with role-token styling
    {
      code: `<footer><h3 className="text-base font-semibold text-foreground-muted mb-2">Title</h3></footer>`,
    },
    // h3 with tagline class but NOT inside <footer> ancestor — out of rule scope
    {
      code: `<section><h3 className="tagline">Section heading</h3></section>`,
    },
    {
      code: `<aside><h3 className="tagline">Sidebar heading</h3></aside>`,
    },
    // h3 with tagline inside attorney layout (real production pattern, tracked
    // separately in OUTSTANDING.md → "WS7 lower-priority Biography heading
    // semantics") — passes the C2 rule because no <footer> ancestor.
    {
      code: `<article><h3 className="tagline mb-4">Bar Admissions</h3></article>`,
    },
    // h2 / h4 with tagline inside footer — rule is h3-only
    {
      code: `<footer><h2 className="tagline">Heading</h2></footer>`,
    },
    {
      code: `<footer><h4 className="tagline">Heading</h4></footer>`,
    },
    // h3 inside footer WITHOUT tagline — passes
    {
      code: `<footer><h3 className="text-base font-semibold mb-2">Office Hours</h3></footer>`,
    },
    {
      code: `<footer><h3 className="font-bold">Office Hours</h3></footer>`,
    },
    // h3 inside footer with no className — passes (rule needs className to fire)
    {
      code: `<footer><h3>Office Hours</h3></footer>`,
    },
    // The sr-only footer-heading h2 (canonical landmark-naming pattern) —
    // passes, it's an h2, not h3
    {
      code: `<footer aria-labelledby="footer-heading"><h2 id="footer-heading" className="sr-only">Footer</h2><h3 className="text-base font-semibold mb-2">Office</h3></footer>`,
    },
  ],
  invalid: [
    // Direct child h3 with tagline
    {
      code: `<footer><h3 className="tagline">Title</h3></footer>`,
      errors: [{messageId: 'footerH3Tagline'}],
    },
    // Nested deeper inside footer
    {
      code: `<footer><div><div><h3 className="tagline">Title</h3></div></div></footer>`,
      errors: [{messageId: 'footerH3Tagline'}],
    },
    // tagline + other classes
    {
      code: `<footer><h3 className="tagline mb-2 mt-4">Title</h3></footer>`,
      errors: [{messageId: 'footerH3Tagline'}],
    },
    // Conditional className — at least one branch contains tagline
    {
      code: `<footer><h3 className={cond ? "tagline" : "text-base"}>Title</h3></footer>`,
      errors: [{messageId: 'footerH3Tagline'}],
    },
    // Array.join with tagline
    {
      code: `<footer><h3 className={["tagline", "mb-2"].join(" ")}>Title</h3></footer>`,
      errors: [{messageId: 'footerH3Tagline'}],
    },
    // Realistic dark-footer column shape with tagline (the anti-pattern
    // WS7 Commit 2 + WS7.7 Commit 2b cleaned up)
    {
      code: `<footer data-ring-context="dark" aria-labelledby="footer-heading" className="bg-brand-dark"><h2 id="footer-heading" className="sr-only">Footer</h2><div><h3 className="tagline mb-3">Office Hours</h3></div></footer>`,
      errors: [{messageId: 'footerH3Tagline'}],
    },
  ],
})
