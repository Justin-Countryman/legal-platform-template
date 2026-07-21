// no-hardcoded-font-family (T8) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-hardcoded-font-family.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/no-hardcoded-font-family', rule, {
  valid: [
    // ─── The token path ─────────────────────────────────────────────────────
    {code: `<h2 className="font-heading" />`},
    {code: `<p className="font-body text-foreground" />`},
    {code: `<div style={{fontFamily: 'var(--dynamic-font-heading)'}} />`},
    {code: `const css = 'font-family: var(--dynamic-font-body), sans-serif'`},

    // Generic keywords select no family.
    {code: `<div style={{fontFamily: 'inherit'}} />`},
    {code: `<div style={{fontFamily: 'initial'}} />`},

    // Non-font arbitrary utilities are not this rule's business.
    {code: `<div className="w-[7.5rem] gap-[2px]" />`},
    // `font-bold` / `font-semibold` are weight utilities, not families.
    {code: `<div className="font-bold" />`},

    // Interpolated templates are building from data (the catalog case).
    {code: 'const f = (fam: string) => `font-family: ${fam}`'},

    // ─── Boundary files ─────────────────────────────────────────────────────
    {
      code: `<div style={{fontFamily: "'Lora', serif"}} />`,
      filename: 'src/app/(site)/design-studio/DesignStudioClient.tsx',
    },
    {
      code: `const s = {fontFamily: 'sans-serif'}`,
      filename: 'src/app/api/og/route.tsx',
    },
    {
      code: `<div style={{fontFamily: 'Lora, serif'}} />`,
      filename: 'src/components/foo.test.tsx',
    },
  ],

  invalid: [
    // The failure this exists for: a hardcoded family keeps rendering after an
    // operator changes fontPairingPreset, so the design setting appears to work
    // and does nothing.
    {
      code: `<div style={{fontFamily: 'Lora, serif'}} />`,
      errors: [{messageId: 'hardcodedFamily'}],
    },
    {
      code: `const styles = {fontFamily: 'Georgia, serif'}`,
      errors: [{messageId: 'hardcodedFamily'}],
    },
    {
      code: `const css = 'font-family: Lora, serif;'`,
      errors: [{messageId: 'hardcodedFamily'}],
    },
    {
      code: 'const css = `h1 { font-family: Georgia, serif; }`',
      errors: [{messageId: 'hardcodedFamily'}],
    },
    // Tailwind arbitrary font utility.
    {
      code: `<h2 className="font-['Lora']" />`,
      errors: [{messageId: 'arbitraryFontClass'}],
    },
    {
      code: `<h2 className="md:font-[Georgia]" />`,
      errors: [{messageId: 'arbitraryFontClass'}],
    },
  ],
})
