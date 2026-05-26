# Platform ESLint Rules

WS8 custom ESLint rules for the Legal Platform. Each rule enforces a posture that's already locked in `BI-PRINCIPLES.md`, `BI-FOUNDATIONS.md`, or a `BI/skills/skill-*` file. Rules don't introduce new patterns — they enforce existing ones.

The full WS8 rule roster + sources is in the WS8 Phase 1 audit at
`Clients/henningson-snoxell-ltd/audits/ws8-eslint-enforcement-audit.md`.

## Layout

```
eslint-rules/
├── index.js                       Plugin entry — exports { rules, meta }
├── lib/
│   ├── className-tokenizer.js     Extract Tailwind tokens from a JSX className
│   │                              attribute, grouped by code-path (branch).
│   │                              Handles literals, template strings, ternaries,
│   │                              `&&`/`||`/`??`, array.join (incl. .filter(Boolean)),
│   │                              and `cn`/`clsx`/`classNames` calls.
│   └── ast-utils.js               Shared AST traversal helpers — find a JSX
│                                  className attribute, dispatch on element name,
│                                  walk ancestors, find first substantive child.
├── rules/                         One file per rule. Empty until rules ship
│                                  in subsequent WS8 commits.
├── __tests__/
│   ├── className-tokenizer.test.ts
│   ├── ast-utils.test.ts
│   └── parse-jsx.ts               Test helper — parse a JSX snippet to AST and
│                                  surface the first JSXOpeningElement / JSXElement.
└── README.md                      You are here.
```

Test files run under the existing project vitest suite (`npx vitest run` from `site/`). Vitest's default `**/*.test.ts` glob picks them up without config changes; the `vitest.config.ts` `@`-alias still resolves for any test that imports runtime code by path.

## How to register the plugin (when rules ship)

Edit your site project's `eslint.config.mjs`:

```js
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import platformRules from "./eslint-rules/index.js";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { "platform": platformRules },
    rules: {
      "platform/<rule-name>": "error",
    },
  },
  // …ignores
];

export default eslintConfig;
```

Naming convention: kebab-case rule keys under the `platform/` namespace. Examples (planned per WS8 Phase 2):

- `platform/no-bare-heading-token` (A2)
- `platform/no-arbitrary-color` (T1)
- `platform/no-manual-cascade-override` (T2)
- `platform/no-img-tag` *(handled via `@next/next/no-img-element`; not custom)*
- `platform/footer-landmark-naming` (A3)
- `platform/no-unknown-internal-hero-bg-muted` (T4)
- `platform/no-grouped-array-input` (C5)
- `platform/no-tagline-className-mb` (C1)
- `platform/no-footer-h3-tagline` (C2)
- `platform/no-set-state-in-effect` *(handled via `react-hooks/set-state-in-effect`; not custom)*
- `platform/no-use-hero-scheme-in-server` (C4)
- `platform/h1-mobile-cap` (A8)
- `platform/svg-needs-aria-decision` (A6)
- `platform/collection-grid-list-semantics` (A4)
- `platform/no-retired-tokens` (T3)
- `platform/no-google-fonts` (T6)
- `platform/no-transition-all` (B1, audit Section C)
- `platform/no-raw-white-black` (B2, audit Section C)

## How to add a new rule

1. **Create** `eslint-rules/rules/<rule-name>.js` (CommonJS — ESLint convention).
   Boilerplate:

   ```js
   'use strict'

   const {tokenizeClassNameAttribute, everyBranchContainsAnyOf} = require('../lib/className-tokenizer')
   const {getClassNameAttribute, getJSXElementName} = require('../lib/ast-utils')

   /** @type {import('eslint').Rule.RuleModule} */
   module.exports = {
     meta: {
       type: 'problem',           // 'problem' | 'suggestion' | 'layout'
       docs: {
         description: '<one-line summary>',
         recommended: false,
         url: '<canonical BI source path>#section',
       },
       schema: [],                // No options yet
       messages: {
         missingToken:
           '<short message>. See <BI file path> → <section name>.',
       },
     },
     create(context) {
       return {
         JSXOpeningElement(node) {
           const tagName = getJSXElementName(node)
           if (tagName !== 'h1') return

           const classNameAttr = getClassNameAttribute(node)
           const tokens = tokenizeClassNameAttribute(classNameAttr)

           // Skip when we couldn't tokenize at all — false-positive avoidance.
           if (!tokens) return

           // Apply rule semantic
           if (!everyBranchContainsAnyOf(tokens, ['text-foreground', 'text-foreground-muted'])) {
             context.report({node, messageId: 'missingToken'})
           }
         },
       }
     },
   }
   ```

2. **Register** the rule in `eslint-rules/index.js`:

   ```js
   const myRule = require('./rules/<rule-name>')
   module.exports = {
     rules: {
       '<rule-name>': myRule,
       // …
     },
   }
   ```

3. **Test** in `eslint-rules/__tests__/<rule-name>.test.ts`. Use ESLint's
   `RuleTester` API (preferred, runs the full lint pipeline), or invoke the
   rule's `create` directly with a stubbed `context` for narrow unit tests.

   ```ts
   import {RuleTester} from 'eslint'
   import rule from '../rules/<rule-name>.js'
   import tsParser from '@typescript-eslint/parser'

   const tester = new RuleTester({
     languageOptions: {parser: tsParser, parserOptions: {ecmaFeatures: {jsx: true}}},
   })

   tester.run('<rule-name>', rule, {
     valid: [
       {code: `<h1 className="text-foreground">x</h1>`},
     ],
     invalid: [
       {
         code: `<h1 className="font-bold">x</h1>`,
         errors: [{messageId: 'missingToken'}],
       },
     ],
   })
   ```

4. **Enable** in `eslint.config.mjs` under the `platform/` plugin block at
   the appropriate severity (`'error'` for must-fix postures, `'warn'` for
   advisory).

## Rule-authoring contract

Every rule MUST:

1. **Cite a canonical source.** The `meta.docs.description` and the error
   message text must point to a specific `BI/*.md` file or
   `BI/skills/skill-*/SKILL.md` section. The format is
   `"<short message>. See <file path> → <section>."` so the dev hitting
   the lint error has the next-step link.
2. **Trace to a posture locked before WS8.** If the rule isn't already
   enforceable from existing BI / skill / OUTSTANDING content, it doesn't
   ship in WS8 — it goes to OUTSTANDING.md as a future-workstream candidate.
3. **Use the AST + className-tokenizer, not regex.** Whitespace tokenization
   is critical: `text-foreground-muted` must NOT satisfy a check for
   `text-foreground` via substring match. Use the tokenizer's
   `anyBranchContains`, `everyBranchContainsAnyOf`, `noBranchContains`
   helpers; they operate on whole tokens.
4. **Test with WS7.7 production className shapes as fixtures.** Real
   patterns in the codebase use array.join + filter chains, ternaries
   inside logical &&, and template literals with interpolations — the
   rule must handle each shape correctly. The `parseJSXOpening` /
   `parseJSXElement` helpers in `__tests__/parse-jsx.ts` build realistic
   AST from JSX strings.
5. **Default to report-only auto-fix.** Auto-fixes for token-discipline
   rules are usually unsafe (the right replacement depends on visual
   hierarchy). When auto-fix IS safe, use `meta.fixable: 'code'` and
   provide `fix(fixer)`. Otherwise omit it.
6. **Handle opaque expressions conservatively.** When the tokenizer
   returns `complete: false`, the rule should typically SKIP (don't flag)
   on that site — opaque branches mean we can't be sure, and false
   positives undermine the rule's signal.

## Tokenizer contract

`tokenizeClassNameAttribute(attrNode)` returns:

- `null` if the input isn't a JSXAttribute or has no value.
- `{ branches: string[][], complete: boolean }` otherwise.

The `branches` array is **never empty** — every successful tokenization
returns at least one branch. An empty branch (`[]`) is meaningful: it
represents a code path that contributes no className tokens (e.g., the
falsy side of `cond && 'foo'`).

The `complete` flag is `true` only when every sub-expression was fully
understood. `false` means at least one path contains an opaque value
(an unknown identifier, a non-string call result, a template
interpolation, etc.); the tokens we did extract are still accurate as
far as they go, but rule authors should consider whether to flag or
skip on incomplete sites.

## Convenience predicates

For the common rule semantics:

```js
// "must contain" semantic — every branch needs at least one acceptable token
everyBranchContainsAnyOf(result, ['text-foreground', 'text-foreground-muted'])

// "must not contain" semantic — no branch may contain a forbidden token
noBranchContains(result, 'text-foreground-on-dark')

// "presence anywhere" semantic — flag if any branch contains a token at all
anyBranchContains(result, 'transition-all')
```

## Local commands

```bash
# Run rule + tokenizer tests (under the project vitest)
cd path/to/your/site
npx vitest run

# Run lint with the platform plugin enabled (after rules are registered)
npm run lint
```

## Cross-references

- Phase 1 audit: `Clients/henningson-snoxell-ltd/audits/ws8-eslint-enforcement-audit.md`
- Locked postures: `BI/BI-PRINCIPLES.md`, `BI/BI-FOUNDATIONS.md`, `BI/skills/skill-color-system/SKILL.md`, `BI/skills/skill-typography/SKILL.md`, `BI/skills/skill-component-patterns/SKILL.md`, `BI/skills/skill-sanity-schema/SKILL.md`
- WS8 OUTSTANDING tracker: `BI/OUTSTANDING.md → "Heading-cascade discipline (WS8 ESLint candidate)"` and the WS8 Decision-2 deferral entry.
