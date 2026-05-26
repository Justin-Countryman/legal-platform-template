// footer-landmark-naming (A3) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/footer-landmark-naming.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/footer-landmark-naming', rule, {
  valid: [
    // Canonical pattern — 7 production footer variants
    {
      code: `<footer aria-labelledby="footer-heading"><h2 id="footer-heading" className="sr-only">Footer</h2><div>x</div></footer>`,
    },
    // With other attributes on the <footer>
    {
      code: `<footer data-ring-context="dark" aria-labelledby="footer-heading" className="bg-brand-dark"><h2 id="footer-heading" className="sr-only">Footer</h2><div>x</div></footer>`,
    },
    // Different sr-only h2 text — rule allows any text content
    {
      code: `<footer aria-labelledby="footer-heading"><h2 id="footer-heading" className="sr-only">Site footer</h2></footer>`,
    },
    // Localized text — rule allows
    {
      code: `<footer aria-labelledby="footer-heading"><h2 id="footer-heading" className="sr-only">Pied de page</h2></footer>`,
    },
    // sr-only combined with other classes (variant order doesn't matter)
    {
      code: `<footer aria-labelledby="footer-heading"><h2 id="footer-heading" className="sr-only mb-2">Footer</h2></footer>`,
    },
    // Whitespace before the h2 — getFirstSubstantiveChild skips whitespace
    {
      code: `<footer aria-labelledby="footer-heading">\n  <h2 id="footer-heading" className="sr-only">Footer</h2>\n  <div>x</div>\n</footer>`,
    },
    // HTML-spec scoping: <footer> nested inside sectioning content
    // is NOT a page-level landmark — rule skips
    {
      code: `<article><h2>Article title</h2><p>body</p><footer>Author byline</footer></article>`,
    },
    {
      code: `<aside><footer>Sidebar footer</footer></aside>`,
    },
    {
      code: `<section><h2>Section</h2><footer>Section footer</footer></section>`,
    },
    {
      code: `<main><footer>Main footer</footer></main>`,
    },
    {
      code: `<nav><footer>Nav footer</footer></nav>`,
    },
    // Card-internal footer (TestimonialCard pattern) — wrapped in article
    {
      code: `<article className="testimonial"><blockquote>x</blockquote><footer className="byline">Author</footer></article>`,
    },
  ],
  invalid: [
    // Missing aria-labelledby entirely
    {
      code: `<footer><h2 id="footer-heading" className="sr-only">Footer</h2></footer>`,
      errors: [{messageId: 'missingAriaLabelledby'}],
    },
    // Wrong aria-labelledby value
    {
      code: `<footer aria-labelledby="wrong-id"><h2 id="footer-heading" className="sr-only">Footer</h2></footer>`,
      errors: [{messageId: 'wrongAriaLabelledby'}],
    },
    // No first child at all
    {
      code: `<footer aria-labelledby="footer-heading"></footer>`,
      errors: [{messageId: 'missingFirstChildH2'}],
    },
    // First child is text, not <h2>
    {
      code: `<footer aria-labelledby="footer-heading">just text</footer>`,
      errors: [{messageId: 'missingFirstChildH2'}],
    },
    // First child is a <div>, not <h2>
    {
      code: `<footer aria-labelledby="footer-heading"><div>x</div><h2 id="footer-heading" className="sr-only">Footer</h2></footer>`,
      errors: [{messageId: 'missingFirstChildH2'}],
    },
    // First child is <h3> — wrong heading level
    {
      code: `<footer aria-labelledby="footer-heading"><h3 id="footer-heading" className="sr-only">Footer</h3></footer>`,
      errors: [{messageId: 'missingFirstChildH2'}],
    },
    // h2 missing id
    {
      code: `<footer aria-labelledby="footer-heading"><h2 className="sr-only">Footer</h2></footer>`,
      errors: [{messageId: 'missingH2Id'}],
    },
    // h2 with wrong id
    {
      code: `<footer aria-labelledby="footer-heading"><h2 id="other-id" className="sr-only">Footer</h2></footer>`,
      errors: [{messageId: 'missingH2Id'}],
    },
    // h2 with correct id but missing sr-only
    {
      code: `<footer aria-labelledby="footer-heading"><h2 id="footer-heading">Footer</h2></footer>`,
      errors: [{messageId: 'missingH2SrOnly'}],
    },
    {
      code: `<footer aria-labelledby="footer-heading"><h2 id="footer-heading" className="text-base font-bold">Footer</h2></footer>`,
      errors: [{messageId: 'missingH2SrOnly'}],
    },
    // Mirrors the original pre-fix WS7 Commit 2 + WS8 Commit 2 shape
    // (no aria-labelledby, no h2 — bare footer)
    {
      code: `<footer data-ring-context="dark" className="mt-auto bg-brand-dark px-6 py-8"><div>content</div></footer>`,
      errors: [{messageId: 'missingAriaLabelledby'}],
    },
  ],
})
