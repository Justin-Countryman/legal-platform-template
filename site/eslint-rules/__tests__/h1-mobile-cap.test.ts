// h1-mobile-cap (A8) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/h1-mobile-cap.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

tester.run('platform/h1-mobile-cap', rule, {
  valid: [
    // Mobile floor at the cap
    {code: `<h1 className="text-3xl">x</h1>`},
    {code: `<h1 className="text-3xl md:text-4xl lg:text-5xl">x</h1>`},
    // Mobile floor below the cap
    {code: `<h1 className="text-2xl">x</h1>`},
    {code: `<h1 className="text-xl md:text-2xl">x</h1>`},
    {code: `<h1 className="text-base">x</h1>`},
    // Responsive prefix gates the large size
    {code: `<h1 className="md:text-4xl">x</h1>`},
    {code: `<h1 className="lg:text-5xl">x</h1>`},
    {code: `<h1 className="xl:text-6xl">x</h1>`},
    {code: `<h1 className="2xl:text-7xl">x</h1>`},
    // Multiple variants in chain — responsive prefix anywhere counts
    {code: `<h1 className="md:hover:text-4xl">x</h1>`},
    {code: `<h1 className="lg:focus:text-5xl">x</h1>`},
    // Utility classes that clamp internally — the rule only inspects
    // text-Nxl shape, so platform clamp utilities pass through
    {code: `<h1 className="marketing-h1 font-heading">x</h1>`},
    {code: `<h1 className="text-page-h1 font-bold">x</h1>`},
    // Mirrors the post-fix shape from WS8 Commit 11 — actual production
    // patterns after the 10-site sweep
    {code: `<h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">{name}</h1>`},
    {code: `<h1 className="mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">Page not found</h1>`},
    {code: `<h1 className="mt-6 font-bold leading-tight text-3xl md:text-4xl lg:text-5xl text-foreground">{title}</h1>`},
    // Other elements with text-Nxl pass — rule is h1-only
    {code: `<h2 className="text-4xl">x</h2>`},
    {code: `<h3 className="text-5xl">x</h3>`},
    {code: `<p className="text-6xl">x</p>`},
    // No className
    {code: `<h1>x</h1>`},
    // Opaque className
    {code: `<h1 className={getClasses()}>x</h1>`},
    // hover: prefix — interaction state, not rest. text-3xl mobile floor
    // is OK; hover:text-4xl is gated to user interaction, doesn't affect
    // mobile rest-state rendering.
    {code: `<h1 className="text-3xl hover:text-4xl">x</h1>`},
    // hover:text-4xl as the only sizing — gated by hover, not violating
    // the mobile REST cap. Other prefixes (focus:, active:, dark:) skip too.
    {code: `<h1 className="hover:text-4xl text-foreground">x</h1>`},
    {code: `<h1 className="dark:text-4xl">x</h1>`},
    {code: `<h1 className="focus:text-5xl">x</h1>`},
  ],
  invalid: [
    // Bare large size at mobile floor
    {
      code: `<h1 className="text-4xl">x</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
    {
      code: `<h1 className="text-5xl">x</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
    {
      code: `<h1 className="text-6xl">x</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
    // Mobile-first violation: text-4xl mobile + md:text-5xl
    {
      code: `<h1 className="text-4xl md:text-5xl">x</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
    // The pre-fix shapes from WS8 Commit 11's drift sweep
    {
      code: `<h1 className="mb-4 text-5xl font-bold md:text-6xl">Page not found</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
    {
      code: `<h1 className="mt-6 font-bold leading-tight text-4xl md:text-5xl text-foreground">{title}</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
    {
      code: `<h1 className="font-heading text-5xl font-bold leading-none text-foreground lg:text-6xl xl:text-7xl">{name}</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
    // Conditional — at least one branch flags
    {
      code: `<h1 className={cond ? "text-4xl" : "text-3xl"}>x</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
    // Array.join with conditional
    {
      code: `<h1 className={["font-bold", isHero && "text-4xl"].filter(Boolean).join(" ")}>x</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
    // text-7xl, text-8xl, text-9xl all flagged
    {
      code: `<h1 className="text-7xl">x</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
    {
      code: `<h1 className="text-9xl">x</h1>`,
      errors: [{messageId: 'mobileTooLarge'}],
    },
  ],
})
