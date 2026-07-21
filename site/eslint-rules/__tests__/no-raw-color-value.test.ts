// no-raw-color-value (T7) — RuleTester suite.
//
// RuleTester needs `describe` / `it` globals; vitest provides them.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-raw-color-value.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

// RuleTester defaults the filename to something outside the boundary list, so
// these run as ordinary component files unless a filename is given.
tester.run('platform/no-raw-color-value', rule, {
  valid: [
    // ─── The token path ─────────────────────────────────────────────────────
    {code: `const c = 'var(--color-action)'`},
    {code: `<div style={{color: 'var(--color-foreground)'}} />`},
    {code: `const s = 'color-mix(in srgb, var(--color-action) 50%, transparent)'`},

    // Functional notation wrapping a CSS variable is token COMPOSITION, which
    // is how the elevation/shadow system varies alpha. Flagging it would flag
    // the token path itself. This is the regression that made the rule's first
    // draft report 20 false positives in design-preview/elevation.
    {code: `const shadow = 'rgb(var(--shadow-rgb) / 0.06)'`},
    {code: `const s = '0 1px 2px rgb(var(--shadow-rgb) / 0.02)'`},

    // A template fragment cannot see a var() that lives in an interpolation,
    // so functional notation is not judged from quasis at all.
    {code: 'const SR = "var(--shadow-rgb)"; const s = `0 1px 3px rgb(${SR} / 0.02)`'},

    // ─── className belongs to no-arbitrary-color, not this rule ─────────────
    {code: `<div className="bg-[#2C5740]" />`},
    {code: `<div className={'text-[#fff]'} />`},

    // ─── Not colors ─────────────────────────────────────────────────────────
    {code: `const id = '#main-content'`},
    {code: `const href = '#'`},
    {code: `const anchor = 'See #4 below'`},

    // ─── Boundary files are scoped out structurally ─────────────────────────
    {code: `const black = '#000000'`, filename: 'src/lib/designTokens.ts'},
    {code: `const black = '#000000'`, filename: 'src/components/layout/HeroScrim.tsx'},
    {code: `const bg = '#1a1a1a'`, filename: 'src/app/api/og/route.tsx'},
    // Tests assert on values; a fixture hex is the subject, not a decision.
    {code: `const c = '#821428'`, filename: 'src/lib/__tests__/designTokens.test.ts'},
    {code: `const c = '#821428'`, filename: 'src/lib/foo.test.ts'},
  ],

  invalid: [
    // The case OUTSTANDING item 46 names: a block hardcoding a color renders
    // correctly on the client it was written for and silently opts out of
    // theming everywhere else.
    {
      code: `<div style={{background: '#2C5740'}} />`,
      errors: [{messageId: 'rawColor'}],
    },
    {
      code: `const BRAND = '#2C5740'`,
      errors: [{messageId: 'rawColor'}],
    },
    {
      code: `const c = 'rgb(44 87 64)'`,
      errors: [{messageId: 'rawColor'}],
    },
    {
      code: `const c = 'hsl(150 33% 26%)'`,
      errors: [{messageId: 'rawColor'}],
    },
    // Shorthand hex, and hex inside a longer CSS string.
    {
      code: `const c = '#fff'`,
      errors: [{messageId: 'rawColor'}],
    },
    {
      code: `const s = '0 1px 2px #00000022'`,
      errors: [{messageId: 'rawColor'}],
    },
    // A hex in a template fragment is unambiguous even without context.
    {
      code: 'const s = `border: 1px solid #2C5740; width: ${w}px`',
      errors: [{messageId: 'rawColor'}],
    },
    // A boundary file is matched by suffix, not by basename: a same-named file
    // elsewhere is still linted.
    {
      code: `const black = '#000000'`,
      filename: 'src/components/homepage/HeroScrim.tsx',
      errors: [{messageId: 'rawColor'}],
    },
  ],
})
